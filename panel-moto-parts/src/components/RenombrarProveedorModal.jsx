import React, { useState, useEffect } from 'react';
import { obtenerProveedores, renombrarProveedor } from '../services/api';

export function RenombrarProveedorModal({ onCerrar, onCompletado, onAgregarToast }) {
  const [form, setForm] = useState({
    viejo: "",
    nuevo: ""
  });
  const [procesando, setProcesando] = useState(false);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    obtenerProveedores()
      .then(data => {
        if (data && Array.isArray(data)) {
          setProveedores(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAplicar = async () => {
    if (!form.viejo || !form.nuevo) {
      onAgregarToast("Tenés que seleccionar el proveedor viejo y escribir el nuevo nombre.", "error");
      return;
    }

    if (form.viejo === form.nuevo) {
      onAgregarToast("El nuevo nombre tiene que ser distinto al viejo.", "error");
      return;
    }

    if (!window.confirm(`¿Seguro que querés renombrar todos los repuestos de "${form.viejo}" a "${form.nuevo}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setProcesando(true);
    try {
      const res = await renombrarProveedor(form.viejo, form.nuevo);
      onAgregarToast(res.message, "success");
      onCompletado();
    } catch (error) {
      onAgregarToast(error.message || "Error al renombrar el proveedor.", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content import-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">✏️ Renombrar Proveedor</h2>
          <button className="btn btn-ghost" onClick={onCerrar} disabled={procesando}>❌</button>
        </div>

        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Si importaste un Excel y te quedaron repuestos con un nombre de proveedor viejo (ej: "FAR MOTOPARTES") y querés pasarlos a uno nuevo (ej: "FAR"), usá esta herramienta.
          </p>

          <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
            <label className="label">Proveedor Viejo (el que querés eliminar)</label>
            <div className="select-wrapper">
              <select
                className="select"
                name="viejo"
                value={form.viejo}
                onChange={handleChange}
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {proveedores.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Nombre Nuevo</label>
            <input
              name="nuevo"
              type="text"
              className="input"
              placeholder="Ej: FAR"
              value={form.nuevo}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: "var(--space-5)" }}>
          <button className="btn btn-ghost" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAplicar}
            disabled={procesando || !form.viejo || !form.nuevo}
          >
            {procesando ? "Renombrando..." : "Renombrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
