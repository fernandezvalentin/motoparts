// src/components/HistorialVentas.jsx
import { useState, useEffect } from "react";
import { obtenerVentas, limpiarVentas, eliminarVenta } from "../services/api";
import "./HistorialVentas.css";

export function HistorialVentas({ onConfirmar, onAgregarToast }) {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    cargarHistorial();
  }, [filtro]);

  const cargarHistorial = async () => {
    setCargando(true);
    const data = await obtenerVentas(filtro);
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

  const handleEliminarVenta = (id) => {
    onConfirmar(
      "¿Querés eliminar esta venta? Se devolverá el stock de los repuestos vendidos.",
      async () => {
        const ok = await eliminarVenta(id);
        if (ok) {
          onAgregarToast("Venta eliminada. Stock restaurado.", "success");
          cargarHistorial();
        } else {
          onAgregarToast("Error al eliminar la venta.", "error");
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
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Método</th>
                <th>Detalle</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan="5">
                    <div className="skeleton" style={{ height: 40 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select 
            className="select" 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="todas">Todas las ventas</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mes</option>
            <option value="año">Este Año</option>
          </select>
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
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>VENTA</th>
                <th>MÉTODO</th>
                <th>DETALLE</th>
                <th style={{ textAlign: 'center' }}>TOTAL</th>
                <th style={{ textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta, index) => (
                <tr
                  key={venta.id}
                  style={{ animationDelay: `${index * 50}ms`, animation: "fadeInUp 300ms var(--ease-out) backwards" }}
                >
                  <td data-label="VENTA">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold' }}>#{venta.id.toString().padStart(4, "0")}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{formatearFecha(venta.fechaVenta)}</span>
                    </div>
                  </td>
                  <td data-label="MÉTODO">
                    <span className="badge badge-neutral">
                      {venta.metodoPago === "Efectivo" ? "💵 " : venta.metodoPago === "Débito" || venta.metodoPago === "Crédito" ? "💳 " : "📱 "}
                      {venta.metodoPago || "Efectivo"}
                    </span>
                  </td>
                  <td data-label="DETALLE">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {venta.detalles.map((detalle) => (
                        <div key={detalle.id} style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '4px' }}>{detalle.cantidad}x</span> 
                          {detalle.producto?.nombre || "Producto eliminado"}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td data-label="TOTAL" style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                      ${venta.total.toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td data-label="ACCIONES" style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleEliminarVenta(venta.id)}
                      title="Eliminar venta"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
