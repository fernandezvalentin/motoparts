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

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }

        // Esta propiedad DbSet es la que representa la tabla física en SQL Server
        public DbSet<Producto> Productos { get; set; }
        public DbSet<Venta> Ventas { get; set; }
        public DbSet<VentaDetalle> VentaDetalles { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Default Admin user (password: "admin123")
            modelBuilder.Entity<Usuario>().HasData(new Usuario
            {
                Id = 1,
                Username = "admin",
                // Hardcoded hash for 'admin123' to prevent EF from generating updates on every migration
                PasswordHash = "$2a$11$yo4nwg6wxxAhwiEWGSuGPeBOxZrXUF831Baokb7GfVLCNyuH7PfFe",
                FechaCreacion = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        }
    }
}