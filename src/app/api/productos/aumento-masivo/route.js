import { requireUser, json, error, dbError, readJson } from "@/lib/http";

const TIPOS = ["Ambos", "Costo", "Publico", "FijarMargen"];

// PUT /api/productos/aumento-masivo — body: { porcentaje, proveedor?, marca?, tipoOperacion? }
export async function PUT(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const porcentaje = Number(body?.porcentaje);
  const tipo = body?.tipoOperacion || "Ambos";

  if (!Number.isFinite(porcentaje)) return error("Porcentaje inválido.", 400);
  if (!TIPOS.includes(tipo)) return error("Tipo de operación inválido.", 400);

  const { data: count, error: err } = await supabase.rpc("aumento_masivo", {
    p_porcentaje: porcentaje,
    p_proveedor: body?.proveedor || null,
    p_marca: body?.marca || null,
    p_tipo: tipo,
  });

  if (err) return dbError(err, "Error al aplicar el aumento masivo.");
  if (!count) return error("No se encontraron productos que coincidan con los filtros.", 404);
  return json({ message: `Se actualizaron los precios de ${count} productos.`, actualizados: count });
}
