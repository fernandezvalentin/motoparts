"use client";

import { useRef, useState } from "react";
import {
  MAX_MB_FACTURA,
  crearFactura,
  descartarPdfFactura,
  extraerDatosFactura,
  subirPdfFactura,
} from "@/lib/api";
import "./ImportadorExcel.css";

const DATOS_VACIOS = {
  numeroComprobante: "",
  proveedorEmisor: "",
  fechaEmision: "",
  fechaVencimiento: "",
  total: "",
  estado: "Pendiente",
};

export function FacturaUploadModal({ onClose, onSuccess, onAgregarToast }) {
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [rutaSubida, setRutaSubida] = useState(null);
  const [sinTexto, setSinTexto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(1); // 1: elegir PDF, 2: revisar datos
  const [datos, setDatos] = useState(DATOS_VACIOS);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.type !== "application/pdf") {
      onAgregarToast("El archivo debe ser un PDF.", "warning");
      e.target.value = "";
      return;
    }
    if (archivo.size > MAX_MB_FACTURA * 1024 * 1024) {
      onAgregarToast(`El PDF no puede superar los ${MAX_MB_FACTURA} MB.`, "warning");
      e.target.value = "";
      return;
    }
    setArchivoPdf(archivo);
  };

  const handleExtraerDatos = async () => {
    if (!archivoPdf) return;
    setCargando(true);
    let ruta = rutaSubida;
    try {
      if (!ruta) {
        ruta = await subirPdfFactura(archivoPdf);
        setRutaSubida(ruta);
      }
      const extraidos = await extraerDatosFactura(ruta);
      setDatos({
        numeroComprobante: extraidos.numeroComprobante || "",
        proveedorEmisor: extraidos.proveedorEmisor || "",
        fechaEmision: extraidos.fechaEmision || "",
        fechaVencimiento: extraidos.fechaVencimiento || "",
        total: extraidos.total ? String(extraidos.total) : "",
        estado: "Pendiente",
      });
      setSinTexto(Boolean(extraidos.sinTexto));
      setPaso(2);
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async () => {
    const total = Number(datos.total || 0);
    if (!Number.isFinite(total) || total < 0) {
      onAgregarToast("Ingresá un total válido.", "warning");
      return;
    }
    setCargando(true);
    try {
      await crearFactura({ ...datos, total, rutaArchivo: rutaSubida });
      onSuccess();
    } catch (error) {
      onAgregarToast(error.message, "error");
      setCargando(false);
    }
  };

  // Al cancelar se borra el PDF que ya se había subido y no se llegó a guardar
  const handleCancelar = async () => {
    if (cargando) return;
    if (rutaSubida) descartarPdfFactura(rutaSubida).catch(() => {});
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatos((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content import-modal" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <h2 className="modal-title">{paso === 1 ? "📄 Importar Factura (PDF)" : "📝 Revisar Datos"}</h2>
          <button className="btn btn-ghost" onClick={handleCancelar} disabled={cargando} aria-label="Cerrar">
            ❌
          </button>
        </div>

        <div className="modal-body">
          {paso === 1 && (
            <>
              <p style={{ marginBottom: "var(--space-4)", color: "var(--text-secondary)" }}>
                Subí la factura del proveedor en PDF. El sistema intentará leer el número, el proveedor, las
                fechas y el total para que solo tengas que revisarlos.
              </p>
              <div className="file-drop-area">
                <span className="file-icon">📄</span>
                <span className="file-msg">
                  {archivoPdf ? archivoPdf.name : "Arrastrá el PDF acá o hacé clic para buscarlo"}
                </span>
                <input
                  ref={inputRef}
                  className="file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={cargando}
                />
              </div>
            </>
          )}

          {paso === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
                {sinTexto
                  ? "⚠️ El PDF parece ser una imagen escaneada y no se pudo leer texto. Completá los datos a mano."
                  : "Revisá y corregí los datos que el sistema logró leer antes de guardar."}
              </p>

              <div className="form-group">
                <label className="label" htmlFor="proveedorEmisor">Proveedor / Emisor</label>
                <input
                  id="proveedorEmisor"
                  name="proveedorEmisor"
                  type="text"
                  className="input"
                  value={datos.proveedorEmisor}
                  onChange={handleChange}
                  placeholder="Ej: FAR Motopartes"
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="numeroComprobante">N° Comprobante</label>
                <input
                  id="numeroComprobante"
                  name="numeroComprobante"
                  type="text"
                  className="input"
                  value={datos.numeroComprobante}
                  onChange={handleChange}
                  placeholder="00001-00001234"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="label" htmlFor="fechaEmision">Fecha Emisión</label>
                  <input
                    id="fechaEmision"
                    name="fechaEmision"
                    type="date"
                    className="input"
                    value={datos.fechaEmision}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="fechaVencimiento">Fecha Vencimiento</label>
                  <input
                    id="fechaVencimiento"
                    name="fechaVencimiento"
                    type="date"
                    className="input"
                    value={datos.fechaVencimiento}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="label" htmlFor="total">Total ($)</label>
                  <input
                    id="total"
                    name="total"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={datos.total}
                    onChange={handleChange}
                    placeholder="0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="estado">Estado</label>
                  <select id="estado" name="estado" className="select" value={datos.estado} onChange={handleChange}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: "var(--space-6)" }}>
          <button className="btn btn-ghost" onClick={handleCancelar} disabled={cargando}>
            Cancelar
          </button>
          {paso === 1 ? (
            <button className="btn btn-primary" onClick={handleExtraerDatos} disabled={!archivoPdf || cargando}>
              {cargando ? "Leyendo PDF..." : "Siguiente"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleGuardar} disabled={cargando}>
              {cargando ? "Guardando..." : "Confirmar y Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
