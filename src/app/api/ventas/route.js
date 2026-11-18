import { requireUser, json, error, dbError, readJson } from "@/lib/http";

// Argentina usa UTC-3 todo el año (sin horario de verano)
const OFFSET_ARG_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

// Devuelve el instante (UTC) desde el cual filtrar, según la hora de Argentina
function calcularDesde(filtro, ahora = new Date()) {
  const arg = new Date(ahora.getTime() - OFFSET_ARG_MS); // sus campos UTC son la hora local argentina
  const y = arg.getUTCFullYear();
  const m = arg.getUTCMonth();
  const d = arg.getUTCDate();
  const inicioLocal = (anio, mes, dia) => new Date(Date.UTC(anio, mes, dia) + OFFSET_ARG_MS);

  switch (filtro) {
    case "hoy":
      return inicioLocal(y, m, d);
    case "semana":
      return new Date(inicioLocal(y, m, d).getTime() - 7 * DIA_MS);
    case "mes":
      return inicioLocal(y, m, 1);
    case "año":
    case "anio":
      return inicioLocal(y, 0, 1);
    default:
      return null;
  }
}

// GET /api/ventas?filtro=todas|hoy|semana|mes|año
export async function GET(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const desde = calcularDesde(request.nextUrl.searchParams.get("filtro")?.toLowerCase());
  const { data, error: err } = await supabase.rpc("listar_ventas", { p_desde: desde?.toISOString() ?? null });
  if (err) return dbError(err, "Error al obtener el historial de ventas.");
  return json(data ?? []);
}

// POST /api/ventas — body: { detalles: [{ productoId, cantidad }], metodoPago, descuentoPorcentaje }
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const detalles = Array.isArray(body?.detalles) ? body.detalles : [];
  if (detalles.length === 0) return error("La venta debe tener al menos un producto.", 400);

  const detallesValidos = detalles.every(
    (d) => Number.isSafeInteger(Number(d?.productoId)) && Number.isInteger(Number(d?.cantidad)) && Number(d.cantidad) > 0
  );
  if (!detallesValidos) return error("Detalle de venta inválido.", 400);

  const { data, error: err } = await supabase.rpc("registrar_venta", {
    p_detalles: detalles.map((d) => ({ productoId: Number(d.productoId), cantidad: Number(d.cantidad) })),
    p_metodo_pago: body?.metodoPago || "Efectivo",
    p_descuento: Number(body?.descuentoPorcentaje) || 0,
  });

  if (err) return dbError(err, "Error interno al procesar la venta.");
  return json(data);
}
