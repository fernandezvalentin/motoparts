// Fechas según la hora de Argentina

// Argentina usa UTC-3 todo el año (sin horario de verano)
const OFFSET_ARG_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

// Devuelve el instante (UTC) desde el cual filtrar, según la hora de Argentina
// filtro: "hoy" | "semana" | "mes" | "año"; cualquier otro valor devuelve null (sin filtro)
export function calcularDesde(filtro, ahora = new Date()) {
  const arg = new Date(ahora.getTime() - OFFSET_ARG_MS); // sus campos UTC son la hora local argentina
  const y = arg.getUTCFullYear();
  const m = arg.getUTCMonth();
  const d = arg.getUTCDate();
  const inicioLocal = (anio, mes, dia) => new Date(Date.UTC(anio, mes, dia) + OFFSET_ARG_MS);

  switch (filtro) {
    case "hoy":
      return inicioLocal(y, m, d);
    case "semana":
      return new Date(inicioLocal(y, m, d).getTime() - 7 * DIA_MS);
    case "mes":
      return inicioLocal(y, m, 1);
    case "año":
    case "anio":
      return inicioLocal(y, 0, 1);
    default:
      return null;
  }
}
