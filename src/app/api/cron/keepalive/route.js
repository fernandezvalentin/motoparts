import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/http";
import { getSupabaseAnonClient } from "@/lib/supabase/server";

// Nunca cachear: cada llamada tiene que llegar a la base de datos
export const dynamic = "force-dynamic";

// GET /api/cron/keepalive
// Lo llama el workflow programado de GitHub Actions para que el proyecto
// gratuito de Supabase no se pause por inactividad.
export async function GET(request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { data, error } = await getSupabaseAnonClient().rpc("keepalive");
  if (error) {
    console.error("Keepalive falló", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, database: data, timestamp: new Date().toISOString() });
}
