import { requireUser, json, error, dbError, readJson } from "@/lib/http";
import { PRODUCTO_COLUMNAS, productoFromDb, productoToDb } from "@/lib/productos";

// GET /api/productos?busqueda=&proveedor=&soloStockBajo=&soloConStock=&page=&pageSize=
export async function GET(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const q = request.nextUrl.searchParams;
  const { data, error: err } = await supabase.rpc("buscar_productos", {
    p_busqueda: q.get("busqueda") || null,
    p_proveedor: q.get("proveedor") || null,
    p_solo_stock_bajo: q.get("soloStockBajo") === "true",
    p_solo_con_stock: q.get("soloConStock") === "true",
    p_page: Number.parseInt(q.get("page") ?? "1", 10) || 1,
    p_page_size: Number.parseInt(q.get("pageSize") ?? "50", 10) || 50,
  });

  if (err) return dbError(err, "Error al obtener los productos.");
  return json(data);
}

// POST /api/productos
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const { fila, error: invalido } = productoToDb(await readJson(request));
  if (invalido) return error(invalido, 400);

  const { data, error: err } = await supabase.from("productos").insert(fila).select(PRODUCTO_COLUMNAS).single();
  if (err) {
    if (err.code === "23505") return error(`Ya existe un producto con el SKU '${fila.sku}'`, 409);
    return dbError(err, "Error al guardar el producto.");
  }
  return json(productoFromDb(data), 201);
}
