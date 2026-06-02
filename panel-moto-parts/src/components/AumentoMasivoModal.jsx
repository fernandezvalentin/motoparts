import React, { useState, useEffect } from 'react';
import { aumentoMasivo, obtenerProveedores } from '../services/api';
import './AumentoMasivoModal.css';

export function AumentoMasivoModal({ onCerrar, onCompletado, onAgregarToast }) {
  const [form, setForm] = useState({
    tipoOperacion: "Ambos",
    porcentaje: "",
    proveedor: "Todos",
    marca: ""
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
    if (!form.porcentaje || isNaN(form.porcentaje)) {
      onAgregarToast("Tenés que ingresar un porcentaje válido.", "error");
      return;
    }

    const porcentajeFloat = parseFloat(form.porcentaje);

    if (porcentajeFloat === 0) {
      onAgregarToast("El porcentaje no puede ser 0.", "error");
      return;
    }

    let operacionTexto = "modificar";
    if (form.tipoOperacion === "Ambos") operacionTexto = "modificar el costo y el precio público de";
    if (form.tipoOperacion === "Costo") operacionTexto = "modificar SOLO EL COSTO de";
    if (form.tipoOperacion === "Publico") operacionTexto = "modificar SOLO EL PRECIO PÚBLICO de";
    if (form.tipoOperacion === "FijarMargen") operacionTexto = "FIJAR UN MARGEN DE GANANCIA del " + form.porcentaje + "% sobre el costo de";

    let advertencia = `¿Seguro que querés ${operacionTexto} todos los productos filtrados?`;
    if (form.tipoOperacion !== "FijarMargen") {
      advertencia = `¿Seguro que querés aplicar un ${porcentajeFloat > 0 ? "AUMENTO" : "DESCUENTO"} del ${Math.abs(porcentajeFloat)}% para ${operacionTexto} todos los productos filtrados?`;
    }

    if (!window.confirm(advertencia + " Esta acción no se puede deshacer.")) {
      return;
    }

    setProcesando(true);
    try {
      const dto = {
        tipoOperacion: form.tipoOperacion,
        porcentaje: porcentajeFloat,
        proveedor: form.proveedor === "Todos" ? "" : form.proveedor,
        marca: form.marca
      };

      const res = await aumentoMasivo(dto);
      onAgregarToast(res.message, "success");
      onCompletado();
    } catch (error) {
      onAgregarToast(error.message || "Error al aplicar la operación.", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content import-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">📈 Gestión Avanzada de Precios</h2>
          <button className="btn btn-ghost" onClick={onCerrar} disabled={procesando}>❌</button>
        </div>

        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Aumentá, descontá o fijá márgenes de ganancia. Usá números negativos (ej: -10) para aplicar descuentos.
          </p>

          <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
            <label className="label">Tipo de Operación *</label>
            <div className="select-wrapper">
              <select
                className="select"
                name="tipoOperacion"
                value={form.tipoOperacion}
                onChange={handleChange}
              >
                <option value="Ambos">Aumentar/Descontar Ambos (Costo y Público)</option>
                <option value="Costo">Aumentar/Descontar Solo Costo</option>
                <option value="Publico">Aumentar/Descontar Solo Precio Público</option>
                <option value="FijarMargen">Fijar Margen de Ganancia (Calcula el Público s/ Costo)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">{form.tipoOperacion === "FijarMargen" ? "Margen Deseado (%) *" : "Porcentaje (%) *"}</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                name="porcentaje"
                type="number"
                step="0.01"
                className="input"
                placeholder={form.tipoOperacion === "FijarMargen" ? "Ej: 50" : "Ej: 15 o -10"}
                value={form.porcentaje}
                onChange={handleChange}
              />
              <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>%</span>
            </div>
          </div>

          <div className="markup-section" style={{ padding: "var(--space-4)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-secondary)", marginTop: "var(--space-4)" }}>
            <h4 style={{ margin: "0 0 var(--space-3) 0", color: "var(--text-primary)" }}>Filtros (Opcional)</h4>
            <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>Si dejás todo vacío, aplicará a TODOS los productos.</p>

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

            <div className="form-group">
            <label className="label">Proveedor</label>
            <div className="select-wrapper">
              <select
                className="select"
                name="proveedor"
                value={form.proveedor}
                onChange={handleChange}
              >
                <option value="Todos">-- Todos los proveedores --</option>
                {proveedores.map(prov => (
                  <option key={prov} value={prov}>{prov || "Sin Proveedor"}</option>
                ))}
              </select>
            </div>
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
            {procesando ? "Aplicando..." : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
