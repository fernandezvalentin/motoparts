import { requireUser, json, error, dbError, readJson } from "@/lib/http";

// PUT /api/productos/renombrar-proveedor — body: { viejo, nuevo }
export async function PUT(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const viejo = typeof body?.viejo === "string" ? body.viejo.trim() : "";
  const nuevo = typeof body?.nuevo === "string" ? body.nuevo.trim() : "";
  if (!viejo || !nuevo) return error("Ambos nombres de proveedor son obligatorios.", 400);

  const { data: count, error: err } = await supabase.rpc("renombrar_proveedor", { p_viejo: viejo, p_nuevo: nuevo });
  if (err) return dbError(err, "Error al renombrar el proveedor.");
  if (!count) return error(`No se encontraron repuestos con el proveedor '${viejo}'.`, 404);
  return json({ message: `Se renombraron ${count} repuestos a '${nuevo}' exitosamente.` });
}
