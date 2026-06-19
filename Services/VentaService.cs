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

                venta.Total = totalVenta;
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

        public async Task<(List<Venta> items, int total, int page, int pageSize, int totalPages)> GetVentasPaginatedAsync(
            DateTime? fechaInicio, DateTime? fechaFin, int page, int pageSize)
        {
            var query = _ventaRepository.GetQueryable()
                .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
                .AsQueryable();

            if (fechaInicio.HasValue)
            {
                query = query.Where(v => v.FechaVenta >= fechaInicio.Value.ToUniversalTime());
            }

            if (fechaFin.HasValue)
            {
                var finDia = fechaFin.Value.Date.AddDays(1).AddTicks(-1).ToUniversalTime();
                query = query.Where(v => v.FechaVenta <= finDia);
            }

            var total = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            var items = await query
                .OrderByDescending(v => v.FechaVenta)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total, page, pageSize, totalPages);
        }

        public async Task<Venta?> GetVentaByIdAsync(int id)
        {
            return await _ventaRepository.GetByIdWithDetallesAsync(id);
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
