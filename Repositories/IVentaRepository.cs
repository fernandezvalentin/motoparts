using InventarioApi.Models;

namespace InventarioApi.Repositories
{
    public interface IVentaRepository
    {
        IQueryable<Venta> GetQueryable();
        Task<Venta?> GetByIdWithDetallesAsync(int id);
        Task AddAsync(Venta venta);
        Task AddDetalleAsync(VentaDetalle detalle);
        void Update(Venta venta);
        Task SaveChangesAsync();
    }
}
