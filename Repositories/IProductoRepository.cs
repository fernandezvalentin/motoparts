using InventarioApi.Models;

namespace InventarioApi.Repositories
{
    public interface IProductoRepository
    {
        IQueryable<Producto> GetQueryable();
        Task<Producto?> GetByIdAsync(int id);
        Task<int> CountAsync();
        Task<List<Producto>> GetAllAsync();
        Task<List<string>> GetProveedoresDistintosAsync();
        Task<decimal> SumValorInventarioAsync();
        Task<int> CountStockCriticoAsync();
        Task AddAsync(Producto producto);
        void Update(Producto producto);
        void Delete(Producto producto);
        Task SaveChangesAsync();
    }
}
