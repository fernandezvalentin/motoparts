import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/http";
import { esDemo } from "@/lib/demo/config";
import { reiniciarDemo } from "@/lib/demo/reiniciar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/reset-demo
// Solo en la demo pública: vuelve a cargar los datos de ejemplo. Lo llama el cron
// diario de Vercel (que además mantiene activo el proyecto de Supabase de la demo).
export async function GET(request) {
  if (!esDemo()) return new NextResponse(null, { status: 404 });
  if (!cronAutorizado(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const resultado = await reiniciarDemo();
    return NextResponse.json({ ok: true, ...resultado, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Reinicio de la demo falló", err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
