// Extrae datos básicos de una factura a partir del texto del PDF.
// Es una heurística pensada para facturas argentinas (formato AFIP):
// el usuario siempre revisa y corrige los datos antes de guardar.

const FECHA = String.raw`(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})`;

// "12.345,67" | "12345,67" | "12,345.67" | "12345.67" | "12.345" → número
export function parsearImporte(texto) {
  if (!texto) return null;
  let s = texto.replace(/[^\d.,]/g, "");
  if (!s) return null;

  const ultimaComa = s.lastIndexOf(",");
  const ultimoPunto = s.lastIndexOf(".");

  if (ultimaComa > ultimoPunto) {
    // Formato argentino: punto de miles, coma decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (ultimoPunto > ultimaComa) {
    const decimales = s.length - ultimoPunto - 1;
    // "12.345" sin coma: el punto es separador de miles
    if (ultimaComa === -1 && decimales === 3) s = s.replace(/\./g, "");
    else s = s.replace(/,/g, "");
  }

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// dd/mm/aaaa → "aaaa-mm-dd" (formato de <input type="date">)
export function parsearFecha(dia, mes, anio) {
  let a = Number(anio);
  if (a < 100) a += 2000;
  const m = Number(mes);
  const d = Number(dia);
  if (m < 1 || m > 12 || d < 1 || d > 31 || a < 2000 || a > 2100) return null;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCDate() !== d) return null; // ej. 31/02
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buscarFecha(texto, etiquetas) {
  for (const etiqueta of etiquetas) {
    const re = new RegExp(`${etiqueta}[^\\d]{0,40}?${FECHA}`, "i");
    const m = texto.match(re);
    if (m) {
      const fecha = parsearFecha(m[1], m[2], m[3]);
      if (fecha) return fecha;
    }
  }
  return null;
}

function buscarTotal(texto) {
  const IMPORTE = String.raw`\$?\s*([\d][\d.,]*\d|\d)`;
  // 1) "Importe Total" (AFIP) — tomamos la última aparición
  const importeTotal = [...texto.matchAll(new RegExp(`importe\\s+total[^\\d$]{0,20}${IMPORTE}`, "gi"))];
  if (importeTotal.length) return parsearImporte(importeTotal.at(-1)[1]);

  // 2) "Total" que no sea "Subtotal" ni "Total Neto/IVA/Tributos" — la última aparición suele ser el total final
  const totales = [...texto.matchAll(new RegExp(`(?<![a-záéíóú])total(?!\\s*(?:neto|iva|otros|tributos|de\\s+percep))[^\\d$]{0,20}${IMPORTE}`, "gi"))]
    .filter((m) => !/sub$/i.test(texto.slice(Math.max(0, m.index - 3), m.index)));
  if (totales.length) return parsearImporte(totales.at(-1)[1]);

  return null;
}

function buscarNumero(texto) {
  // AFIP: "Punto de Venta: 00002 Comp. Nro: 00001234"
  const afip = texto.match(/punto\s+de\s+venta\s*:?\s*(\d{1,5})\s*comp(?:robante)?\.?\s*n(?:ro|°|º)?\.?\s*:?\s*(\d{1,8})/i);
  if (afip) return `${afip[1].padStart(5, "0")}-${afip[2].padStart(8, "0")}`;

  // "0002-00001234" / "00002-00001234"
  const guion = texto.match(/\b(\d{4,5})\s*-\s*(\d{8})\b/);
  if (guion) return `${guion[1].padStart(5, "0")}-${guion[2]}`;

  // "N° 1234" / "Nro: A-0001-..." como último recurso
  const nro = texto.match(/(?:factura|comprobante)\s*(?:n(?:ro|°|º)\.?|número)\s*:?\s*([A-Z]?[\d-]{4,20})/i);
  return nro ? nro[1] : "";
}

function buscarProveedor(texto) {
  // La primera "Razón Social" de una factura AFIP es la del emisor
  const m = texto.match(/raz[oó]n\s+social\s*:?\s*(.+?)(?=\s{2,}|\s+(?:domicilio|fecha|cuit|condici[oó]n|punto|ingresos)\b|$)/im);
  if (!m) return "";
  return m[1].trim().slice(0, 120);
}

export function extraerDatosFactura(texto) {
  const t = (texto ?? "").replace(/ /g, " ");
  return {
    numeroComprobante: buscarNumero(t),
    proveedorEmisor: buscarProveedor(t),
    fechaEmision: buscarFecha(t, [String.raw`fecha\s+de\s+emisi[oó]n`, String.raw`emisi[oó]n`, "fecha"]),
    fechaVencimiento: buscarFecha(t, [
      String.raw`fecha\s+de\s+v(?:to|encimiento)\.?(?:\s+para\s+el\s+pago)?`,
      String.raw`vencimiento`,
      String.raw`\bvto\.?`,
    ]),
    total: buscarTotal(t) ?? 0,
  };
}
