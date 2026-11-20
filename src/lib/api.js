// src/lib/api.js
// Funciones que usan los componentes para hablar con el backend.
// Las rutas /api/* son Route Handlers de Next.js; la sesión viaja en cookies de Supabase.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const API_URL = "/api";

// Si la sesión venció, volvemos al login
const verificarSesion = (response) => {
  if (response.status === 401 && typeof window !== "undefined") {
    // Recarga completa a propósito: descarta todo el estado de la sesión anterior
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
  return response;
};

const request = (path, options = {}) =>
  fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    cache: "no-store",
  }).then(verificarSesion);

// ---------------------------------------------------------------------------
// Autenticación (Supabase Auth)
// ---------------------------------------------------------------------------

export const login = async (email, password) => {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw new Error(
      error.message === "Invalid login credentials" ? "Email o contraseña incorrectos." : error.message
    );
  }
  return { email: data.user?.email };
};

export const logout = async () => {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
};

export const actualizarCredenciales = async (newEmail, newPassword) => {
  const supabase = getSupabaseBrowserClient();
  const cambios = {};
  if (newEmail?.trim()) cambios.email = newEmail.trim();
  if (newPassword) cambios.password = newPassword;

  const { error } = await supabase.auth.updateUser(cambios);
  if (error) throw new Error(error.message || "Error al actualizar credenciales");
  return { message: "Credenciales actualizadas correctamente." };
};

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

// GET: Traer el catálogo de productos (paginado)
export const obtenerProductos = async (params = {}) => {
  try {
    const searchParams = new URLSearchParams();
    if (params.busqueda) searchParams.append("busqueda", params.busqueda);
    if (params.proveedor && params.proveedor !== "Todos") searchParams.append("proveedor", params.proveedor);
    if (params.soloStockBajo) searchParams.append("soloStockBajo", "true");
    if (params.soloConStock) searchParams.append("soloConStock", "true");
    if (params.page) searchParams.append("page", params.page);
    if (params.pageSize) searchParams.append("pageSize", params.pageSize);

    const response = await request(`/productos?${searchParams.toString()}`);
    if (!response.ok) throw new Error("Error al obtener productos");
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerProductos:", error);
    // Estructura vacía para no romper la UI
    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }
};

