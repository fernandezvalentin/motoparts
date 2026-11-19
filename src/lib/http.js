import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const json = (data, status = 200) => NextResponse.json(data, { status });
export const error = (message, status = 400) => NextResponse.json({ message }, { status });

// Devuelve un cliente de Supabase con la sesión del usuario, o una respuesta 401.
// El proxy ya bloquea las peticiones sin sesión; esto es una segunda verificación.
export async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  if (authError || !data?.claims) {
    return { response: error("No autenticado.", 401) };
  }
  return { supabase, claims: data.claims };
}

// Convierte errores de Postgres/PostgREST en respuestas HTTP con mensaje en español.
export function dbError(err, fallback = "Ocurrió un error interno en el servidor.") {
  if (!err) return error(fallback, 500);
  // P0001 = RAISE EXCEPTION en nuestras funciones: es un error de negocio con mensaje propio
  if (err.code === "P0001") return error(err.message, 400);
  if (err.code === "23505") return error("Ya existe un producto con ese SKU.", 409);
  if (err.code === "22P02" || err.code === "23514" || err.code === "23502") {
    return error("Datos inválidos.", 400);
  }
  console.error(fallback, err);
  return error(fallback, 500);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Verifica el header "Authorization: Bearer <CRON_SECRET>" de los crons (GitHub Actions y Vercel)
export function cronAutorizado(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
