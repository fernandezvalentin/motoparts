import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, assertSupabaseEnv } from "./env";

// Cliente de Supabase para Server Components y Route Handlers.
// Usa la sesión del usuario guardada en cookies, por lo que aplica RLS.
export async function getSupabaseServerClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy se encarga de refrescar la sesión.
        }
      },
    },
  });
}

// Cliente sin sesión (rol "anon"). Solo puede ejecutar funciones públicas como keepalive().
export function getSupabaseAnonClient() {
  assertSupabaseEnv();
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
