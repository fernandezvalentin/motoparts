using Microsoft.AspNetCore.Mvc;
using InventarioApi.Models;
using InventarioApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace InventarioApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VentasController : ControllerBase
    {
        private readonly IVentaService _ventaService;

        public VentasController(IVentaService ventaService)
        {
            _ventaService = ventaService;
        }

        [HttpPost]
        public async Task<ActionResult<Venta>> RegistrarVenta(NuevaVentaDto dto)
        {
            try
            {
                var ventaCompletada = await _ventaService.RegistrarVentaAsync(dto);
                return Ok(ventaCompletada);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno al procesar la venta.", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Venta>>> GetVentas([FromQuery] string? filtro = "todas")
        {
            var ventas = await _ventaService.GetVentasAsync(filtro);
            return Ok(ventas);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Venta>> GetVenta(int id)
        {
            var venta = await _ventaService.GetVentaByIdAsync(id);

            if (venta == null)
            {
                return NotFound(new { message = "Venta no encontrada." });
            }

            return Ok(venta);
        }

        [HttpDelete("limpiar")]
        public async Task<IActionResult> LimpiarHistorial()
        {
            await _ventaService.LimpiarHistorialAsync();
            return Ok(new { message = "Historial de ventas eliminado." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarVenta(int id)
        {
            try
            {
                var result = await _ventaService.EliminarVentaAsync(id);
                if (!result)
                {
                    return NotFound(new { message = "Venta no encontrada." });
                }

                return Ok(new { message = "Venta eliminada y stock restaurado." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al eliminar la venta.", error = ex.Message });
            }
        }

        [HttpGet("estadisticas")]
        public async Task<ActionResult> GetEstadisticas(
            [FromQuery] DateTime? fechaInicio = null,
            [FromQuery] DateTime? fechaFin = null)
        {
            var stats = await _ventaService.GetEstadisticasVentasAsync(fechaInicio, fechaFin);
            
            return Ok(new 
            {
                totalVentas = stats.totalVentas,
                ingresosTotales = stats.ingresosTotales,
                ticketPromedio = stats.ticketPromedio
            });
        }
    }
}
