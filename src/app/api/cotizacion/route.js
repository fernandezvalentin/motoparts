import { requireUser, json, error } from "@/lib/http";
import { CASAS_DOLAR, parsearCotizacion } from "@/lib/cotizacion";

// GET /api/cotizacion?casa=oficial|blue|bolsa
// Devuelve la cotización del dólar (precio de venta). Se guarda en caché 15 minutos.
export async function GET(request) {
  const { response } = await requireUser();
  if (response) return response;

  const casa = request.nextUrl.searchParams.get("casa") ?? "oficial";
  if (!(casa in CASAS_DOLAR)) return error("Tipo de dólar inválido.", 400);

  try {
    const res = await fetch(`https://dolarapi.com/v1/dolares/${casa}`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`dolarapi respondió ${res.status}`);

    const cotizacion = parsearCotizacion(casa, await res.json());
    if (!cotizacion) throw new Error("Respuesta de dolarapi sin precio de venta");
    return json(cotizacion);
  } catch (err) {
    console.error("No se pudo obtener la cotización del dólar", err);
    return error("No se pudo obtener la cotización del dólar. Cargala a mano.", 502);
  }
}
