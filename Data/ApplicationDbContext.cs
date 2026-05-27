using Microsoft.EntityFrameworkCore;
using InventarioApi.Models;

namespace InventarioApi.Data
{
    public class ApplicationDbContext : DbContext
    {
        // El constructor que recibe la configuración de la conexión
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Esta propiedad DbSet es la que representa la tabla física en SQL Server
        public DbSet<Producto> Productos { get; set; }
        public DbSet<Venta> Ventas { get; set; }
        public DbSet<VentaDetalle> VentaDetalles { get; set; }
    }
}