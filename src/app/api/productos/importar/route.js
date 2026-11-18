import { requireUser, json, error, dbError, readJson } from "@/lib/http";

// Lotes chicos para no superar el statement_timeout de Supabase en importaciones grandes
const TAMANO_LOTE = 500;

// Las importaciones grandes (miles de filas) pueden tardar
export const maxDuration = 60;

// POST /api/productos/importar  — body: [{ sku, nombre, precioLista, precioPublico, stock, proveedor, marca, modelo }]
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const items = await readJson(request);
  if (!Array.isArray(items) || items.length === 0) {
    return error("No se recibieron datos para importar.", 400);
  }

  let actualizados = 0;
  let creados = 0;

  for (let i = 0; i < items.length; i += TAMANO_LOTE) {
    const lote = items.slice(i, i + TAMANO_LOTE);
    const { data, error: err } = await supabase.rpc("importar_productos", { p_items: lote });
    if (err) {
      const procesados = actualizados + creados;
      return dbError(
        err,
        `Error al importar los productos (se guardaron ${procesados} antes del error).`
      );
    }
    actualizados += data.actualizados;
    creados += data.creados;
  }

  return json({ message: "Importación completada", actualizados, creados });
}
