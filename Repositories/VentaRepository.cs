using InventarioApi.Data;
using InventarioApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InventarioApi.Repositories
{
    public class VentaRepository : IVentaRepository
    {
        private readonly ApplicationDbContext _context;

        public VentaRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public IQueryable<Venta> GetQueryable()
        {
            return _context.Ventas.AsQueryable();
        }

        public async Task<Venta?> GetByIdWithDetallesAsync(int id)
        {
            return await _context.Ventas
                .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
                .FirstOrDefaultAsync(v => v.Id == id);
        }

        public async Task AddAsync(Venta venta)
        {
            await _context.Ventas.AddAsync(venta);
        }

        public async Task AddDetalleAsync(VentaDetalle detalle)
        {
            await _context.VentaDetalles.AddAsync(detalle);
        }

        public void Update(Venta venta)
        {
            _context.Entry(venta).State = EntityState.Modified;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
