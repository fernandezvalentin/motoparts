import { test } from "node:test";
import assert from "node:assert/strict";
import { generarDatosDemo } from "./datos.js";

const hoy = new Date("2026-11-19T15:00:00.000Z");
const { productos, ventas, facturas } = generarDatosDemo(hoy);

test("los productos tienen SKU único y datos válidos", () => {
  const skus = productos.map((p) => p.sku.toLowerCase());
  assert.equal(new Set(skus).size, skus.length);
  for (const p of productos) {
    assert.ok(p.nombre.trim());
    assert.ok(p.precio > p.precioLista, `${p.sku}: el precio tiene que superar al costo`);
    assert.ok(p.stockActual >= 0 && p.stockMinimo >= 0);
  }
  assert.ok(productos.some((p) => p.stockActual === 0), "hay productos sin stock");
  assert.ok(productos.some((p) => p.stockActual > 0 && p.stockActual <= p.stockMinimo), "hay productos con stock crítico");
});

test("las ventas son coherentes y no están en el futuro", () => {
  const skus = new Set(productos.map((p) => p.sku));
  assert.ok(ventas.length > 50);
  for (const v of ventas) {
    assert.ok(new Date(v.fechaVenta) <= hoy, "venta en el futuro");
    assert.ok(v.detalles.length > 0);
    const subtotal = v.detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
    assert.equal(v.total, Math.round(subtotal * (1 - v.descuentoPorcentaje / 100) * 100) / 100);
    for (const d of v.detalles) assert.ok(skus.has(d.sku), `SKU inexistente: ${d.sku}`);
  }
  const hoyISO = hoy.toISOString().slice(0, 10);
  assert.ok(ventas.some((v) => v.fechaVenta.startsWith(hoyISO)), "hay ventas de hoy");
});

test("las facturas cubren todos los estados y tienen fechas válidas", () => {
  const estados = new Set(facturas.map((f) => f.estado));
  for (const e of ["Pendiente", "Pagado", "Vencido"]) assert.ok(estados.has(e));
  for (const f of facturas) {
    assert.match(f.fechaEmision, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(f.fechaVencimiento >= f.fechaEmision);
  }
});

test("los datos son los mismos en cada reinicio del mismo día", () => {
  assert.deepEqual(generarDatosDemo(hoy), { productos, ventas, facturas });
});
