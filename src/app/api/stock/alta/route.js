import { requireUser, json, error, dbError, readJson } from "@/lib/http";
import { esCantidadValida } from "@/lib/stock";

// POST /api/stock/alta — body: { nombre, precio, cantidad, sku? }
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const sku = typeof body?.sku === "string" ? body.sku.trim() : "";
  const precio = Number(body?.precio);
  const cantidad = Number(body?.cantidad);

  if (!nombre) return error("El nombre es obligatorio.", 400);
  if (nombre.length > 200 || sku.length > 60) return error("Nombre o código demasiado largo.", 400);
  if (!Number.isFinite(precio) || precio < 0) return error("Precio inválido.", 400);
  if (!esCantidadValida(cantidad)) return error("Cantidad inválida.", 400);

  const { data, error: err } = await supabase.rpc("alta_rapida_producto", {
    p_nombre: nombre,
    p_precio: precio,
    p_cantidad: cantidad,
    p_sku: sku || null,
  });
  if (err) return dbError(err, "Error al crear el producto.");
  return json(data, 201);
}
