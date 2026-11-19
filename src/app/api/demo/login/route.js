import { NextResponse } from "next/server";
import { esDemo, credencialesDemo } from "@/lib/demo/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/demo/login
// Solo en la demo pública: inicia sesión con el usuario demo desde el servidor.
// La sesión queda en las cookies y las credenciales nunca llegan al navegador.
export async function POST() {
  if (!esDemo()) return new NextResponse(null, { status: 404 });

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(credencialesDemo());
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Ingreso a la demo falló", err);
    return NextResponse.json(
      { message: "No se pudo entrar a la demo en este momento. Probá de nuevo en unos minutos." },
      { status: 503 }
    );
  }
}
