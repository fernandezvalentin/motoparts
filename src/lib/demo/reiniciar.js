import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, assertSupabaseEnv } from "@/lib/supabase/env";
import { BUCKET_FACTURAS } from "@/lib/facturas";
import { claveServicio, credencialesDemo } from "./config";
import { generarDatosDemo } from "./datos";

// Cliente con la clave de servicio: saltea RLS. Solo se usa en el servidor de la demo.
function clienteServicio() {
  assertSupabaseEnv();
  return createClient(SUPABASE_URL, claveServicio(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const comprobar = ({ error }, paso) => {
  if (error) throw new Error(`${paso}: ${error.message}`);
};

// Crea el usuario demo si no existe, o le restablece la contraseña si alguien la cambió
async function prepararUsuarioDemo(supabase) {
  const { email, password } = credencialesDemo();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Buscar usuario demo: ${error.message}`);
    const usuario = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (usuario) {
      comprobar(await supabase.auth.admin.updateUserById(usuario.id, { password, email_confirm: true }), "Restablecer usuario demo");
      return "actualizado";
    }
    if (data.users.length < 200) break;
  }
  comprobar(await supabase.auth.admin.createUser({ email, password, email_confirm: true }), "Crear usuario demo");
  return "creado";
}

async function vaciarBucketFacturas(supabase) {
  let borrados = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET_FACTURAS).list("", { limit: 1000 });
    if (error) throw new Error(`Listar PDFs: ${error.message}`);
    const archivos = data.filter((f) => f.id).map((f) => f.name);
    if (archivos.length === 0) return borrados;
    comprobar(await supabase.storage.from(BUCKET_FACTURAS).remove(archivos), "Borrar PDFs");
    borrados += archivos.length;
  }
}

// Deja la base de la demo como recién instalada, con los datos de ejemplo de hoy
export async function reiniciarDemo(hoy = new Date()) {
  const supabase = clienteServicio();
  const { productos, ventas, facturas } = generarDatosDemo(hoy);

  // 1. Borrar todo (los detalles se borran en cascada con las ventas)
  comprobar(await supabase.from("ventas").delete().gte("id", 0), "Borrar ventas");
  comprobar(await supabase.from("facturas").delete().gte("id", 0), "Borrar facturas");
  comprobar(await supabase.from("productos").delete().gte("id", 0), "Borrar productos");
  const pdfsBorrados = await vaciarBucketFacturas(supabase);

  // 2. Productos
  const { data: creados, error: errProductos } = await supabase
    .from("productos")
    .insert(
      productos.map((p) => ({
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        marca: p.marca,
        modelo: p.modelo,
        proveedor: p.proveedor,
        precio_lista: p.precioLista,
        precio: p.precio,
        stock_actual: p.stockActual,
        stock_minimo: p.stockMinimo,
      }))
    )
    .select("id, sku");
  if (errProductos) throw new Error(`Cargar productos: ${errProductos.message}`);
  const idPorSku = new Map(creados.map((p) => [p.sku, p.id]));
  const nombrePorSku = new Map(productos.map((p) => [p.sku, p.nombre]));

  // 3. Ventas y sus detalles (PostgREST devuelve las filas en el mismo orden en que se insertan)
  const { data: ventasCreadas, error: errVentas } = await supabase
    .from("ventas")
    .insert(
      ventas.map((v) => ({
        fecha_venta: v.fechaVenta,
        total: v.total,
        descuento_porcentaje: v.descuentoPorcentaje,
        metodo_pago: v.metodoPago,
      }))
    )
    .select("id");
  if (errVentas) throw new Error(`Cargar ventas: ${errVentas.message}`);

  const detalles = ventas.flatMap((v, i) =>
    v.detalles.map((d) => ({
      venta_id: ventasCreadas[i].id,
      producto_id: idPorSku.get(d.sku),
      producto_sku: d.sku,
      producto_nombre: nombrePorSku.get(d.sku),
      cantidad: d.cantidad,
      precio_unitario: d.precioUnitario,
    }))
  );
  comprobar(await supabase.from("venta_detalles").insert(detalles), "Cargar detalles de ventas");

  // 4. Facturas (sin PDF)
  comprobar(
    await supabase.from("facturas").insert(
      facturas.map((f) => ({
        numero_comprobante: f.numeroComprobante,
        proveedor_emisor: f.proveedorEmisor,
        fecha_emision: f.fechaEmision,
        fecha_vencimiento: f.fechaVencimiento,
        total: f.total,
        estado: f.estado,
      }))
    ),
    "Cargar facturas"
  );

  // 5. Usuario demo
  const usuario = await prepararUsuarioDemo(supabase);

  return {
    productos: creados.length,
    ventas: ventasCreadas.length,
    detalles: detalles.length,
    facturas: facturas.length,
    pdfsBorrados,
    usuario,
  };
}
