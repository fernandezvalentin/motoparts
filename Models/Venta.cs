namespace InventarioApi.Models
{
    public class Venta
    {
        public int Id { get; set; }
        public DateTime FechaVenta { get; set; } = DateTime.UtcNow;
        public decimal Total { get; set; }
        public decimal DescuentoPorcentaje { get; set; } = 0;
        public string MetodoPago { get; set; } = "Efectivo";
        
        // Navigation property
        public List<VentaDetalle> Detalles { get; set; } = new();
    }
}
