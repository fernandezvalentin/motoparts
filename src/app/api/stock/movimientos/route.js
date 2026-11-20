import { requireUser, json, dbError } from "@/lib/http";
import { calcularDesde } from "@/lib/fechas";
import { MOVIMIENTO_COLUMNAS, movimientoFromDb } from "@/lib/stock";

// GET /api/stock/movimientos?filtro=hoy|semana|todos
export async function GET(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  let query = supabase
    .from("stock_movimientos")
    .select(MOVIMIENTO_COLUMNAS)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);

  const desde = calcularDesde(request.nextUrl.searchParams.get("filtro")?.toLowerCase());
  if (desde) query = query.gte("fecha", desde.toISOString());

  const { data, error: err } = await query;
  if (err) return dbError(err, "Error al obtener los movimientos.");
  return json(data.map(movimientoFromDb));
}
