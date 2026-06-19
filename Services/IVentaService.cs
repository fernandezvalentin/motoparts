using InventarioApi.Models;

namespace InventarioApi.Services
{
    public interface IVentaService
    {
        Task<Venta> RegistrarVentaAsync(NuevaVentaDto dto);
        Task<(List<Venta> items, int total, int page, int pageSize, int totalPages)> GetVentasPaginatedAsync(
            DateTime? fechaInicio, DateTime? fechaFin, int page, int pageSize);
        Task<Venta?> GetVentaByIdAsync(int id);
        Task<(int totalVentas, decimal ingresosTotales, decimal ticketPromedio)> GetEstadisticasVentasAsync(
            DateTime? fechaInicio, DateTime? fechaFin);
    }
}
