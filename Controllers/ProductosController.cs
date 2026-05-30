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
            [FromQuery] string? proveedor = null,
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

            if (!string.IsNullOrWhiteSpace(proveedor) && proveedor != "Todos")
            {
                query = query.Where(p => p.Proveedor == proveedor);
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
            var totalProductos = await _context.Productos.CountAsync();
            
            // Handle empty table to avoid SumAsync throwing error
            var valorInventario = totalProductos > 0 
                ? await _context.Productos.SumAsync(p => p.Precio * p.StockActual)
                : 0;
                
            var productosStockCritico = await _context.Productos.CountAsync(p => p.StockActual <= p.StockMinimo);
            
            // Agrupar por Proveedor para no saturar la memoria
            var proveedoresData = await _context.Productos
                .Where(p => !string.IsNullOrEmpty(p.Proveedor))
                .GroupBy(p => p.Proveedor)
                .Select(g => new { Proveedor = g.Key, Count = g.Count() })
                .ToListAsync();

            var productosPorProveedor = proveedoresData.ToDictionary(c => c.Proveedor, c => c.Count);
            var totalProveedores = proveedoresData.Count;

            var alertasStock = await _context.Productos
                .Where(p => p.StockActual <= p.StockMinimo)
                .OrderBy(p => p.StockActual)
                .Take(50)
                .Select(p => new
                {
                    p.Id,
                    p.Nombre,
                    p.Sku,
                    p.Proveedor,
                    p.StockActual,
                    p.StockMinimo
                })
                .ToListAsync();

            var estadisticas = new
            {
                totalProductos,
                valorInventario,
                productosStockCritico,
                totalProveedores,
                productosPorProveedor,
                alertasStock
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

        // POST: api/productos/importar-json
        [HttpPost("importar-json")]
        public async Task<IActionResult> ImportarJson([FromBody] IEnumerable<ImportarProductoDto> productosData)
        {
            try
            {
                if (productosData == null || !productosData.Any())
                {
                    return BadRequest(new { message = "No se recibieron datos para importar." });
                }

                int actualizados = 0;
                int creados = 0;

                // Traer todos los productos a la memoria (es mucho más rápido que hacer un IN masivo en la base de datos)
                var todosLosProductos = await _context.Productos.ToListAsync();

                // Construir diccionarios para búsqueda O(1) ignorando mayúsculas/minúsculas
                var dictSku = new Dictionary<string, Producto>(StringComparer.OrdinalIgnoreCase);
                var dictNombre = new Dictionary<string, Producto>(StringComparer.OrdinalIgnoreCase);

                foreach (var p in todosLosProductos)
                {
                    if (!string.IsNullOrWhiteSpace(p.Sku) && !dictSku.ContainsKey(p.Sku))
                    {
                        dictSku[p.Sku] = p;
                    }
                    
                    if (!string.IsNullOrWhiteSpace(p.Nombre) && !dictNombre.ContainsKey(p.Nombre))
                    {
                        dictNombre[p.Nombre] = p;
                    }
                }

                int contadorBatch = 0;

                foreach (var dto in productosData)
                {
                    if (string.IsNullOrWhiteSpace(dto.Nombre) || dto.PrecioLista <= 0)
                    {
                        continue; // Saltar si faltan datos esenciales
                    }

                    // Buscar por SKU primero (si tiene) o por Nombre exacto en memoria
                    Producto existente = null;
                    
                    if (!string.IsNullOrWhiteSpace(dto.Sku) && dictSku.TryGetValue(dto.Sku, out var pSku))
                    {
                        existente = pSku;
                    }
                    
                    if (existente == null && !string.IsNullOrWhiteSpace(dto.Nombre) && dictNombre.TryGetValue(dto.Nombre, out var pNombre))
                    {
                        existente = pNombre;
                    }

                    if (existente != null)
                    {
                        // Actualizar
                        if (!string.IsNullOrWhiteSpace(dto.Nombre)) existente.Nombre = dto.Nombre;
                        existente.PrecioLista = dto.PrecioLista > 0 ? dto.PrecioLista : existente.PrecioLista;
                        existente.Precio = dto.PrecioPublico > 0 ? dto.PrecioPublico : existente.Precio;
                        existente.StockActual = dto.Stock >= 0 ? dto.Stock : existente.StockActual;
                        if (!string.IsNullOrWhiteSpace(dto.Proveedor)) existente.Proveedor = dto.Proveedor;
                        if (!string.IsNullOrWhiteSpace(dto.Marca)) existente.Marca = dto.Marca;
                        if (!string.IsNullOrWhiteSpace(dto.Modelo)) existente.Modelo = dto.Modelo;
                        
                        existente.FechaActualizacion = DateTime.UtcNow;
                        
                        if (_context.Entry(existente).State == EntityState.Unchanged)
                        {
                            _context.Entry(existente).State = EntityState.Modified;
                        }
                        
                        actualizados++;
                    }
                    else
                    {
                        var nuevoProducto = new Producto
                        {
                            Sku = !string.IsNullOrWhiteSpace(dto.Sku) ? dto.Sku : GenerarSkuAlternativo(dto.Nombre),
                            Nombre = dto.Nombre,
                            PrecioLista = dto.PrecioLista,
                            Precio = dto.PrecioPublico > 0 ? dto.PrecioPublico : dto.PrecioLista,
                            StockActual = dto.Stock >= 0 ? dto.Stock : 0,
                            Proveedor = dto.Proveedor ?? "",
                            Marca = dto.Marca ?? "",
                            Modelo = dto.Modelo ?? "",
                            Categoria = "Otros", // Por defecto
                            FechaCreacion = DateTime.UtcNow,
                            FechaActualizacion = DateTime.UtcNow
                        };
                        
                        _context.Productos.Add(nuevoProducto);
                        
                        // Agregarlo a los diccionarios por si hay duplicados en el mismo Excel
                        if (!string.IsNullOrWhiteSpace(nuevoProducto.Sku)) dictSku[nuevoProducto.Sku] = nuevoProducto;
                        if (!string.IsNullOrWhiteSpace(nuevoProducto.Nombre)) dictNombre[nuevoProducto.Nombre] = nuevoProducto;
                        
                        creados++;
                    }
                    
                    contadorBatch++;
                    if (contadorBatch >= 500)
                    {
                        await _context.SaveChangesAsync();
                        contadorBatch = 0;
                    }
                }

                if (contadorBatch > 0)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = "Importación completada", actualizados, creados });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno al importar los productos", error = ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : "") });
            }
        }

        private string GenerarSkuAlternativo(string nombre)
        {
            // Generar un SKU básico si no viene en el Excel
            var cleanName = new string(nombre.Where(char.IsLetterOrDigit).ToArray()).ToUpper();
            var prefix = cleanName.Length >= 3 ? cleanName.Substring(0, 3) : cleanName.PadRight(3, 'X');
            var randomStr = new Random().Next(1000, 9999).ToString();
            return $"{prefix}-{randomStr}";
        }

        [HttpPut("aumento-masivo")]
        public async Task<ActionResult> AumentoMasivo([FromBody] AumentoMasivoDto dto)
        {
            if (dto.Porcentaje == 0)
            {
                return BadRequest(new { message = "El porcentaje de aumento no puede ser 0." });
            }

            var query = _context.Productos.AsQueryable();

            if (!string.IsNullOrWhiteSpace(dto.Proveedor))
            {
                query = query.Where(p => p.Proveedor.ToLower() == dto.Proveedor.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(dto.Marca))
            {
                query = query.Where(p => p.Marca.ToLower() == dto.Marca.ToLower());
            }

            var productos = await query.ToListAsync();

            if (productos.Count == 0)
            {
                return NotFound(new { message = "No se encontraron productos que coincidan con los filtros." });
            }

            decimal multiplicador = 1 + (dto.Porcentaje / 100m);

            foreach (var p in productos)
            {
                p.PrecioLista = Math.Round(p.PrecioLista * multiplicador, 2);
                p.Precio = Math.Round(p.Precio * multiplicador, 2);
                p.FechaActualizacion = DateTime.UtcNow;
                _context.Entry(p).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Se actualizaron los precios de {productos.Count} productos.", actualizados = productos.Count });
        }
    }

    public class ImportarProductoDto
    {
        public string Sku { get; set; }
        public string Nombre { get; set; }
        public decimal PrecioLista { get; set; }
        public decimal PrecioPublico { get; set; }
        public int Stock { get; set; }
        public string Proveedor { get; set; }
        public string Marca { get; set; }
        public string Modelo { get; set; }
    }

    public class AumentoMasivoDto
    {
        public decimal Porcentaje { get; set; }
        public string? Proveedor { get; set; }
        public string? Marca { get; set; }
    }
}