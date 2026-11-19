using InventarioApi.Models;
using InventarioApi.Repositories;
using Microsoft.AspNetCore.Http;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace InventarioApi.Services
{
    public class FacturaService : IFacturaService
    {
        private readonly IFacturaRepository _repository;
        private readonly IWebHostEnvironment _env;

        public FacturaService(IFacturaRepository repository, IWebHostEnvironment env)
        {
            _repository = repository;
            _env = env;
        }

        public async Task<IEnumerable<FacturaDto>> GetAllAsync()
        {
            var facturas = await _repository.GetAllAsync();
            return facturas.Select(f => MapToDto(f));
        }

        public async Task<FacturaDto> CreateAsync(CreateFacturaDto dto)
        {
            var factura = new Factura
            {
                NumeroComprobante = dto.NumeroComprobante,
                ProveedorEmisor = dto.ProveedorEmisor,
                FechaEmision = dto.FechaEmision,
                FechaVencimiento = dto.FechaVencimiento,
                Total = dto.Total,
                Estado = dto.Estado,
                FechaCreacion = DateTime.UtcNow
            };

            var creada = await _repository.CreateAsync(factura);
            return MapToDto(creada);
        }

        public async Task<FacturaDto?> UpdateEstadoAsync(int id, string nuevoEstado)
        {
            var factura = await _repository.GetByIdAsync(id);
            if (factura == null) return null;

            factura.Estado = nuevoEstado;
            var actualizada = await _repository.UpdateAsync(factura);
            return MapToDto(actualizada);
        }

        public async Task DeleteAsync(int id)
        {
            await _repository.DeleteAsync(id);
        }

        public async Task<FacturaDto> ExtraerDatosDePdfAsync(IFormFile archivoPdf)
        {
            // 1. Guardar archivo fisicamente
            var uploadsPath = Path.Combine(_env.ContentRootPath, "uploads", "facturas");
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            var fileName = $"{Guid.NewGuid()}_{archivoPdf.FileName}";
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await archivoPdf.CopyToAsync(stream);
            }

            // 2. Extraer texto con PdfPig
            string fullText = string.Empty;
            using (PdfDocument document = PdfDocument.Open(filePath))
            {
                foreach (var page in document.GetPages())
                {
                    fullText += page.Text + " ";
                }
            }

            // 3. Inferir datos basicos
            var dto = new FacturaDto
            {
                RutaArchivo = fileName,
                Estado = "Pendiente"
            };

            // Intentar inferir el total usando Regex (ej: Total: $ 1.500,00)
            var totalMatch = Regex.Match(fullText, @"(?i)(?:total|importe)[\s:$]*([\d\.,]+)");
            if (totalMatch.Success && decimal.TryParse(totalMatch.Groups[1].Value.Replace(".", "").Replace(",", "."), out decimal total))
            {
                // Simple heuristica (el parseo dependerá de la cultura, asumiendo . decimal o , decimal)
                dto.Total = total;
            }

            // Intentar buscar fecha (dd/mm/yyyy)
            var dateMatch = Regex.Match(fullText, @"(?i)(?:fecha|emision)[\s:]*(\d{2}/\d{2}/\d{4})");
            if (dateMatch.Success && DateTime.TryParse(dateMatch.Groups[1].Value, out DateTime fecha))
            {
                dto.FechaEmision = fecha;
            }

            // Retornamos el DTO para que el Front-end muestre el preview al usuario
            return dto;
        }

        private FacturaDto MapToDto(Factura f)
        {
            return new FacturaDto
            {
                Id = f.Id,
                NumeroComprobante = f.NumeroComprobante,
                ProveedorEmisor = f.ProveedorEmisor,
                FechaEmision = f.FechaEmision,
                FechaVencimiento = f.FechaVencimiento,
                Total = f.Total,
                Estado = f.Estado,
                RutaArchivo = f.RutaArchivo,
                FechaCreacion = f.FechaCreacion
            };
        }
    }
}
