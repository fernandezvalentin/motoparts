import { requireUser, json, dbError } from "@/lib/http";

// GET /api/productos/estadisticas
export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const { data, error: err } = await supabase.rpc("estadisticas_inventario");
  if (err) return dbError(err, "Error al obtener las estadísticas.");
  return json(data);
}
