import React, { useState } from 'react';
import { aumentoMasivo } from '../services/api';
import './AumentoMasivoModal.css';

export function AumentoMasivoModal({ onCerrar, onCompletado, onAgregarToast }) {
  const [form, setForm] = useState({
    porcentaje: "",
    proveedor: "",
    marca: "",
    categoria: ""
  });
  const [procesando, setProcesando] = useState(false);

  const CATEGORIAS = ["Motor", "Transmisión", "Frenos", "Eléctrico", "Suspensión", "Accesorios", "Otros", "Todas"];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAplicar = async () => {
    if (!form.porcentaje || isNaN(form.porcentaje) || parseFloat(form.porcentaje) === 0) {
      onAgregarToast("Tenés que ingresar un porcentaje válido distinto de 0.", "error");
      return;
    }

    if (!window.confirm(`¿Seguro que querés aumentar un ${form.porcentaje}% a los productos que coincidan con los filtros? Esta acción no se puede deshacer.`)) {
      return;
    }

    setProcesando(true);
    try {
      const dto = {
        porcentaje: parseFloat(form.porcentaje),
        proveedor: form.proveedor,
        marca: form.marca,
        categoria: form.categoria === "Todas" ? "" : form.categoria
      };

      const res = await aumentoMasivo(dto);
      onAgregarToast(res.message, "success");
      onCompletado();
    } catch (error) {
      onAgregarToast(error.message || "Error al aplicar el aumento.", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content import-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">📈 Aumento Masivo de Precios</h2>
          <button className="btn btn-ghost" onClick={onCerrar} disabled={procesando}>❌</button>
        </div>

        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Aplicá un aumento porcentual a todos los repuestos. Podés filtrar para aplicar el aumento solo a cierta marca o proveedor.
          </p>

          <div className="form-group">
            <label className="label">Porcentaje de aumento (%) *</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                name="porcentaje"
                type="number"
                step="0.01"
                className="input"
                placeholder="Ej: 15"
                value={form.porcentaje}
                onChange={handleChange}
              />
              <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>%</span>
            </div>
          </div>

          <div className="markup-section" style={{ padding: "var(--space-4)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-secondary)", marginTop: "var(--space-4)" }}>
            <h4 style={{ margin: "0 0 var(--space-3) 0", color: "var(--text-primary)" }}>Filtros (Opcional)</h4>
            <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>Si dejás todo vacío, el aumento se aplicará a TODOS los productos del sistema.</p>

            <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
              <label className="label">Proveedor</label>
              <input
                name="proveedor"
                type="text"
                className="input"
                placeholder="Ej: Tercom"
                value={form.proveedor}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
              <label className="label">Marca</label>
              <input
                name="marca"
                type="text"
                className="input"
                placeholder="Ej: Honda"
                value={form.marca}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "0" }}>
              <label className="label">Categoría</label>
              <select
                name="categoria"
                className="select"
                value={form.categoria}
                onChange={handleChange}
              >
                <option value="">Todas</option>
                {CATEGORIAS.filter(c => c !== "Todas").map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: "var(--space-5)" }}>
          <button className="btn btn-ghost" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAplicar}
            disabled={procesando || !form.porcentaje}
          >
            {procesando ? "Aplicando..." : "Aplicar Aumento"}
          </button>
        </div>
      </div>
    </div>
  );
}
