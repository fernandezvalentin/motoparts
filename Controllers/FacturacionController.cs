using InventarioApi.Models;
using InventarioApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FacturacionController : ControllerBase
    {
        private readonly IFacturaService _service;

        public FacturacionController(IFacturaService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var facturas = await _service.GetAllAsync();
            return Ok(facturas);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadPdf(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Archivo no provisto.");

            if (file.ContentType != "application/pdf")
                return BadRequest("El archivo debe ser un PDF.");

            try
            {
                var dto = await _service.ExtraerDatosDePdfAsync(file);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error procesando el PDF: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateFacturaDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}/estado")]
        public async Task<IActionResult> UpdateEstado(int id, [FromBody] UpdateFacturaEstadoDto dto)
        {
            try
            {
                var result = await _service.UpdateEstadoAsync(id, dto.Estado);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
