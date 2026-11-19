import { useState, useEffect } from "react";
import { apiFacturacion } from "../services/apiFacturacion";
import { FacturaUploadModal } from "./FacturaUploadModal";

export function FacturacionList({ onAgregarToast }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      setCargando(true);
      const data = await apiFacturacion.getAll();
      setFacturas(data);
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleChangeEstado = async (id, nuevoEstado) => {
    try {
      await apiFacturacion.updateEstado(id, nuevoEstado);
      onAgregarToast("Estado actualizado", "success");
      setFacturas((prev) =>
        prev.map((f) => (f.id === id ? { ...f, estado: nuevoEstado } : f))
      );
    } catch (error) {
      onAgregarToast(error.message, "error");
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta factura?")) return;
    try {
      await apiFacturacion.delete(id);
      onAgregarToast("Factura eliminada", "success");
      setFacturas((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      onAgregarToast(error.message, "error");
    }
  };

  const formateaFecha = (fechaStr) => {
    if (!fechaStr) return "-";
    return new Date(fechaStr).toLocaleDateString("es-AR");
  };

  const formatCurrency = (monto) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(monto || 0);
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "Pagado":
        return "badge-success";
      case "Vencido":
        return "badge-danger";
      default:
        return "badge-warning";
    }
  };

  return (
    <div className="card fade-in">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="card-title">Facturación</h2>
        <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
          ➕ Importar PDF
        </button>
      </div>

      {cargando ? (
        <p>Cargando facturas...</p>
      ) : facturas.length === 0 ? (
        <div className="empty-state">
          <h3>No hay facturas cargadas</h3>
          <p>Comienza importando un archivo PDF.</p>
        </div>
      ) : (
        <div className="table-responsive" style={{ marginTop: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Proveedor / Emisor</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td>{f.numeroComprobante || "-"}</td>
                  <td>{f.proveedorEmisor || "-"}</td>
                  <td>{formateaFecha(f.fechaEmision)}</td>
                  <td>{formateaFecha(f.fechaVencimiento)}</td>
                  <td><strong>{formatCurrency(f.total)}</strong></td>
                  <td>
                    <select
                      value={f.estado}
                      onChange={(e) => handleChangeEstado(f.id, e.target.value)}
                      className={`form-input badge ${getEstadoClass(f.estado)}`}
                      style={{ padding: "0.2rem 0.5rem", height: "auto", fontSize: "0.85rem", width: "110px", appearance: "none" }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Vencido">Vencido</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {f.rutaArchivo && (
                        <a 
                          href={`http://localhost:5190/uploads/facturas/${f.rutaArchivo}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-secondary" 
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}
                          title="Ver Archivo Original"
                        >
                          📄
                        </a>
                      )}
                      <button
                        onClick={() => handleEliminar(f.id)}
                        className="btn btn-danger"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}
                        title="Eliminar"
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
            onAgregarToast("Factura importada con éxito", "success");
          }}
          onAgregarToast={onAgregarToast}
        />
      )}
    </div>
  );
}
