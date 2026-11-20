import { requireUser, json, error, dbError, parseId } from "@/lib/http";

// POST /api/stock/movimientos/:id/deshacer — revierte un ingreso o conteo
export async function POST(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data, error: err } = await supabase.rpc("deshacer_movimiento", { p_movimiento_id: id });
  if (err) return dbError(err, "Error al deshacer el movimiento.");
  return json(data);
}
