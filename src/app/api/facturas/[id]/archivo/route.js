import { NextResponse } from "next/server";
import { requireUser, error, dbError, parseId } from "@/lib/http";
import { BUCKET_FACTURAS } from "@/lib/facturas";

// GET /api/facturas/:id/archivo — redirige a un link temporal (5 minutos) al PDF original
export async function GET(_request, { params }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = parseId((await params).id);
  if (!id) return error("ID inválido.", 400);

  const { data: factura, error: err } = await supabase
    .from("facturas")
    .select("ruta_archivo")
    .eq("id", id)
    .maybeSingle();

  if (err) return dbError(err, "Error al obtener la factura.");
  if (!factura?.ruta_archivo) return error("La factura no tiene un PDF adjunto.", 404);

  const { data, error: errUrl } = await supabase.storage
    .from(BUCKET_FACTURAS)
    .createSignedUrl(factura.ruta_archivo, 300);

  if (errUrl) return dbError(errUrl, "No se pudo abrir el PDF.");
  return NextResponse.redirect(data.signedUrl);
}
