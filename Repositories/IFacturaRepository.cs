using InventarioApi.Models;

namespace InventarioApi.Repositories
{
    public interface IFacturaRepository
    {
        Task<IEnumerable<Factura>> GetAllAsync();
        Task<Factura?> GetByIdAsync(int id);
        Task<Factura> CreateAsync(Factura factura);
        Task<Factura> UpdateAsync(Factura factura);
        Task DeleteAsync(int id);
    }
}
