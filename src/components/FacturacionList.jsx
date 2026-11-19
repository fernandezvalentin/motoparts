"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { actualizarEstadoFactura, eliminarFactura, obtenerFacturas, urlArchivoFactura } from "@/lib/api";
import { FacturaUploadModal } from "./FacturaUploadModal";
// Estilos de las tarjetas de resumen (kpi-*), compartidos con el Panel de Control
import "./Dashboard.css";

const ESTADO_BADGE = {
  Pagado: "badge-success",
  Vencido: "badge-danger",
  Pendiente: "badge-warning",
};

// Las fechas vienen como "aaaa-mm-dd" (sin hora): se formatean sin pasar por Date para evitar corrimientos de zona horaria
const formatearFecha = (iso) => {
  if (!iso) return "-";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const formatearMoneda = (monto) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto || 0);

const hoyArgentina = () =>
  new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function FacturacionList({ onAgregarToast, onConfirmar }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("Todas");

  const cargarFacturas = useCallback(async () => {
    setCargando(true);
    try {
      setFacturas(await obtenerFacturas());
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  }, [onAgregarToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    cargarFacturas();
  }, [cargarFacturas]);

  const hoy = hoyArgentina();
  const esVencida = (f) => f.estado === "Vencido" || (f.estado === "Pendiente" && f.fechaVencimiento && f.fechaVencimiento < hoy);

  const resumen = useMemo(() => {
    const pendientes = facturas.filter((f) => f.estado !== "Pagado");
    return {
      totalAPagar: pendientes.reduce((acc, f) => acc + f.total, 0),
      cantidadPendientes: pendientes.length,
      cantidadVencidas: facturas.filter(esVencida).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- esVencida depende solo de "hoy"
  }, [facturas, hoy]);

  const facturasFiltradas =
    filtroEstado === "Todas" ? facturas : facturas.filter((f) => f.estado === filtroEstado);

  const handleCambiarEstado = async (id, estado) => {
    try {
      const actualizada = await actualizarEstadoFactura(id, estado);
      setFacturas((prev) => prev.map((f) => (f.id === id ? actualizada : f)));
      onAgregarToast("Estado actualizado", "success");
    } catch (error) {
      onAgregarToast(error.message, "error");
    }
  };

  const handleEliminar = (factura) => {
    onConfirmar(
      `Se eliminará la factura ${factura.numeroComprobante || `#${factura.id}`}${
        factura.proveedorEmisor ? ` de ${factura.proveedorEmisor}` : ""
      } junto con su PDF. Esta acción no se puede deshacer.`,
      async () => {
        try {
          await eliminarFactura(factura.id);
          setFacturas((prev) => prev.filter((f) => f.id !== factura.id));
          onAgregarToast("Factura eliminada", "success");
        } catch (error) {
          onAgregarToast(error.message, "error");
        }
      }
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Facturación</h2>
          <p className="page-subtitle">Facturas de proveedores y su estado de pago</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
          📥 Importar PDF
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">A pagar</span>
            <span className="kpi-icon kpi-icon-accent">💸</span>
          </div>
          <div className="kpi-value">{formatearMoneda(resumen.totalAPagar)}</div>
          <p className="kpi-footer">{resumen.cantidadPendientes} factura(s) sin pagar</p>
        </div>
        <div className={`kpi-card ${resumen.cantidadVencidas > 0 ? "kpi-card-alert" : ""}`}>
          <div className="kpi-header">
            <span className="kpi-label">Vencidas</span>
            <span className="kpi-icon kpi-icon-danger">⏰</span>
          </div>
          <div className={`kpi-value ${resumen.cantidadVencidas > 0 ? "text-danger" : ""}`}>
            {resumen.cantidadVencidas}
          </div>
          <p className="kpi-footer">con fecha de vencimiento pasada</p>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="select"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ width: "auto", minWidth: 180 }}
        >
          <option value="Todas">Todas las facturas</option>
          <option value="Pendiente">Pendientes</option>
          <option value="Pagado">Pagadas</option>
          <option value="Vencido">Vencidas</option>
        </select>
      </div>

      {cargando ? (
        <div className="table-container">
          <div className="skeleton" style={{ height: 160, margin: "var(--space-4)" }} />
        </div>
      ) : facturasFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <p className="empty-state-title">
            {facturas.length === 0 ? "No hay facturas cargadas" : "No hay facturas con ese estado"}
          </p>
          <p className="empty-state-text">Importá una factura en PDF para empezar.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Proveedor</th>
                <th className="hide-mobile">Emisión</th>
                <th>Vencimiento</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "center" }}>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((f) => (
                <tr key={f.id}>
                  <td data-label="Comprobante">
                    <span className="td-sku" style={{ whiteSpace: "nowrap" }}>{f.numeroComprobante || "-"}</span>
                  </td>
                  <td data-label="Proveedor">{f.proveedorEmisor || "-"}</td>
                  <td data-label="Emisión" className="hide-mobile" style={{ whiteSpace: "nowrap" }}>
                    {formatearFecha(f.fechaEmision)}
                  </td>
                  <td
                    data-label="Vencimiento"
                    style={{ whiteSpace: "nowrap", color: esVencida(f) ? "var(--danger)" : undefined }}
                  >
                    {formatearFecha(f.fechaVencimiento)}
                  </td>
                  <td data-label="Total" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <strong>{formatearMoneda(f.total)}</strong>
                  </td>
                  <td data-label="Estado" style={{ textAlign: "center" }}>
                    <select
                      aria-label="Estado de la factura"
                      className={`select badge ${ESTADO_BADGE[f.estado] ?? "badge-neutral"}`}
                      value={f.estado}
                      onChange={(e) => handleCambiarEstado(f.id, e.target.value)}
                      style={{ width: "auto", padding: "4px 10px", fontSize: "var(--font-xs)" }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Vencido">Vencido</option>
                    </select>
                  </td>
                  <td data-label="Acciones" style={{ textAlign: "right" }}>
                    <div className="td-actions" style={{ justifyContent: "flex-end" }}>
                      {f.rutaArchivo && (
                        <a
                          href={urlArchivoFactura(f.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          title="Ver PDF original"
                        >
                          📄
                        </a>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEliminar(f)}
                        title="Eliminar factura"
                        style={{ color: "var(--danger)" }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <FacturaUploadModal
          onClose={() => setModalAbierto(false)}
          onSuccess={() => {
            setModalAbierto(false);
            cargarFacturas();
            onAgregarToast("Factura guardada", "success");
          }}
          onAgregarToast={onAgregarToast}
        />
      )}
    </div>
  );
}
