using InventarioApi.Models;
using InventarioApi.Repositories;
using Microsoft.EntityFrameworkCore;

namespace InventarioApi.Services
{
    public class ProductoService : IProductoService
    {
        private readonly IProductoRepository _productoRepository;

        public ProductoService(IProductoRepository productoRepository)
        {
            _productoRepository = productoRepository;
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
            return await _productoRepository.GetProveedoresDistintosAsync();
        }

        public async Task<(int totalProductos, decimal valorInventario, int productosStockCritico)> GetEstadisticasAsync()
        {
            var totalProductos = await _productoRepository.CountAsync();
            var valorInventario = await _productoRepository.SumValorInventarioAsync();
            var productosStockCritico = await _productoRepository.CountStockCriticoAsync();

            return (totalProductos, valorInventario, productosStockCritico);
        }

        public async Task<Producto?> GetProductoByIdAsync(int id)
        {
            return await _productoRepository.GetByIdAsync(id);
        }

        public async Task<Producto> CreateProductoAsync(Producto producto)
        {
            await _productoRepository.AddAsync(producto);
            await _productoRepository.SaveChangesAsync();
            return producto;
        }

        public async Task<bool> UpdateProductoAsync(int id, Producto producto)
        {
            if (id != producto.Id)
                return false;

            _productoRepository.Update(producto);
            
            try
            {
                await _productoRepository.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                var exists = await _productoRepository.GetByIdAsync(id) != null;
                if (!exists)
                    return false;
                else
                    throw;
            }
        }

        public async Task<bool> DeleteProductoAsync(int id)
        {
            var producto = await _productoRepository.GetByIdAsync(id);
            if (producto == null)
            {
                return false;
            }

            _productoRepository.Delete(producto);
            await _productoRepository.SaveChangesAsync();
            return true;
        }
    }
}
