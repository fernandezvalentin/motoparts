using InventarioApi.Data;
using InventarioApi.Models;
using InventarioApi.Repositories;
using Microsoft.EntityFrameworkCore;

namespace InventarioApi.Services
{
    public class VentaService : IVentaService
    {
        private readonly IVentaRepository _ventaRepository;
        private readonly IProductoRepository _productoRepository;
        private readonly ApplicationDbContext _context;

        public VentaService(IVentaRepository ventaRepository, IProductoRepository productoRepository, ApplicationDbContext context)
        {
            _ventaRepository = ventaRepository;
            _productoRepository = productoRepository;
            _context = context;
        }

        public async Task<Venta> RegistrarVentaAsync(NuevaVentaDto dto)
        {
            if (dto.Detalles == null || !dto.Detalles.Any())
            {
                throw new ArgumentException("La venta debe tener al menos un producto.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var venta = new Venta
                {
                    FechaVenta = DateTime.UtcNow,
                    Total = 0,
                    MetodoPago = dto.MetodoPago ?? "Efectivo"
                };

                await _ventaRepository.AddAsync(venta);
                await _ventaRepository.SaveChangesAsync();

                decimal totalVenta = 0;

                foreach (var item in dto.Detalles)
                {
                    var producto = await _productoRepository.GetByIdAsync(item.ProductoId);
                    
                    if (producto == null)
                    {
                        throw new KeyNotFoundException($"El producto con ID {item.ProductoId} no existe.");
                    }

                    if (producto.StockActual < item.Cantidad)
                    {
                        throw new InvalidOperationException($"Stock insuficiente para el producto: {producto.Nombre}. Stock actual: {producto.StockActual}, solicitado: {item.Cantidad}.");
                    }

                    producto.StockActual -= item.Cantidad;
                    _productoRepository.Update(producto);

                    var detalle = new VentaDetalle
                    {
                        VentaId = venta.Id,
                        ProductoId = producto.Id,
                        Cantidad = item.Cantidad,
                        PrecioUnitario = producto.Precio
                    };

                    totalVenta += detalle.Cantidad * detalle.PrecioUnitario;
                    await _ventaRepository.AddDetalleAsync(detalle);
                }
                decimal descuentoAplicado = dto.DescuentoPorcentaje >= 0 && dto.DescuentoPorcentaje <= 100 
                    ? dto.DescuentoPorcentaje 
                    : 0;

                venta.Total = Math.Round(totalVenta * (1 - (descuentoAplicado / 100)), 2);
                venta.DescuentoPorcentaje = descuentoAplicado;
                
                _ventaRepository.Update(venta);

                await _ventaRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return await _ventaRepository.GetByIdWithDetallesAsync(venta.Id) ?? venta;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<Venta>> GetVentasAsync(string? filtro)
        {
            var query = _ventaRepository.GetQueryable();
            var hoyUtc = DateTime.UtcNow;

            switch (filtro?.ToLower())
            {
                case "hoy":
                    var hoyArs = hoyUtc.AddHours(-3).Date;
                    query = query.Where(v => v.FechaVenta.AddHours(-3) >= hoyArs);
                    break;
                case "semana":
                    var inicioSemana = hoyUtc.AddHours(-3).Date.AddDays(-7);
                    query = query.Where(v => v.FechaVenta.AddHours(-3) >= inicioSemana);
                    break;
                case "mes":
                    var hoyArsMes = hoyUtc.AddHours(-3);
                    var inicioMes = new DateTime(hoyArsMes.Year, hoyArsMes.Month, 1);
                    query = query.Where(v => v.FechaVenta.AddHours(-3) >= inicioMes);
                    break;
                case "año":
                    var hoyArsAnio = hoyUtc.AddHours(-3);
                    var inicioAnio = new DateTime(hoyArsAnio.Year, 1, 1);
                    query = query.Where(v => v.FechaVenta.AddHours(-3) >= inicioAnio);
                    break;
                default:
                    break;
            }

            return await query
                .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
                .OrderByDescending(v => v.FechaVenta)
                .ToListAsync();
        }

        public async Task<Venta?> GetVentaByIdAsync(int id)
        {
            return await _ventaRepository.GetByIdWithDetallesAsync(id);
        }

        public async Task<bool> EliminarVentaAsync(int id)
        {
            var venta = await _ventaRepository.GetQueryable()
                .Include(v => v.Detalles)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (venta == null)
            {
                return false;
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var detalle in venta.Detalles)
                {
                    var producto = await _productoRepository.GetByIdAsync(detalle.ProductoId);
                    if (producto != null)
                    {
                        producto.StockActual += detalle.Cantidad;
                        _productoRepository.Update(producto);
                    }
                }

                _context.VentaDetalles.RemoveRange(venta.Detalles);
                _context.Ventas.Remove(venta);
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task LimpiarHistorialAsync()
        {
            var detalles = await _context.VentaDetalles.ToListAsync();
            _context.VentaDetalles.RemoveRange(detalles);
            
            var ventas = await _context.Ventas.ToListAsync();
            _context.Ventas.RemoveRange(ventas);

            await _context.SaveChangesAsync();
        }

        public async Task<(int totalVentas, decimal ingresosTotales, decimal ticketPromedio)> GetEstadisticasVentasAsync(
            DateTime? fechaInicio, DateTime? fechaFin)
        {
            var query = _ventaRepository.GetQueryable();

            if (fechaInicio.HasValue)
            {
                query = query.Where(v => v.FechaVenta >= fechaInicio.Value.ToUniversalTime());
            }

            if (fechaFin.HasValue)
            {
                var finDia = fechaFin.Value.Date.AddDays(1).AddTicks(-1).ToUniversalTime();
                query = query.Where(v => v.FechaVenta <= finDia);
            }

            var totalVentas = await query.CountAsync();
            
            var ingresosTotales = totalVentas > 0 
                ? await query.SumAsync(v => v.Total)
                : 0;
                
            var ticketPromedio = totalVentas > 0 
                ? ingresosTotales / totalVentas 
                : 0;

            return (totalVentas, ingresosTotales, ticketPromedio);
        }
    }
}
