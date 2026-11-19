namespace InventarioApi.Models
{
    public class Factura
    {
        public int Id { get; set; }
        public string? NumeroComprobante { get; set; }
        public string? ProveedorEmisor { get; set; }
        public DateTime? FechaEmision { get; set; }
        public DateTime? FechaVencimiento { get; set; }
        public decimal Total { get; set; }
        public string Estado { get; set; } = "Pendiente"; // Pendiente, Pagado, Vencido
        public string? RutaArchivo { get; set; }
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }
}
