using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventarioApi.Data;
using InventarioApi.Models;

namespace InventarioApi.Controllers
{
    // Esta ruta define cómo accederemos a los recursos: Ej. http://localhost:5000/api/productos
    [Route("api/[controller]")]
    [ApiController]
    public class ProductosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        // Inyectamos el contexto de la base de datos
        public ProductosController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/productos
        // Método funcional para consultar todo el catálogo actual
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Producto>>> GetProductos()
        {
            return await _context.Productos.ToListAsync();
        }

        // POST: api/productos
        // Método funcional para dar de alta un nuevo repuesto o accesorio
        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();

            // Retornamos un estado 201 (Creado) junto con el producto generado
            return CreatedAtAction(nameof(GetProductos), new { id = producto.Id }, producto);
        }

        // GET: api/productos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> GetProducto(int id)
        {
            var producto = await _context.Productos.FindAsync(id);

            if (producto == null)
            {
                return NotFound(); // Retorna un código 404 si el artículo no existe
            }

            return producto;
        }

        // PUT: api/productos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            // Validamos que el ID de la URL coincida con el ID del producto enviado
            if (id != producto.Id)
            {
                return BadRequest(); 
            }

            // Le avisamos a Entity Framework que este objeto fue modificado
            _context.Entry(producto).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Control de concurrencia: si dos personas intentan editar al mismo tiempo
                if (!ProductoExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent(); // Código 204: Significa que salió bien pero no hay contenido extra que devolver
        }

        // Método auxiliar analítico para verificar si el producto existe
        private bool ProductoExists(int id)
        {
            return _context.Productos.Any(e => e.Id == id);
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
    } // <-- Esta es la llave que cierra la clase ProductosController
} // <-- Esta es la llave que cierra el namespace InventarioApi.Controllers