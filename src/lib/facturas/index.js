// Conversión y validación de facturas entre la base (snake_case) y la UI (camelCase)

export const BUCKET_FACTURAS = "facturas";
export const ESTADOS_FACTURA = ["Pendiente", "Pagado", "Vencido"];
export const FACTURA_COLUMNAS =
  "id, numero_comprobante, proveedor_emisor, fecha_emision, fecha_vencimiento, total, estado, ruta_archivo, fecha_creacion";

// Las rutas las genera el navegador con crypto.randomUUID(): "<uuid>.pdf"
const RUTA_VALIDA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;
export const esRutaValida = (ruta) => typeof ruta === "string" && RUTA_VALIDA.test(ruta);

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function facturaFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    numeroComprobante: row.numero_comprobante,
    proveedorEmisor: row.proveedor_emisor,
    fechaEmision: row.fecha_emision,
    fechaVencimiento: row.fecha_vencimiento,
    total: Number(row.total),
    estado: row.estado,
    rutaArchivo: row.ruta_archivo,
    fechaCreacion: row.fecha_creacion,
  };
}

const texto = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fecha = (v) => (typeof v === "string" && FECHA_ISO.test(v) ? v : null);

export function facturaToDb(body) {
  if (!body || typeof body !== "object") return { error: "Datos inválidos." };

  const total = Number(body.total ?? 0);
  const estado = body.estado || "Pendiente";

  if (!Number.isFinite(total) || total < 0) return { error: "El total debe ser un número positivo." };
  if (!ESTADOS_FACTURA.includes(estado)) return { error: "Estado inválido." };
  if (body.rutaArchivo != null && !esRutaValida(body.rutaArchivo)) return { error: "Archivo inválido." };
  if (body.fechaEmision && !fecha(body.fechaEmision)) return { error: "Fecha de emisión inválida." };
  if (body.fechaVencimiento && !fecha(body.fechaVencimiento)) return { error: "Fecha de vencimiento inválida." };

  return {
    fila: {
      numero_comprobante: texto(body.numeroComprobante, 60),
      proveedor_emisor: texto(body.proveedorEmisor, 120),
      fecha_emision: fecha(body.fechaEmision),
      fecha_vencimiento: fecha(body.fechaVencimiento),
      total: Math.round(total * 100) / 100,
      estado,
      ruta_archivo: body.rutaArchivo ?? null,
    },
  };
}
