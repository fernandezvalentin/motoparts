using InventarioApi.Data;
using InventarioApi.Models;
using InventarioApi.Repositories;
using Microsoft.EntityFrameworkCore;

namespace InventarioApi.Services
{
    public class ProductoService : IProductoService
    {
        private readonly IProductoRepository _productoRepository;
        private readonly ApplicationDbContext _context;

        public ProductoService(IProductoRepository productoRepository, ApplicationDbContext context)
        {
            _productoRepository = productoRepository;
            _context = context;
        }

        public async Task<(List<Producto> items, int total, int page, int pageSize, int totalPages)> GetProductosPaginatedAsync(
            string? busqueda, string? proveedor, bool soloStockBajo, bool soloConStock, int page, int pageSize)
        {
            var query = _productoRepository.GetQueryable();

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
                query = query.Where(p => p.StockMinimo > 0 && p.StockActual <= p.StockMinimo);
            }
            
            if (soloConStock)
            {
                query = query.Where(p => p.StockActual > 0);
            }

            var total = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            var items = await query
                .OrderBy(p => p.Nombre)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total, page, pageSize, totalPages);
        }

        public async Task<IEnumerable<string>> GetProveedoresAsync()
        {
            return await _productoRepository.GetQueryable()
                .Where(p => !string.IsNullOrWhiteSpace(p.Proveedor))
                .Select(p => p.Proveedor)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();
        }

        public async Task<object> GetEstadisticasAsync()
        {
            var totalProductos = await _context.Productos.CountAsync();
            
            var valorInventario = totalProductos > 0 
                ? await _context.Productos.SumAsync(p => p.Precio * p.StockActual)
                : 0;
        
            var productosStockCritico = await _context.Productos.CountAsync(p => p.StockMinimo > 0 && p.StockActual <= p.StockMinimo);
            
            var proveedoresData = await _context.Productos
                .Where(p => !string.IsNullOrEmpty(p.Proveedor))
                .GroupBy(p => p.Proveedor)
                .Select(g => new { Proveedor = g.Key, Count = g.Count() })
                .ToListAsync();

            var productosPorProveedor = proveedoresData.ToDictionary(c => c.Proveedor, c => c.Count);
            var totalProveedores = proveedoresData.Count;

            var alertasStock = await _context.Productos
                .Where(p => p.StockMinimo > 0 && p.StockActual <= p.StockMinimo)
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

            var topVendidos = await _context.VentaDetalles
                .GroupBy(vd => vd.ProductoId)
                .Select(g => new
                {
                    ProductoId = g.Key,
                    CantidadVendida = g.Sum(vd => vd.Cantidad)
                })
                .OrderByDescending(x => x.CantidadVendida)
                .Take(5)
                .Join(_context.Productos, 
                      vd => vd.ProductoId, 
                      p => p.Id, 
                      (vd, p) => new { 
                          p.Id, 
                          p.Nombre, 
                          p.Sku, 
                          p.Proveedor,
                          vd.CantidadVendida 
                      })
                .ToListAsync();

            return new
            {
                totalProductos,
                valorInventario,
                productosStockCritico,
                totalProveedores,
                productosPorProveedor,
                alertasStock,
                topVendidos
            };
        }

        public async Task<Producto?> GetProductoByIdAsync(int id)
        {
            return await _productoRepository.GetByIdAsync(id);
        }

        public async Task<Producto> CreateProductoAsync(Producto producto)
        {
            var skuExiste = await _productoRepository.GetQueryable()
                .AnyAsync(p => p.Sku.ToLower() == producto.Sku.ToLower());
            
            if (skuExiste)
                throw new ArgumentException($"Ya existe un producto con el SKU '{producto.Sku}'");

            producto.FechaCreacion = DateTime.UtcNow;
            producto.FechaActualizacion = DateTime.UtcNow;

            await _productoRepository.AddAsync(producto);
            await _productoRepository.SaveChangesAsync();

            return producto;
        }

        public async Task<bool> UpdateProductoAsync(int id, Producto producto)
        {
            if (id != producto.Id)
                return false;

            var skuExiste = await _productoRepository.GetQueryable()
                .AnyAsync(p => p.Sku.ToLower() == producto.Sku.ToLower() && p.Id != id);
            
            if (skuExiste)
                throw new ArgumentException($"Ya existe otro producto con el SKU '{producto.Sku}'");

            producto.FechaActualizacion = DateTime.UtcNow;
            
            _context.Entry(producto).State = EntityState.Modified;
            _context.Entry(producto).Property(x => x.FechaCreacion).IsModified = false;

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _productoRepository.GetQueryable().AnyAsync(e => e.Id == id))
                {
                    return false;
                }
                throw;
            }
        }

        public async Task<bool> DeleteProductoAsync(int id)
        {
            var producto = await _productoRepository.GetByIdAsync(id);
            if (producto == null)
                return false;

            _productoRepository.Delete(producto);
            await _productoRepository.SaveChangesAsync();
            return true;
        }

        public async Task<(int actualizados, int creados)> ImportarProductosAsync(IEnumerable<ImportarProductoDto> productosData)
        {
            int actualizados = 0;
            int creados = 0;

            var todosLosProductos = await _context.Productos.ToListAsync();

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
                if (string.IsNullOrWhiteSpace(dto.Nombre)) continue;

                Producto? existente = null;

                var pSku = dto.Sku?.Trim();
                if (!string.IsNullOrWhiteSpace(pSku) && dictSku.TryGetValue(pSku, out var pBySku))
                {
                    existente = pBySku;
                }
                
                var pNombre = dto.Nombre.Trim();
                if (existente == null && dictNombre.TryGetValue(pNombre, out var pByName))
                {
                    existente = pByName;
                }

                if (existente != null)
                {
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
                        Categoria = "Otros",
                        FechaCreacion = DateTime.UtcNow,
                        FechaActualizacion = DateTime.UtcNow
                    };
                    
                    _context.Productos.Add(nuevoProducto);
                    
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

            return (actualizados, creados);
        }

        private string GenerarSkuAlternativo(string nombre)
        {
            var cleanName = new string(nombre.Where(char.IsLetterOrDigit).ToArray()).ToUpper();
            var prefix = cleanName.Length >= 3 ? cleanName.Substring(0, 3) : cleanName.PadRight(3, 'X');
            var randomStr = new Random().Next(1000, 9999).ToString();
            return $"{prefix}-{randomStr}";
        }

        public async Task<int> AumentoMasivoAsync(AumentoMasivoDto dto)
        {
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

            if (productos.Count == 0) return 0;

            decimal multiplicador = 1 + (dto.Porcentaje / 100m);

            foreach (var p in productos)
            {
                if (dto.TipoOperacion == "Ambos" || string.IsNullOrWhiteSpace(dto.TipoOperacion))
                {
                    p.PrecioLista = Math.Round(p.PrecioLista * multiplicador, 2);
                    p.Precio = Math.Round(p.Precio * multiplicador, 2);
                }
                else if (dto.TipoOperacion == "Costo")
                {
                    p.PrecioLista = Math.Round(p.PrecioLista * multiplicador, 2);
                }
                else if (dto.TipoOperacion == "Publico")
                {
                    p.Precio = Math.Round(p.Precio * multiplicador, 2);
                }
                else if (dto.TipoOperacion == "FijarMargen")
                {
                    p.Precio = Math.Round(p.PrecioLista * multiplicador, 2);
                }

                p.FechaActualizacion = DateTime.UtcNow;
                _context.Entry(p).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();

            return productos.Count;
        }

        public async Task<int> RenombrarProveedorAsync(RenombrarProveedorDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Viejo) || string.IsNullOrWhiteSpace(dto.Nuevo))
            {
                throw new ArgumentException("Ambos nombres de proveedor son obligatorios.");
            }

            var query = _context.Productos.Where(p => p.Proveedor.ToLower() == dto.Viejo.ToLower());
            var productos = await query.ToListAsync();

            if (productos.Count == 0) return 0;

            foreach (var p in productos)
            {
                p.Proveedor = dto.Nuevo;
                p.FechaActualizacion = DateTime.UtcNow;
                _context.Entry(p).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();

            return productos.Count;
        }
    }
}
