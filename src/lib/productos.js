// Conversión entre el formato de la base (snake_case) y el de la UI (camelCase)

export const PRODUCTO_COLUMNAS =
  "id, sku, nombre, categoria, descripcion, modelo, proveedor, marca, precio_lista, precio, stock_actual, stock_minimo, fecha_creacion, fecha_actualizacion";

export function productoFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    nombre: row.nombre,
    categoria: row.categoria,
    descripcion: row.descripcion,
    modelo: row.modelo,
    proveedor: row.proveedor,
    marca: row.marca,
    precioLista: Number(row.precio_lista),
    precio: Number(row.precio),
    stockActual: row.stock_actual,
    stockMinimo: row.stock_minimo,
    fechaCreacion: row.fecha_creacion,
    fechaActualizacion: row.fecha_actualizacion,
  };
}

const texto = (v) => (typeof v === "string" ? v.trim() : "");
const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// Valida el cuerpo enviado por ProductoForm y lo convierte a columnas de la base.
export function productoToDb(body) {
  if (!body || typeof body !== "object") return { error: "Datos inválidos." };

  const fila = {
    sku: texto(body.sku).toUpperCase(),
    nombre: texto(body.nombre),
    descripcion: texto(body.descripcion),
    proveedor: texto(body.proveedor),
    marca: texto(body.marca),
    modelo: texto(body.modelo),
    precio_lista: body.precioLista === "" || body.precioLista == null ? 0 : numero(body.precioLista),
    precio: numero(body.precio),
    stock_actual: numero(body.stockActual),
    stock_minimo: numero(body.stockMinimo),
  };
  if (texto(body.categoria)) fila.categoria = texto(body.categoria);

  if (!fila.sku) return { error: "El SKU es obligatorio." };
  if (!fila.nombre) return { error: "El nombre es obligatorio." };
  if (!(fila.precio >= 0) || !(fila.precio_lista >= 0)) return { error: "Precio inválido." };
  if (!Number.isInteger(fila.stock_actual) || fila.stock_actual < 0) return { error: "Stock inválido." };
  if (!Number.isInteger(fila.stock_minimo) || fila.stock_minimo < 0) return { error: "Stock mínimo inválido." };

  return { fila };
}
