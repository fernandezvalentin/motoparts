// src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5190/api";

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem("moto_parts_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al iniciar sesión");
  }
  return res.json();
};

export const actualizarCredenciales = async (newUsername, newPassword) => {
  const res = await fetch(`${API_URL}/auth/actualizar`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ newUsername, newPassword }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al actualizar credenciales");
  }
  return res.json();
};

// GET: Traer todo el catálogo de productos
export const obtenerProductos = async (params = {}) => {
  try {
    const searchParams = new URLSearchParams();
    if (params.busqueda) searchParams.append("busqueda", params.busqueda);
    if (params.proveedor && params.proveedor !== "Todos") searchParams.append("proveedor", params.proveedor);
    if (params.soloStockBajo) searchParams.append("soloStockBajo", "true");
    if (params.soloConStock) searchParams.append("soloConStock", "true");
    if (params.page) searchParams.append("page", params.page);
    if (params.pageSize) searchParams.append("pageSize", params.pageSize);

    const response = await fetch(`${API_URL}/productos?${searchParams.toString()}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Error fetching products");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerProductos:", error);
    // Return a default paginated structure to prevent breaking the UI
    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }
};

export const obtenerProveedores = async () => {
  try {
    const response = await fetch(`${API_URL}/productos/proveedores`, {
      headers: getHeaders(),
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerProveedores:", error);
    return [];
  }
};

// GET: Obtener estadísticas del inventario
export const obtenerEstadisticas = async () => {
  try {
    const response = await fetch(`${API_URL}/productos/estadisticas`, { headers: getHeaders() });
    if (!response.ok) {
      throw new Error("Error al obtener estadísticas");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerEstadisticas:", error);
    return null;
  }
};

// POST: Cargar nuevo repuesto
export const crearProducto = async (nuevoProducto) => {
  try {
    const response = await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(nuevoProducto),
    });

    if (!response.ok) {
      if (response.status === 409) {
        const error = await response.json();
        console.error("SKU duplicado:", error.message);
      }
      throw new Error("Error al guardar el producto");
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
    const response = await fetch(`${API_URL}/productos/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(productoActualizado),
    });

    if (!response.ok) {
      if (response.status === 409) {
        const error = await response.json();
        console.error("SKU duplicado:", error.message);
      }
      throw new Error("Error al actualizar el producto");
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
    const response = await fetch(`${API_URL}/productos/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Error al eliminar el producto");
    }
    return true;
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    return false;
  }
};

// POST: Registrar una nueva venta
export const registrarVenta = async (venta) => {
  try {
    const response = await fetch(`${API_URL}/ventas`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(venta),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al procesar la venta");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en registrarVenta:", error);
    throw error; // Lanzamos el error para mostrarlo en el UI
  }
};

// GET: Obtener historial de ventas
export const obtenerVentas = async (filtro = "todas") => {
  try {
    const response = await fetch(`${API_URL}/ventas?filtro=${filtro}`, { headers: getHeaders() });
    if (!response.ok) {
      throw new Error("Error al obtener el historial de ventas");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerVentas:", error);
    return [];
  }
};



// DELETE: Limpiar historial de ventas
export const limpiarVentas = async () => {
  try {
    const response = await fetch(`${API_URL}/ventas/limpiar`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Error al limpiar el historial de ventas");
    }
    return true;
  } catch (error) {
    console.error("Error en limpiarVentas:", error);
    return false;
  }
};

// DELETE: Eliminar una venta individual
export const eliminarVenta = async (id) => {
  try {
    const response = await fetch(`${API_URL}/ventas/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Error al eliminar la venta");
    }
    return true;
  } catch (error) {
    console.error("Error en eliminarVenta:", error);
    return false;
  }
};

// POST: Importar masivamente desde JSON
export const importarProductosJson = async (productosData) => {
  try {
    const response = await fetch(`${API_URL}/productos/importar-json`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(productosData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "Error al importar los productos");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en importarProductosJson:", error);
    throw error;
  }
};
export const aumentoMasivo = async (dto) => {
  try {
    const response = await fetch(`${API_URL}/productos/aumento-masivo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al aplicar aumento masivo");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en aumentoMasivo:", error);
    throw error;
  }
};
