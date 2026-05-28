// src/components/PuntoVenta.jsx
import { useState, useEffect, useMemo } from "react";
import { obtenerProductos, registrarVenta } from "../services/api";
import "./PuntoVenta.css";

export function PuntoVenta({ onAgregarToast }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  
  // Mobile UI State
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    cargarCatologo();
  }, []);

  const cargarCatologo = async () => {
    setCargando(true);
    const data = await obtenerProductos();
    setProductos(data);
    setCargando(false);
  };

  // Filtrado de catálogo
  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productos;
    const term = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    );
  }, [productos, busqueda]);

  // Manejo del Carrito
  const agregarAlCarrito = (producto) => {
    if (producto.stockActual <= 0) return;

    setCarrito((prev) => {
      const existe = prev.find((item) => item.productoId === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stockActual) {
          onAgregarToast(`Stock insuficiente de ${producto.nombre}`, "warning");
          return prev;
        }
        return prev.map((item) =>
          item.productoId === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precio,
          cantidad: 1,
          stockMaximo: producto.stockActual,
        },
      ];
    });
  };

  const modificarCantidad = (productoId, delta) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.productoId === productoId) {
          const nuevaCantidad = item.cantidad + delta;
          if (nuevaCantidad > 0 && nuevaCantidad <= item.stockMaximo) {
            return { ...item, cantidad: nuevaCantidad };
          }
        }
        return item;
      })
    );
  };

  const removerDelCarrito = (productoId) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  };

  const vaciarCarrito = () => {
    if (window.confirm("¿Seguro que querés vaciar el carrito?")) {
      setCarrito([]);
    }
  };

  const calcularTotal = () => {
    return carrito.reduce(
      (acc, item) => acc + item.cantidad * item.precioUnitario,
      0
    );
  };

  const total = calcularTotal();

  // Procesar Venta
  const confirmarVenta = async () => {
    if (carrito.length === 0) return;

    setProcesando(true);
    try {
      const dto = {
        metodoPago: metodoPago,
        detalles: carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
        })),
      };

      await registrarVenta(dto);
      
      onAgregarToast("Venta registrada con éxito", "success");
      setCarrito([]);
      setBusqueda("");
      setMetodoPago("Efectivo");
      setMobileCartOpen(false);
      // Recargar el catálogo para ver el nuevo stock
      await cargarCatologo();
    } catch (error) {
      onAgregarToast(error.message || "Error al registrar la venta", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="pos-container">
      {/* Listado de Productos */}
      <div className="pos-search-section">
        <div className="pos-search-header">
          <div className="pos-search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por código o nombre del repuesto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="pos-product-list">
          {cargando ? (
            <div style={{ padding: "var(--space-4)", color: "var(--text-muted)" }}>
              Cargando catálogo...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div style={{ padding: "var(--space-4)", color: "var(--text-muted)" }}>
              No se encontraron repuestos.
            </div>
          ) : (
            productosFiltrados.map((producto) => {
              const sinStock = producto.stockActual <= 0;
              const stockStatus =
                sinStock ? "stock-out" : producto.stockActual <= producto.stockMinimo ? "stock-low" : "stock-ok";

              return (
                <div
                  key={producto.id}
                  className={`pos-product-card ${sinStock ? "disabled" : ""}`}
                  onClick={() => !sinStock && agregarAlCarrito(producto)}
                >
                  <div className="pos-product-sku">{producto.sku}</div>
                  <div className="pos-product-name" title={producto.nombre}>{producto.nombre}</div>
                  <div className="pos-product-footer">
                    <span className={`pos-product-stock ${stockStatus}`}>
                      Stock: {producto.stockActual}
                    </span>
                    <span className="pos-product-price">
                      ${producto.precio.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Cart Button (Mobile Only) */}
      {carrito.length > 0 && (
        <div className="pos-floating-cart">
          <button 
            className="btn btn-primary floating-cart-btn"
            onClick={() => setMobileCartOpen(true)}
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{carrito.length}</span>
            <span className="cart-total-float">${total.toLocaleString("es-AR")}</span>
          </button>
        </div>
      )}

      {/* Carrito de Compras */}
      <div className={`pos-cart-section ${mobileCartOpen ? 'mobile-open' : ''}`}>
        <div className="pos-cart-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="pos-cart-title">
              🛒 Carrito de Venta
              {carrito.length > 0 && (
                <span className="badge badge-accent" style={{ marginLeft: "auto", fontSize: "0.8rem" }}>
                  {carrito.length} {carrito.length === 1 ? "ítem" : "ítems"}
                </span>
              )}
            </h3>
            <button 
              className="btn-close-mobile hide-desktop"
              onClick={() => setMobileCartOpen(false)}
            >
              &times;
            </button>
          </div>
        </div>

        <div className="pos-cart-items">
          {carrito.length === 0 ? (
            <div className="pos-cart-empty">
              <span>🧾</span>
              <p>El carrito está vacío</p>
              <p style={{ fontSize: "0.85rem", marginTop: 8 }}>Selecciona productos de la lista</p>
            </div>
          ) : (
            carrito.map((item) => (
              <div key={item.productoId} className="cart-item">
                <div className="cart-item-header">
                  <span className="cart-item-name">{item.nombre}</span>
                  <button
                    className="cart-item-remove"
                    onClick={() => removerDelCarrito(item.productoId)}
                    title="Quitar"
                  >
                    🗑️
                  </button>
                </div>
                <div className="cart-item-controls">
                  <div className="qty-control">
                    <button
                      className="qty-btn"
                      onClick={() => modificarCantidad(item.productoId, -1)}
                      disabled={item.cantidad <= 1}
                    >
                      −
                    </button>
                    <span className="qty-display">{item.cantidad}</span>
                    <button
                      className="qty-btn"
                      onClick={() => modificarCantidad(item.productoId, 1)}
                      disabled={item.cantidad >= item.stockMaximo}
                    >
                      +
                    </button>
                  </div>
                  <span className="cart-item-subtotal">
                    ${(item.cantidad * item.precioUnitario).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pos-cart-footer">
          <div className="pos-cart-total">
            <span>Total:</span>
            <span className="pos-cart-total-value">
              ${calcularTotal().toLocaleString("es-AR")}
            </span>
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={{ display: "block", marginBottom: "var(--space-2)", fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>Método de Pago</label>
            <select
              className="select"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="Efectivo">💵 Efectivo</option>
              <option value="Débito">💳 Débito</option>
              <option value="Crédito">💳 Crédito</option>
              <option value="Transferencia">📱 Transferencia</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={vaciarCarrito}
              disabled={carrito.length === 0 || procesando}
            >
              Vaciar
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, background: "var(--success)" }}
              onClick={confirmarVenta}
              disabled={carrito.length === 0 || procesando}
            >
              {procesando ? "Procesando..." : "Confirmar Venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
