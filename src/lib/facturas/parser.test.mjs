import { test } from "node:test";
import assert from "node:assert/strict";
import { extraerDatosFactura, parsearImporte, parsearFecha } from "./parser.js";

test("parsearImporte entiende formatos argentinos e internacionales", () => {
  assert.equal(parsearImporte("$ 12.345,67"), 12345.67);
  assert.equal(parsearImporte("12345,6"), 12345.6);
  assert.equal(parsearImporte("12,345.67"), 12345.67);
  assert.equal(parsearImporte("1500.50"), 1500.5);
  assert.equal(parsearImporte("12.345"), 12345);
  assert.equal(parsearImporte("abc"), null);
});

test("parsearFecha valida fechas reales", () => {
  assert.equal(parsearFecha("05", "03", "2026"), "2026-03-05");
  assert.equal(parsearFecha("5", "3", "26"), "2026-03-05");
  assert.equal(parsearFecha("31", "02", "2026"), null);
});

test("factura electrónica AFIP", () => {
  const texto = `ORIGINAL A FACTURA COD. 01 Punto de Venta: 00003 Comp. Nro: 00012345
    Fecha de Emisión: 14/11/2026 Razón Social: FAR MOTOPARTES S.A.  Domicilio Comercial: Av. Siempreviva 742
    CUIT: 30712345678 Ingresos Brutos: 901-123456-7
    Período Facturado Desde: 01/11/2026 Hasta: 30/11/2026 Fecha de Vto. para el pago: 30/11/2026
    Subtotal: $ 100.000,00 Importe Neto Gravado: $ 100.000,00 IVA 21%: $ 21.000,00
    Importe Otros Tributos: $ 0,00 Importe Total: $ 121.000,00`;
  assert.deepEqual(extraerDatosFactura(texto), {
    numeroComprobante: "00003-00012345",
    proveedorEmisor: "FAR MOTOPARTES S.A.",
    fechaEmision: "2026-11-14",
    fechaVencimiento: "2026-11-30",
    total: 121000,
  });
});

test("factura simple: ignora Subtotal y toma el Total final", () => {
  const texto = `Factura B 0002-00004567 Fecha: 02/10/2026 Vencimiento: 17/10/2026
    Subtotal 8.264,46 IVA 1.735,54 TOTAL $ 10.000,00`;
  const datos = extraerDatosFactura(texto);
  assert.equal(datos.numeroComprobante, "00002-00004567");
  assert.equal(datos.fechaEmision, "2026-10-02");
  assert.equal(datos.fechaVencimiento, "2026-10-17");
  assert.equal(datos.total, 10000);
});

test("texto sin datos reconocibles devuelve valores vacíos", () => {
  assert.deepEqual(extraerDatosFactura("Hola mundo"), {
    numeroComprobante: "",
    proveedorEmisor: "",
    fechaEmision: null,
    fechaVencimiento: null,
    total: 0,
  });
});
