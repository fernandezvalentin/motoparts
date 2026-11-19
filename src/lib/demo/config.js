// Modo demo: el mismo código desplegado en un proyecto aparte (Vercel + Supabase)
// con datos de ejemplo. Se activa solo con DEMO_MODE=true; en producción no existe.

// Del lado del servidor
export const esDemo = () => process.env.DEMO_MODE === "true";

// Del lado del navegador (se reemplaza en el build)
export const ES_DEMO_CLIENTE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Credenciales del usuario demo y clave de servicio: solo existen en el servidor de la demo
export function credencialesDemo() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) throw new Error("Faltan DEMO_EMAIL y/o DEMO_PASSWORD.");
  return { email, password };
}

export function claveServicio() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  return clave;
}
