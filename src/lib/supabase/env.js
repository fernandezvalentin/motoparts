// Variables públicas de Supabase (disponibles en el navegador y en el servidor).
// Se acepta la "publishable key" nueva o la "anon key" clásica.

// Deja la URL del proyecto como la espera supabase-js ("https://<id>.supabase.co"),
// aunque se haya cargado con /rest/v1, con barra final, sin https:// o como el ID solo.
export function normalizarUrlSupabase(valor) {
  if (typeof valor !== "string") return valor;
  let url = valor.trim();
  if (!url) return url;

  // Solo el ID del proyecto (por ejemplo "abcdefghijklmnop")
  if (/^[a-z0-9]+$/i.test(url)) return `https://${url}.supabase.co`;

  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    // El origen descarta cualquier ruta (/rest/v1, /auth/v1, barras finales, etc.)
    return new URL(url).origin;
  } catch {
    return valor.trim();
  }
}

export const SUPABASE_URL = normalizarUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Revisá tu .env.local (ver .env.example)."
    );
  }
}
