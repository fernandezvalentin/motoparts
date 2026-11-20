import { requireUser, json, error, dbError, readJson } from "@/lib/http";
import { BUCKET_FACTURAS } from "@/lib/facturas";

export const maxDuration = 60;

// Borra todos los PDFs del bucket de facturas, incluidos los que hubieran quedado sueltos
async function vaciarPdfs(supabase, rutas) {
  let borrados = 0;
  const borrar = async (lista) => {
    for (let i = 0; i < lista.length; i += 100) {
      const lote = lista.slice(i, i + 100);
      const { error: err } = await supabase.storage.from(BUCKET_FACTURAS).remove(lote);
      if (err) throw err;
      borrados += lote.length;
    }
  };

  await borrar(rutas);
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const { data, error: err } = await supabase.storage.from(BUCKET_FACTURAS).list("", { limit: 1000 });
    if (err) throw err;
    const restantes = data.filter((f) => f.id).map((f) => f.name);
    if (restantes.length === 0) break;
    await borrar(restantes);
  }
  return borrados;
}

// POST /api/admin/reiniciar — body: { confirmacion: "BORRAR TODO" }
// Solo administradores (app_metadata.rol = "admin"). La base de datos vuelve a verificarlo.
export async function POST(request) {
  const { supabase, claims, response } = await requireUser();
  if (response) return response;

  if (claims.app_metadata?.rol !== "admin") {
    return error("Solo un administrador puede reiniciar los datos.", 403);
  }

  const body = await readJson(request);
  if (body?.confirmacion?.trim() !== "BORRAR TODO") {
    return error("Para confirmar escribí BORRAR TODO.", 400);
  }

  const { data, error: err } = await supabase.rpc("reiniciar_datos", { p_confirmacion: "BORRAR TODO" });
  if (err) return dbError(err, "Error al reiniciar los datos.");

  const { archivos, ...resumen } = data;
  let pdfs = 0;
  let avisoPdfs = null;
  try {
    pdfs = await vaciarPdfs(supabase, archivos ?? []);
  } catch (errPdfs) {
    // Los datos ya se borraron; los PDFs que queden solo ocupan espacio
    console.error("No se pudieron borrar todos los PDFs de facturas", errPdfs);
    avisoPdfs = "Los datos se borraron, pero algunos PDFs de facturas quedaron en Supabase Storage.";
  }

  return json({ ...resumen, pdfs, avisoPdfs });
}
