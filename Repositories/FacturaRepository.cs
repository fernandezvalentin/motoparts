using InventarioApi.Data;
using InventarioApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InventarioApi.Repositories
{
    public class FacturaRepository : IFacturaRepository
    {
        private readonly ApplicationDbContext _context;

        public FacturaRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Factura>> GetAllAsync()
        {
            return await _context.Facturas
                .OrderByDescending(f => f.FechaCreacion)
                .ToListAsync();
        }

        public async Task<Factura?> GetByIdAsync(int id)
        {
            return await _context.Facturas.FindAsync(id);
        }

        public async Task<Factura> CreateAsync(Factura factura)
        {
            _context.Facturas.Add(factura);
            await _context.SaveChangesAsync();
            return factura;
        }

        public async Task<Factura> UpdateAsync(Factura factura)
        {
            _context.Entry(factura).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return factura;
        }

        public async Task DeleteAsync(int id)
        {
            var factura = await _context.Facturas.FindAsync(id);
            if (factura != null)
            {
                _context.Facturas.Remove(factura);
                await _context.SaveChangesAsync();
            }
        }
    }
}