// GET: Un producto por ID
export const obtenerProducto = async (id) => {
  try {
    const response = await request(`/productos/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerProducto:", error);
    return null;
  }
};

export const obtenerProveedores = async () => {
  try {
    const response = await request("/productos/proveedores");
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerProveedores:", error);
    return [];
  }
};

// GET: Estadísticas del inventario
export const obtenerEstadisticas = async () => {
  try {
    const response = await request("/productos/estadisticas");
    if (!response.ok) throw new Error("Error al obtener estadísticas");
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerEstadisticas:", error);
    return null;
  }
};

// POST: Cargar nuevo repuesto
export const crearProducto = async (nuevoProducto) => {
  try {
    const response = await request("/productos", {
      method: "POST",
      body: JSON.stringify(nuevoProducto),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Error al guardar el producto:", error.message);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error en crearProducto:", error);
    return null;
  }
};

// PUT: Modificar un repuesto existente
export const actualizarProducto = async (id, productoActualizado) => {
  try {
    const response = await request(`/productos/${id}`, {
      method: "PUT",
      body: JSON.stringify(productoActualizado),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Error al actualizar el producto:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    return false;
  }
};

// DELETE: Dar de baja un artículo
export const eliminarProducto = async (id) => {
  try {
    const response = await request(`/productos/${id}`, { method: "DELETE" });
    return response.ok;
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    return false;
  }
};

// PUT: Aumento masivo de precios
export const aumentoMasivo = async (dto) => {
  const response = await request("/productos/aumento-masivo", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Error al aplicar el aumento masivo.");
  return data;
};

// PUT: Renombrar Proveedor
export const renombrarProveedor = async (viejo, nuevo) => {
  const response = await request("/productos/renombrar-proveedor", {
    method: "PUT",
    body: JSON.stringify({ viejo, nuevo }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Error al renombrar el proveedor.");
  return data;
};

// POST: Importar masivamente desde Excel (ya convertido a JSON)
export const importarProductosJson = async (productosData) => {
  const response = await request("/productos/importar", {
    method: "POST",
    body: JSON.stringify(productosData),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Error al importar los productos");
  return data;
};

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

// POST: Registrar una nueva venta
export const registrarVenta = async (venta) => {
  const response = await request("/ventas", {
    method: "POST",
    body: JSON.stringify(venta),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Error al procesar la venta");
  return data;
};

// GET: Historial de ventas
export const obtenerVentas = async (filtro = "todas") => {
  try {
    const response = await request(`/ventas?filtro=${encodeURIComponent(filtro)}`);
    if (!response.ok) throw new Error("Error al obtener el historial de ventas");
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerVentas:", error);
    return [];
  }
};

// DELETE: Limpiar historial de ventas
export const limpiarVentas = async () => {
  try {
    const response = await request("/ventas/limpiar", { method: "DELETE" });
    return response.ok;
  } catch (error) {
    console.error("Error en limpiarVentas:", error);
    return false;
  }
};

// DELETE: Eliminar una venta individual (devuelve el stock)
export const eliminarVenta = async (id) => {
  try {
    const response = await request(`/ventas/${id}`, { method: "DELETE" });
    return response.ok;
  } catch (error) {
    console.error("Error en eliminarVenta:", error);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Facturas de proveedores
// ---------------------------------------------------------------------------

const BUCKET_FACTURAS = "facturas";
export const MAX_MB_FACTURA = 10;

const leerError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  return new Error(data.message || fallback);
};

export const obtenerFacturas = async () => {
  const response = await request("/facturas");
  if (!response.ok) throw await leerError(response, "Error al obtener las facturas");
  return response.json();
};

// Sube el PDF directo a Supabase Storage (sin pasar por el servidor) y devuelve su ruta
export const subirPdfFactura = async (archivo) => {
  if (archivo.type !== "application/pdf") throw new Error("El archivo debe ser un PDF.");
  if (archivo.size > MAX_MB_FACTURA * 1024 * 1024) {
    throw new Error(`El PDF no puede superar los ${MAX_MB_FACTURA} MB.`);
  }

  const ruta = `${crypto.randomUUID()}.pdf`;
  const { error } = await getSupabaseBrowserClient()
    .storage.from(BUCKET_FACTURAS)
    .upload(ruta, archivo, { contentType: "application/pdf", upsert: false });

  if (error) throw new Error(`No se pudo subir el PDF: ${error.message}`);
  return ruta;
};

// Si el usuario cancela antes de guardar, borramos el PDF que ya se había subido
export const descartarPdfFactura = async (ruta) => {
  if (!ruta) return;
  await getSupabaseBrowserClient().storage.from(BUCKET_FACTURAS).remove([ruta]);
};

// Lee el PDF en el servidor y sugiere los datos de la factura
export const extraerDatosFactura = async (ruta) => {
  const response = await request("/facturas/extraer", {
    method: "POST",
    body: JSON.stringify({ ruta }),
  });
  if (!response.ok) throw await leerError(response, "Error al leer el PDF");
  return response.json();
};

export const crearFactura = async (factura) => {
  const response = await request("/facturas", {
    method: "POST",
    body: JSON.stringify(factura),
  });
  if (!response.ok) throw await leerError(response, "Error al guardar la factura");
  return response.json();
};

export const actualizarEstadoFactura = async (id, estado) => {
  const response = await request(`/facturas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
  if (!response.ok) throw await leerError(response, "Error al actualizar el estado");
  return response.json();
};

export const eliminarFactura = async (id) => {
  const response = await request(`/facturas/${id}`, { method: "DELETE" });
  if (!response.ok) throw await leerError(response, "Error al eliminar la factura");
};

export const urlArchivoFactura = (id) => `${API_URL}/facturas/${id}/archivo`;

// ---------------------------------------------------------------------------
// Carga de stock y movimientos
// ---------------------------------------------------------------------------

// modo: "sumar" (llegó mercadería) | "fijar" (conteo)
export const ajustarStock = async (productoId, modo, cantidad) => {
  const response = await request("/stock/ajustar", {
    method: "POST",
    body: JSON.stringify({ productoId, modo, cantidad }),
  });
  if (!response.ok) throw await leerError(response, "Error al cargar el stock");
  return response.json();
};

export const altaRapidaProducto = async ({ nombre, precio, cantidad, sku }) => {
  const response = await request("/stock/alta", {
    method: "POST",
    body: JSON.stringify({ nombre, precio, cantidad, sku }),
  });
  if (!response.ok) throw await leerError(response, "Error al crear el producto");
  return response.json();
};

export const obtenerMovimientos = async (filtro = "hoy") => {
  const response = await request(`/stock/movimientos?filtro=${encodeURIComponent(filtro)}`);
  if (!response.ok) throw await leerError(response, "Error al obtener los movimientos");
  return response.json();
};

export const deshacerMovimiento = async (id) => {
  const response = await request(`/stock/movimientos/${id}/deshacer`, { method: "POST" });
  if (!response.ok) throw await leerError(response, "Error al deshacer");
  return response.json();
};
