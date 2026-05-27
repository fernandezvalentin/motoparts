// src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5190/api";

// GET: Traer todo el catálogo de productos
export const obtenerProductos = async (params = {}) => {
  try {
    const searchParams = new URLSearchParams();
    if (params.busqueda) searchParams.append("busqueda", params.busqueda);
    if (params.categoria) searchParams.append("categoria", params.categoria);
    if (params.soloStockBajo) searchParams.append("soloStockBajo", "true");

    const queryString = searchParams.toString();
    const url = `${API_URL}/productos${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error al conectar con el servidor");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerProductos:", error);
    return [];
  }
};

// GET: Obtener estadísticas del inventario
export const obtenerEstadisticas = async () => {
  try {
    const response = await fetch(`${API_URL}/productos/estadisticas`);
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
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
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
export const obtenerVentas = async () => {
  try {
    const response = await fetch(`${API_URL}/ventas`);
    if (!response.ok) {
      throw new Error("Error al obtener el historial de ventas");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en obtenerVentas:", error);
    return [];
  }
};


