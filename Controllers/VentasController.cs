using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventarioApi.Data;
using InventarioApi.Models;
using Microsoft.AspNetCore.Authorization;

namespace InventarioApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VentasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public VentasController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST: api/ventas
        [HttpPost]
        public async Task<ActionResult<Venta>> RegistrarVenta(NuevaVentaDto dto)
        {
            if (dto.Detalles == null || !dto.Detalles.Any())
            {
                return BadRequest(new { message = "La venta debe tener al menos un producto." });
            }

            // Iniciar una transacción para asegurar que la venta y el stock se actualicen juntos
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var venta = new Venta
                {
                    FechaVenta = DateTime.UtcNow,
                    Total = 0,
                    MetodoPago = dto.MetodoPago ?? "Efectivo"
                };

                _context.Ventas.Add(venta);
                await _context.SaveChangesAsync(); // Para obtener el ID de la venta

                decimal totalVenta = 0;

                foreach (var item in dto.Detalles)
                {
                    var producto = await _context.Productos.FindAsync(item.ProductoId);
                    
                    if (producto == null)
                    {
                        return BadRequest(new { message = $"El producto con ID {item.ProductoId} no existe." });
                    }

                    if (producto.StockActual < item.Cantidad)
                    {
                        return BadRequest(new { message = $"Stock insuficiente para el producto: {producto.Nombre}. Stock actual: {producto.StockActual}, solicitado: {item.Cantidad}." });
                    }

                    // Descontar stock
                    producto.StockActual -= item.Cantidad;
                    _context.Entry(producto).State = EntityState.Modified;

                    // Crear detalle
                    var detalle = new VentaDetalle
                    {
                        VentaId = venta.Id,
                        ProductoId = producto.Id,
                        Cantidad = item.Cantidad,
                        PrecioUnitario = producto.Precio
                    };

                    totalVenta += detalle.Cantidad * detalle.PrecioUnitario;
                    _context.VentaDetalles.Add(detalle);
                }

                venta.Total = totalVenta;
                _context.Entry(venta).State = EntityState.Modified;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Recargar los detalles para incluirlos en la respuesta
                var ventaCompletada = await _context.Ventas
                    .Include(v => v.Detalles)
                    .ThenInclude(d => d.Producto)
                    .FirstOrDefaultAsync(v => v.Id == venta.Id);

                return Ok(ventaCompletada);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Error interno al procesar la venta.", error = ex.Message });
            }
        }

        // GET: api/ventas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Venta>>> GetVentas([FromQuery] string? filtro = "todas")
        {
            var query = _context.Ventas.AsQueryable();
            var hoyUtc = DateTime.UtcNow;

            switch (filtro?.ToLower())
            {
                case "hoy":
                    // Como el sistema guarda en UTC, para 'hoy' comparamos desde el inicio del día UTC
                    // idealmente esto se adaptaría al timezone, pero usaremos el mismo día UTC.
                    // o podemos restar 3 horas para ARS (UTC-3).
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

            var ventas = await query
                .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
                .OrderByDescending(v => v.FechaVenta)
                .ToListAsync();

            return Ok(ventas);
        }

        // DELETE: api/ventas/limpiar
        [HttpDelete("limpiar")]
        public async Task<IActionResult> LimpiarHistorial()
        {
            // Borrar todos los detalles
            var detalles = await _context.VentaDetalles.ToListAsync();
            _context.VentaDetalles.RemoveRange(detalles);
            
            // Borrar todas las ventas
            var ventas = await _context.Ventas.ToListAsync();
            _context.Ventas.RemoveRange(ventas);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Historial de ventas eliminado." });
        }

        // DELETE: api/ventas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarVenta(int id)
        {
            var venta = await _context.Ventas
                .Include(v => v.Detalles)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (venta == null)
            {
                return NotFound(new { message = "Venta no encontrada." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Restaurar stock
                foreach (var detalle in venta.Detalles)
                {
                    var producto = await _context.Productos.FindAsync(detalle.ProductoId);
                    if (producto != null)
                    {
                        producto.StockActual += detalle.Cantidad;
                        _context.Entry(producto).State = EntityState.Modified;
                    }
                }

                _context.VentaDetalles.RemoveRange(venta.Detalles);
                _context.Ventas.Remove(venta);
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Venta eliminada y stock restaurado." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Error al eliminar la venta.", error = ex.Message });
            }
        }
    }

    public class NuevaVentaDto
    {
        public List<NuevaVentaDetalleDto> Detalles { get; set; } = new();
        public string MetodoPago { get; set; } = "Efectivo";
    }

    public class NuevaVentaDetalleDto
    {
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
    }
}
