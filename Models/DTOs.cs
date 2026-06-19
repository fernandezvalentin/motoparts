namespace InventarioApi.Models
{
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateCredentialsDto
    {
        public string? NewUsername { get; set; }
        public string? NewPassword { get; set; }
    }

    public class NuevaVentaDto
    {
        public List<DetalleVentaDto> Detalles { get; set; } = new();
        public string MetodoPago { get; set; } = "Efectivo";
        public decimal DescuentoPorcentaje { get; set; } = 0;
    }

    public class DetalleVentaDto
    {
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
    }

    public class ImportarProductoDto
    {
        public string Sku { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public decimal PrecioLista { get; set; }
        public decimal PrecioPublico { get; set; }
        public int Stock { get; set; }
        public string Proveedor { get; set; } = string.Empty;
        public string Marca { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
    }

    public class RenombrarProveedorDto
    {
        public string Viejo { get; set; } = string.Empty;
        public string Nuevo { get; set; } = string.Empty;
    }

    public class AumentoMasivoDto
    {
        public decimal Porcentaje { get; set; }
        public string? Proveedor { get; set; }
        public string? Marca { get; set; }
        public string? TipoOperacion { get; set; } // "Ambos", "Costo", "Publico", "FijarMargen"
    }
}
