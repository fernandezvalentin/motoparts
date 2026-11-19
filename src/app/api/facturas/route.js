import { requireUser, json, error, dbError, readJson } from "@/lib/http";
import { FACTURA_COLUMNAS, facturaFromDb, facturaToDb } from "@/lib/facturas";

// GET /api/facturas
export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const { data, error: err } = await supabase
    .from("facturas")
    .select(FACTURA_COLUMNAS)
    .order("fecha_creacion", { ascending: false })
    .limit(1000);

  if (err) return dbError(err, "Error al obtener las facturas.");
  return json(data.map(facturaFromDb));
}

// POST /api/facturas — body: { numeroComprobante, proveedorEmisor, fechaEmision, fechaVencimiento, total, estado, rutaArchivo }
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const { fila, error: invalido } = facturaToDb(await readJson(request));
  if (invalido) return error(invalido, 400);

  const { data, error: err } = await supabase.from("facturas").insert(fila).select(FACTURA_COLUMNAS).single();
  if (err) return dbError(err, "Error al guardar la factura.");
  return json(facturaFromDb(data), 201);
}
