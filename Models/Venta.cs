namespace InventarioApi.Models
{
    public class Venta
    {
        public int Id { get; set; }
        public DateTime FechaVenta { get; set; } = DateTime.UtcNow;
        public decimal Total { get; set; }
        
        // Navigation property
        public List<VentaDetalle> Detalles { get; set; } = new();
    }
}
