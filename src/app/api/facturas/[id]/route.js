import { requireUser, json, error, dbError, readJson, parseId } from "@/lib/http";
import { BUCKET_FACTURAS, ESTADOS_FACTURA, FACTURA_COLUMNAS, facturaFromDb } from "@/lib/facturas";

// PATCH /api/facturas/:id — body: { estado }
export async function PATCH(request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const body = await readJson(request);
  if (!ESTADOS_FACTURA.includes(body?.estado)) return error("Estado inválido.", 400);

  const { data, error: err } = await supabase
    .from("facturas")
    .update({ estado: body.estado })
    .eq("id", id)
    .select(FACTURA_COLUMNAS)
    .maybeSingle();

  if (err) return dbError(err, "Error al actualizar el estado.");
  if (!data) return error("Factura no encontrada.", 404);
  return json(facturaFromDb(data));
}

// DELETE /api/facturas/:id — borra la factura y su PDF
export async function DELETE(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data, error: err } = await supabase.from("facturas").delete().eq("id", id).select("ruta_archivo");
  if (err) return dbError(err, "Error al eliminar la factura.");
  if (!data?.length) return error("Factura no encontrada.", 404);

  const ruta = data[0].ruta_archivo;
  if (ruta) {
    const { error: errStorage } = await supabase.storage.from(BUCKET_FACTURAS).remove([ruta]);
    if (errStorage) console.error("No se pudo borrar el PDF de la factura", id, errStorage);
  }

  return new Response(null, { status: 204 });
}
