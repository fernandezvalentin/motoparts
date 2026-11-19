// Cotización del dólar desde dolarapi.com (servicio público y gratuito, sin API key).
// Se usa el precio de venta, que es el que paga el negocio al comprar dólares.

export const CASAS_DOLAR = {
  oficial: "Oficial",
  blue: "Blue",
  bolsa: "MEP",
};

// Valida la respuesta de dolarapi y la deja en el formato que usa la app.
export function parsearCotizacion(casa, data) {
  const venta = Number(data?.venta);
  if (!Number.isFinite(venta) || venta <= 0) return null;
  return {
    casa,
    nombre: CASAS_DOLAR[casa],
    venta,
    actualizado: typeof data?.fechaActualizacion === "string" ? data.fechaActualizacion : null,
  };
}
