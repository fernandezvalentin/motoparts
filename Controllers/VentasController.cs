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
        public async Task<ActionResult> GetVentas(
            [FromQuery] DateTime? fechaInicio = null,
            [FromQuery] DateTime? fechaFin = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await _ventaService.GetVentasPaginatedAsync(fechaInicio, fechaFin, page, pageSize);

            return Ok(new 
            { 
                items = result.items, 
                total = result.total, 
                page = result.page, 
                pageSize = result.pageSize, 
                totalPages = result.totalPages 
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Venta>> GetVenta(int id)
        {
            var venta = await _ventaService.GetVentaByIdAsync(id);

            if (venta == null)
            {
                return NotFound(new { message = $"Venta con ID {id} no encontrada." });
            }

            return Ok(venta);
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
