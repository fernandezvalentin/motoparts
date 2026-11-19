import { extractText, getDocumentProxy } from "unpdf";
import { requireUser, json, error, readJson } from "@/lib/http";
import { BUCKET_FACTURAS, esRutaValida } from "@/lib/facturas";
import { extraerDatosFactura } from "@/lib/facturas/parser";

const MAX_PAGINAS = 30;

export const maxDuration = 30;

// POST /api/facturas/extraer — body: { ruta }
// Lee el PDF ya subido a Storage y sugiere número, proveedor, fechas y total.
export async function POST(request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  if (!esRutaValida(body?.ruta)) return error("Archivo inválido.", 400);

  const { data: blob, error: errDescarga } = await supabase.storage.from(BUCKET_FACTURAS).download(body.ruta);
  if (errDescarga || !blob) return error("No se encontró el PDF subido.", 404);

  let texto = "";
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()), { maxImageSize: 16_777_216 });
    if (pdf.numPages > MAX_PAGINAS) {
      return error(`El PDF tiene demasiadas páginas (máximo ${MAX_PAGINAS}).`, 400);
    }
    ({ text: texto } = await extractText(pdf, { mergePages: true }));
  } catch (err) {
    console.error("Error leyendo el PDF", err);
    return error("No se pudo leer el PDF. ¿Está dañado o protegido con contraseña?", 400);
  }

  // Un PDF escaneado (imagen) no tiene texto: se completa a mano
  const sinTexto = texto.trim().length < 20;
  return json({ ...extraerDatosFactura(texto), sinTexto });
}
