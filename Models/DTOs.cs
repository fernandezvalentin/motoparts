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
        public string? MetodoPago { get; set; }
        public List<DetalleVentaDto> Detalles { get; set; } = new();
    }

    public class DetalleVentaDto
    {
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
    }
}
