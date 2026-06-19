using InventarioApi.Models;

namespace InventarioApi.Services
{
    public interface IVentaService
    {
        Task<Venta> RegistrarVentaAsync(NuevaVentaDto dto);
        Task<IEnumerable<Venta>> GetVentasAsync(string? filtro);
        Task<Venta?> GetVentaByIdAsync(int id);
        Task<bool> EliminarVentaAsync(int id);
        Task LimpiarHistorialAsync();
        Task<(int totalVentas, decimal ingresosTotales, decimal ticketPromedio)> GetEstadisticasVentasAsync(
            DateTime? fechaInicio, DateTime? fechaFin);
    }
}
