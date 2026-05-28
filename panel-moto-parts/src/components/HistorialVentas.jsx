// src/components/HistorialVentas.jsx
import { useState, useEffect } from "react";
import { obtenerVentas, limpiarVentas } from "../services/api";
import "./HistorialVentas.css";

export function HistorialVentas({ onConfirmar, onAgregarToast }) {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setCargando(true);
    const data = await obtenerVentas();
    setVentas(data);
    setCargando(false);
  };

  const handleLimpiarHistorial = () => {
    onConfirmar(
      "¿Estás seguro de que querés borrar todo el historial de ventas? Esta acción NO se puede deshacer.",
      async () => {
        const ok = await limpiarVentas();
        if (ok) {
          onAgregarToast("Historial de ventas borrado exitosamente.", "success");
          cargarHistorial();
        } else {
          onAgregarToast("Error al borrar el historial de ventas.", "error");
        }
      }
    );
  };

  const formatearFecha = (fechaUtc) => {
    const fecha = new Date(fechaUtc);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(fecha);
  };

  if (cargando) {
    return (
      <div className="historial-container">
        <div className="page-header">
          <div>
            <h2 className="page-title">Historial de Ventas</h2>
            <p className="page-subtitle">Cargando transacciones...</p>
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="venta-card">
            <div className="skeleton" style={{ height: 60 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="historial-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Historial de Ventas</h2>
          <p className="page-subtitle">
            {ventas.length} {ventas.length === 1 ? "venta registrada" : "ventas registradas"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            className="btn btn-ghost" 
            style={{ color: "var(--danger)" }}
            onClick={handleLimpiarHistorial} 
            disabled={ventas.length === 0}
          >
            🗑️ Borrar Todo
          </button>
          <button className="btn btn-secondary" onClick={cargarHistorial}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {ventas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <p className="empty-state-title">No hay ventas registradas</p>
          <p className="empty-state-text">
            Las ventas que realices desde el "Punto de Venta" aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="ventas-list">
          {ventas.map((venta, index) => (
            <div
              key={venta.id}
              className="venta-card"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="venta-header">
                <div className="venta-info">
                  <span className="venta-id">#{venta.id.toString().padStart(4, "0")}</span>
                  <span className="venta-fecha">📅 {formatearFecha(venta.fechaVenta)}</span>
                  <span className="venta-metodo-pago" style={{ marginLeft: '10px', fontSize: 'var(--font-xs)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                    {venta.metodoPago === "Efectivo" ? "💵 " : venta.metodoPago === "Débito" || venta.metodoPago === "Crédito" ? "💳 " : "📱 "}
                    {venta.metodoPago || "Efectivo"}
                  </span>
                </div>
                <div className="venta-total">
                  ${venta.total.toLocaleString("es-AR")}
                </div>
              </div>
              <div className="venta-detalles">
                {venta.detalles.map((detalle) => (
                  <div key={detalle.id} className="detalle-item">
                    <div className="detalle-producto">
                      <span className="detalle-qty">{detalle.cantidad}x</span>
                      <span className="detalle-nombre">
                        {detalle.producto?.nombre || "Producto eliminado"}
                      </span>
                    </div>
                    <span className="detalle-precio">
                      ${(detalle.cantidad * detalle.precioUnitario).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
