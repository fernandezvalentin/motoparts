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
            return Ok(new 
            {
                totalProductos = stats.totalProductos,
                valorInventario = stats.valorInventario,
                productosStockCritico = stats.productosStockCritico
            });
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

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            try
            {
                var result = await _productoService.UpdateProductoAsync(id, producto);
                if (!result)
                {
                    return NotFound(new { message = $"No se encontró un producto con ID {id}" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al actualizar el producto.", error = ex.Message });
            }

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            try
            {
                var createdProducto = await _productoService.CreateProductoAsync(producto);
                return CreatedAtAction(nameof(GetProducto), new { id = createdProducto.Id }, createdProducto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al crear el producto.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            var result = await _productoService.DeleteProductoAsync(id);
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}