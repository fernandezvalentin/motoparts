using InventarioApi.Models;
using Microsoft.AspNetCore.Http;

namespace InventarioApi.Services
{
    public interface IFacturaService
    {
        Task<IEnumerable<FacturaDto>> GetAllAsync();
        Task<FacturaDto> CreateAsync(CreateFacturaDto dto);
        Task<FacturaDto?> UpdateEstadoAsync(int id, string nuevoEstado);
        Task DeleteAsync(int id);
        
        /// <summary>
        /// Sube el PDF, extrae texto basico e intenta inferir datos.
        /// </summary>
        Task<FacturaDto> ExtraerDatosDePdfAsync(IFormFile archivoPdf);
    }
}
