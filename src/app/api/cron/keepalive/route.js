import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase/server";

// Nunca cachear: cada llamada tiene que llegar a la base de datos
export const dynamic = "force-dynamic";

function autorizado(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secreto}`;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET /api/cron/keepalive
// Lo llama el workflow programado de GitHub Actions para que el proyecto
// gratuito de Supabase no se pause por inactividad.
export async function GET(request) {
  if (!autorizado(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { data, error } = await getSupabaseAnonClient().rpc("keepalive");
  if (error) {
    console.error("Keepalive falló", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, database: data, timestamp: new Date().toISOString() });
}
