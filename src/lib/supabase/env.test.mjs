import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarUrlSupabase } from "./env.js";

const esperada = "https://abcdefghijklmnop.supabase.co";

test("una URL correcta queda igual", () => {
  assert.equal(normalizarUrlSupabase(esperada), esperada);
});

test("quita /rest/v1, /auth/v1 y las barras finales", () => {
  assert.equal(normalizarUrlSupabase(`${esperada}/rest/v1/`), esperada);
  assert.equal(normalizarUrlSupabase(`${esperada}/rest/v1`), esperada);
  assert.equal(normalizarUrlSupabase(`${esperada}/auth/v1`), esperada);
  assert.equal(normalizarUrlSupabase(`${esperada}/`), esperada);
});

test("agrega https:// si falta y recorta espacios", () => {
  assert.equal(normalizarUrlSupabase("abcdefghijklmnop.supabase.co"), esperada);
  assert.equal(normalizarUrlSupabase(`  ${esperada}  `), esperada);
});

test("acepta solo el ID del proyecto", () => {
  assert.equal(normalizarUrlSupabase("abcdefghijklmnop"), esperada);
});

test("respeta valores vacíos o ausentes para que se informe el error", () => {
  assert.equal(normalizarUrlSupabase(""), "");
  assert.equal(normalizarUrlSupabase(undefined), undefined);
});

test("funciona con la URL local de la CLI de Supabase", () => {
  assert.equal(normalizarUrlSupabase("http://127.0.0.1:54321/"), "http://127.0.0.1:54321");
});
