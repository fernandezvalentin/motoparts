// Ticket de venta: texto para WhatsApp y HTML para imprimir o guardar como PDF.

export const NEGOCIO = {
  nombre: "FERNANDEZ MOTO PARTS",
  rubro: "Venta de repuestos y accesorios de motos",
  direccion: "Belgrano, 998. Bragado, Prov. de Buenos Aires",
  telefono: "2342-447293",
};

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatearFecha = (fecha) => formatoFecha.format(new Date(fecha));
export const numeroComprobante = (id) => `#${String(id).padStart(4, "0")}`;
const pesos = (n) => `$ ${Number(n ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

const escaparHtml = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function lineas(venta) {
  return (venta.detalles ?? []).map((d) => ({
    cantidad: d.cantidad,
    nombre: d.producto?.nombre || "Producto eliminado",
    sku: d.producto?.sku || "",
    subtotal: d.cantidad * d.precioUnitario,
  }));
}

function totales(venta) {
  const subtotal = lineas(venta).reduce((s, l) => s + l.subtotal, 0);
  const descuento = Number(venta.descuentoPorcentaje) > 0 ? subtotal - Number(venta.total) : 0;
  return { subtotal, descuento };
}

// Texto con formato de WhatsApp (*negrita*)
export function textoTicket(venta) {
  const { subtotal, descuento } = totales(venta);
  let texto = `*${NEGOCIO.nombre}*\n${NEGOCIO.rubro}\n${NEGOCIO.direccion}\n${NEGOCIO.telefono}\n\n`;
  texto += `Fecha: ${formatearFecha(venta.fechaVenta)}\n`;
  texto += `Comprobante Nº: ${numeroComprobante(venta.id)}\n`;
  texto += `--------------------------------\n`;
  for (const l of lineas(venta)) {
    texto += `${l.cantidad}x ${l.nombre}${l.sku ? ` (SKU: ${l.sku})` : ""}\n   ${pesos(l.subtotal)}\n`;
  }
  texto += `--------------------------------\n`;
  if (descuento > 0) {
    texto += `Subtotal: ${pesos(subtotal)}\nDescuento (${venta.descuentoPorcentaje}%): -${pesos(descuento)}\n`;
  }
  texto += `*TOTAL: ${pesos(venta.total)}*\n`;
  texto += `Método de pago: ${venta.metodoPago || "Efectivo"}\n\n`;
  texto += `¡Gracias por su compra!`;
  return texto;
}

// Página lista para imprimir (se abre en una ventana nueva)
export function htmlTicket(venta) {
  const { subtotal, descuento } = totales(venta);
  const filas = lineas(venta)
    .map(
      (l) => `
        <tr>
          <td>${l.cantidad}</td>
          <td>${escaparHtml(l.nombre)}${l.sku ? `<br><span class="sku">SKU: ${escaparHtml(l.sku)}</span>` : ""}</td>
          <td class="num">${pesos(l.subtotal)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Ticket de venta ${numeroComprobante(venta.id)}</title>
    <style>
      body { font-family: "Courier New", Courier, monospace; padding: 20px; color: #000; font-size: 14px; max-width: 800px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      .header h1 { margin: 0 0 5px 0; font-size: 24px; }
      .header p, .details p { margin: 2px 0; }
      .details { margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th { border-bottom: 1px dashed #000; text-align: left; padding: 5px 0; }
      td { padding: 5px 0; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .sku { font-size: 11px; color: #555; }
      .totales { border-top: 1px dashed #000; padding-top: 10px; text-align: right; }
      .totales p { margin: 2px 0; }
      .total { font-size: 18px; font-weight: bold; }
      .footer { text-align: center; margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; }
      @media print { body { margin: 0; padding: 10px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${NEGOCIO.nombre}</h1>
      <p>${NEGOCIO.rubro}</p>
      <p>${NEGOCIO.direccion}</p>
      <p>Tel: ${NEGOCIO.telefono}</p>
    </div>
    <div class="details">
      <p><strong>Fecha:</strong> ${formatearFecha(venta.fechaVenta)}</p>
      <p><strong>Comprobante Nº:</strong> ${numeroComprobante(venta.id)}</p>
      <p><strong>Método de pago:</strong> ${escaparHtml(venta.metodoPago || "Efectivo")}</p>
    </div>
    <table>
      <thead><tr><th>CANT</th><th>DESCRIPCIÓN</th><th class="num">SUBTOTAL</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="totales">
      ${descuento > 0 ? `<p>Subtotal: ${pesos(subtotal)}</p><p>Descuento (${Number(venta.descuentoPorcentaje)}%): -${pesos(descuento)}</p>` : ""}
      <p class="total">TOTAL: ${pesos(venta.total)}</p>
    </div>
    <div class="footer"><p>¡Gracias por su compra!</p></div>
    <script>window.onload = function () { window.print(); window.close(); };</script>
  </body>
</html>`;
}
