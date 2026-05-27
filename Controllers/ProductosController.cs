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
    public class ProductosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProductosController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/productos?busqueda=X&categoria=X&soloStockBajo=true
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Producto>>> GetProductos(
            [FromQuery] string? busqueda = null,
            [FromQuery] string? categoria = null,
            [FromQuery] bool soloStockBajo = false)
        {
            var query = _context.Productos.AsQueryable();

            if (!string.IsNullOrWhiteSpace(busqueda))
            {
                var term = busqueda.ToLower();
                query = query.Where(p =>
                    p.Nombre.ToLower().Contains(term) ||
                    p.Sku.ToLower().Contains(term) ||
                    p.Proveedor.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(categoria) && categoria != "Todas")
            {
                query = query.Where(p => p.Categoria == categoria);
            }

            if (soloStockBajo)
            {
                query = query.Where(p => p.StockActual <= p.StockMinimo);
            }

            return await query.OrderBy(p => p.Nombre).ToListAsync();
        }

        // GET: api/productos/estadisticas
        [HttpGet("estadisticas")]
        public async Task<ActionResult> GetEstadisticas()
        {
            var productos = await _context.Productos.ToListAsync();

            var estadisticas = new
            {
                totalProductos = productos.Count,
                valorInventario = productos.Sum(p => p.Precio * p.StockActual),
                productosStockCritico = productos.Count(p => p.StockActual <= p.StockMinimo),
                totalCategorias = productos.Select(p => p.Categoria).Distinct().Count(),
                productosPorCategoria = productos
                    .GroupBy(p => p.Categoria)
                    .ToDictionary(g => g.Key, g => g.Count()),
                alertasStock = productos
                    .Where(p => p.StockActual <= p.StockMinimo)
                    .OrderBy(p => p.StockActual)
                    .Select(p => new
                    {
                        p.Id,
                        p.Nombre,
                        p.Sku,
                        p.Categoria,
                        p.StockActual,
                        p.StockMinimo
                    })
                    .ToList()
            };

            return Ok(estadisticas);
        }

        // GET: api/productos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> GetProducto(int id)
        {
            var producto = await _context.Productos.FindAsync(id);

            if (producto == null)
            {
                return NotFound();
            }

            return producto;
        }

        // POST: api/productos
        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            // Validar SKU único
            var skuExiste = await _context.Productos.AnyAsync(p => p.Sku.ToLower() == producto.Sku.ToLower());
            if (skuExiste)
            {
                return Conflict(new { message = $"Ya existe un producto con el SKU '{producto.Sku}'" });
            }

            producto.FechaCreacion = DateTime.UtcNow;
            producto.FechaActualizacion = DateTime.UtcNow;

            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProducto), new { id = producto.Id }, producto);
        }

        // PUT: api/productos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            if (id != producto.Id)
            {
                return BadRequest();
            }

            // Validar que el SKU no esté duplicado por otro producto
            var skuExiste = await _context.Productos.AnyAsync(p =>
                p.Sku.ToLower() == producto.Sku.ToLower() && p.Id != id);
            if (skuExiste)
            {
                return Conflict(new { message = $"Ya existe otro producto con el SKU '{producto.Sku}'" });
            }

            producto.FechaActualizacion = DateTime.UtcNow;
            _context.Entry(producto).State = EntityState.Modified;
            _context.Entry(producto).Property(x => x.FechaCreacion).IsModified = false;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductoExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/productos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null)
            {
                return NotFound();
            }

            _context.Productos.Remove(producto);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ProductoExists(int id)
        {
            return _context.Productos.Any(e => e.Id == id);
        }
    }
}