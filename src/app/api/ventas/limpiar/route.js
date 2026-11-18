import { requireUser, json, dbError } from "@/lib/http";

// DELETE /api/ventas/limpiar — borra todo el historial de ventas
export async function DELETE() {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const { error: err } = await supabase.rpc("limpiar_ventas");
  if (err) return dbError(err, "Error al limpiar el historial de ventas.");
  return json({ message: "Historial de ventas eliminado." });
}
