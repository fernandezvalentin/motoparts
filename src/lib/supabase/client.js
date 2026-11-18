import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY, assertSupabaseEnv } from "./env";

let client;

// Cliente de Supabase para componentes del navegador (login, logout, cambio de credenciales).
export function getSupabaseBrowserClient() {
  if (!client) {
    assertSupabaseEnv();
    client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return client;
}
