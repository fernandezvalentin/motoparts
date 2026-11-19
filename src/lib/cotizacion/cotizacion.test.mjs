import { test } from "node:test";
import assert from "node:assert/strict";
import { parsearCotizacion } from "./index.js";

test("toma el precio de venta de la respuesta de dolarapi", () => {
  const data = { moneda: "USD", casa: "blue", nombre: "Blue", compra: 1180, venta: 1200, fechaActualizacion: "2026-11-19T15:00:00.000Z" };
  assert.deepEqual(parsearCotizacion("blue", data), {
    casa: "blue",
    nombre: "Blue",
    venta: 1200,
    actualizado: "2026-11-19T15:00:00.000Z",
  });
});

test("rechaza respuestas sin precio de venta válido", () => {
  assert.equal(parsearCotizacion("oficial", {}), null);
  assert.equal(parsearCotizacion("oficial", { venta: 0 }), null);
  assert.equal(parsearCotizacion("oficial", { venta: "abc" }), null);
  assert.equal(parsearCotizacion("oficial", null), null);
});
