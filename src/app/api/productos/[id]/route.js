import { requireUser, json, error, dbError, readJson, parseId } from "@/lib/http";
import { PRODUCTO_COLUMNAS, productoFromDb, productoToDb } from "@/lib/productos";

// GET /api/productos/:id
export async function GET(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data, error: err } = await supabase.from("productos").select(PRODUCTO_COLUMNAS).eq("id", id).maybeSingle();
  if (err) return dbError(err, "Error al obtener el producto.");
  if (!data) return error("Producto no encontrado.", 404);
  return json(productoFromDb(data));
}

// PUT /api/productos/:id
export async function PUT(request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { fila, error: invalido } = productoToDb(await readJson(request));
  if (invalido) return error(invalido, 400);

  const { data, error: err } = await supabase
    .from("productos")
    .update(fila)
    .eq("id", id)
    .select(PRODUCTO_COLUMNAS)
    .maybeSingle();

  if (err) {
    if (err.code === "23505") return error(`Ya existe otro producto con el SKU '${fila.sku}'`, 409);
    return dbError(err, "Error al actualizar el producto.");
  }
  if (!data) return error("Producto no encontrado.", 404);
  return json(productoFromDb(data));
}

// DELETE /api/productos/:id
export async function DELETE(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data, error: err } = await supabase.from("productos").delete().eq("id", id).select("id");
  if (err) return dbError(err, "Error al eliminar el producto.");
  if (!data?.length) return error("Producto no encontrado.", 404);
  return new Response(null, { status: 204 });
}
