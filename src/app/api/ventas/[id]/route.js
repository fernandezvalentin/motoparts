import { requireUser, json, error, dbError, parseId } from "@/lib/http";

// GET /api/ventas/:id
export async function GET(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data, error: err } = await supabase.rpc("venta_json", { p_venta_id: id });
  if (err) return dbError(err, "Error al obtener la venta.");
  if (!data) return error("Venta no encontrada.", 404);
  return json(data);
}

// DELETE /api/ventas/:id — elimina la venta y devuelve el stock
export async function DELETE(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data: eliminada, error: err } = await supabase.rpc("eliminar_venta", { p_venta_id: id });
  if (err) return dbError(err, "Error al eliminar la venta.");
  if (!eliminada) return error("Venta no encontrada.", 404);
  return json({ message: "Venta eliminada y stock restaurado." });
}
