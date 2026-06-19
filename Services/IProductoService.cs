using InventarioApi.Models;

namespace InventarioApi.Services
{
    public interface IProductoService
    {
        Task<(List<Producto> items, int total, int page, int pageSize, int totalPages)> GetProductosPaginatedAsync(
            string? busqueda, string? proveedor, bool soloStockBajo, bool soloConStock, int page, int pageSize);
        Task<IEnumerable<string>> GetProveedoresAsync();
        Task<(int totalProductos, decimal valorInventario, int productosStockCritico)> GetEstadisticasAsync();
        Task<Producto?> GetProductoByIdAsync(int id);
        Task<Producto> CreateProductoAsync(Producto producto);
        Task<bool> UpdateProductoAsync(int id, Producto producto);
        Task<bool> DeleteProductoAsync(int id);
    }
}
