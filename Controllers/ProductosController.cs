using Microsoft.AspNetCore.Mvc;
using InventarioApi.Models;
using InventarioApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace InventarioApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProductosController : ControllerBase
    {
        private readonly IProductoService _productoService;

        public ProductosController(IProductoService productoService)
        {
            _productoService = productoService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProductos(
            [FromQuery] string? busqueda = null,
            [FromQuery] string? proveedor = null,
            [FromQuery] bool soloStockBajo = false,
            [FromQuery] bool soloConStock = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await _productoService.GetProductosPaginatedAsync(
                busqueda, proveedor, soloStockBajo, soloConStock, page, pageSize);

            return Ok(new 
            { 
                items = result.items, 
                total = result.total, 
                page = result.page, 
                pageSize = result.pageSize, 
                totalPages = result.totalPages 
            });
        }

        [HttpGet("proveedores")]
        public async Task<ActionResult<IEnumerable<string>>> GetProveedores()
        {
            var proveedores = await _productoService.GetProveedoresAsync();
            return Ok(proveedores);
        }

        [HttpGet("estadisticas")]
        public async Task<ActionResult> GetEstadisticas()
        {
            var stats = await _productoService.GetEstadisticasAsync();
            return Ok(stats);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> GetProducto(int id)
        {
            var producto = await _productoService.GetProductoByIdAsync(id);

            if (producto == null)
            {
                return NotFound();
            }

            return Ok(producto);
        }

        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            try
            {
                var createdProducto = await _productoService.CreateProductoAsync(producto);
                return CreatedAtAction(nameof(GetProducto), new { id = createdProducto.Id }, createdProducto);
            }
            catch (ArgumentException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            try
            {
                var success = await _productoService.UpdateProductoAsync(id, producto);
                if (!success)
                {
                    return NotFound();
                }
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            var success = await _productoService.DeleteProductoAsync(id);
            if (!success)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpPost("importar-json")]
        public async Task<IActionResult> ImportarJson([FromBody] IEnumerable<ImportarProductoDto> productosData)
        {
            try
            {
                if (productosData == null || !productosData.Any())
                {
                    return BadRequest(new { message = "No se recibieron datos para importar." });
                }

                var result = await _productoService.ImportarProductosAsync(productosData);

                return Ok(new { message = "Importación completada", actualizados = result.actualizados, creados = result.creados });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno al importar los productos", error = ex.Message });
            }
        }

        [HttpPut("aumento-masivo")]
        public async Task<ActionResult> AumentoMasivo([FromBody] AumentoMasivoDto dto)
        {
            var count = await _productoService.AumentoMasivoAsync(dto);

            if (count == 0)
            {
                return NotFound(new { message = "No se encontraron productos que coincidan con los filtros." });
            }

            return Ok(new { message = $"Se actualizaron los precios de {count} productos.", actualizados = count });
        }

        [HttpPut("renombrar-proveedor")]
        public async Task<ActionResult> RenombrarProveedor([FromBody] RenombrarProveedorDto dto)
        {
            try
            {
                var count = await _productoService.RenombrarProveedorAsync(dto);

                if (count == 0)
                {
                    return NotFound(new { message = $"No se encontraron repuestos con el proveedor '{dto.Viejo}'." });
                }

                return Ok(new { message = $"Se renombraron {count} repuestos a '{dto.Nuevo}' exitosamente." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}