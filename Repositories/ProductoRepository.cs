using InventarioApi.Data;
using InventarioApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InventarioApi.Repositories
{
    public class ProductoRepository : IProductoRepository
    {
        private readonly ApplicationDbContext _context;

        public ProductoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public IQueryable<Producto> GetQueryable()
        {
            return _context.Productos.AsQueryable();
        }

        public async Task<Producto?> GetByIdAsync(int id)
        {
            return await _context.Productos.FindAsync(id);
        }

        public async Task<int> CountAsync()
        {
            return await _context.Productos.CountAsync();
        }

        public async Task<List<Producto>> GetAllAsync()
        {
            return await _context.Productos.ToListAsync();
        }

        public async Task<List<string>> GetProveedoresDistintosAsync()
        {
            return await _context.Productos
                .Where(p => !string.IsNullOrWhiteSpace(p.Proveedor))
                .Select(p => p.Proveedor)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();
        }

        public async Task<decimal> SumValorInventarioAsync()
        {
            var total = await _context.Productos.CountAsync();
            if (total == 0) return 0;
            return await _context.Productos.SumAsync(p => p.Precio * p.StockActual);
        }

        public async Task<int> CountStockCriticoAsync()
        {
            return await _context.Productos.CountAsync(p => p.StockMinimo > 0 && p.StockActual <= p.StockMinimo);
        }

        public async Task AddAsync(Producto producto)
        {
            await _context.Productos.AddAsync(producto);
        }

        public void Update(Producto producto)
        {
            _context.Entry(producto).State = EntityState.Modified;
        }

        public void Delete(Producto producto)
        {
            _context.Productos.Remove(producto);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
