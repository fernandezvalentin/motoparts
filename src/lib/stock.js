// Movimientos de stock: formato de la base (snake_case) → UI (camelCase)

export const MOVIMIENTO_COLUMNAS =
  "id, fecha, producto_id, producto_sku, producto_nombre, tipo, cantidad_anterior, cantidad_nueva, diferencia, usuario, deshecho";

export const MAX_CANTIDAD = 1_000_000;

export function movimientoFromDb(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    productoId: row.producto_id,
    productoSku: row.producto_sku,
    productoNombre: row.producto_nombre,
    tipo: row.tipo,
    cantidadAnterior: row.cantidad_anterior,
    cantidadNueva: row.cantidad_nueva,
    diferencia: row.diferencia,
    usuario: row.usuario,
    deshecho: row.deshecho,
  };
}

export const esCantidadValida = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_CANTIDAD;
