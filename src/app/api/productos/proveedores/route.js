import { requireUser, json, dbError } from "@/lib/http";

// GET /api/productos/proveedores
export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const { data, error: err } = await supabase.rpc("listar_proveedores");
  if (err) return dbError(err, "Error al obtener los proveedores.");
  return json(data ?? []);
}
