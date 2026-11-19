import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlTicket, numeroComprobante, textoTicket } from "./ticket.js";

const venta = {
  id: 7,
  fechaVenta: "2026-11-19T15:00:00.000Z",
  total: 900,
  descuentoPorcentaje: 10,
  metodoPago: "Débito",
  detalles: [
    { cantidad: 2, precioUnitario: 250, producto: { nombre: "Filtro <b>", sku: "FIL-1" } },
    { cantidad: 1, precioUnitario: 500, producto: null },
  ],
};

test("numera el comprobante con 4 dígitos", () => {
  assert.equal(numeroComprobante(7), "#0007");
  assert.equal(numeroComprobante(12345), "#12345");
});

test("el texto incluye ítems, descuento y total", () => {
  const texto = textoTicket(venta);
  assert.match(texto, /2x Filtro <b> \(SKU: FIL-1\)/);
  assert.match(texto, /1x Producto eliminado/);
  assert.match(texto, /Descuento \(10%\): -\$ 100/);
  assert.match(texto, /\*TOTAL: \$ 900\*/);
  assert.match(texto, /Método de pago: Débito/);
});

test("el HTML escapa los nombres de los productos", () => {
  const html = htmlTicket(venta);
  assert.ok(html.includes("Filtro &lt;b&gt;"));
  assert.ok(!html.includes("Filtro <b>"));
});
