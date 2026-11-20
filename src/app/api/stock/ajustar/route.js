import { requireUser, json, error, dbError, readJson } from "@/lib/http";
import { esCantidadValida } from "@/lib/stock";

// POST /api/stock/ajustar — body: { productoId, modo: "sumar" | "fijar", cantidad }
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const productoId = Number(body?.productoId);
  const cantidad = Number(body?.cantidad);
  const modo = body?.modo;

  if (!Number.isSafeInteger(productoId) || productoId <= 0) return error("Producto inválido.", 400);
  if (modo !== "sumar" && modo !== "fijar") return error("Modo inválido.", 400);
  if (!esCantidadValida(cantidad)) return error("Cantidad inválida.", 400);
  if (modo === "sumar" && cantidad === 0) return error("La cantidad a sumar debe ser mayor a cero.", 400);

  const { data, error: err } = await supabase.rpc("ajustar_stock", {
    p_producto_id: productoId,
    p_modo: modo,
    p_cantidad: cantidad,
  });
  if (err) return dbError(err, "Error al cargar el stock.");
  return json(data);
}
