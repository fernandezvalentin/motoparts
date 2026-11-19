import { useState, useRef } from "react";
import { apiFacturacion } from "../services/apiFacturacion";

export function FacturaUploadModal({ onClose, onSuccess, onAgregarToast }) {
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(1); // 1: Seleccionar archivo, 2: Revisar datos
  
  const [datosExtraidos, setDatosExtraidos] = useState({
    numeroComprobante: "",
    proveedorEmisor: "",
    fechaEmision: "",
    fechaVencimiento: "",
    total: 0,
    estado: "Pendiente"
  });

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArchivoPdf(e.target.files[0]);
    }
  };

  const handleExtraerDatos = async () => {
    if (!archivoPdf) return onAgregarToast("Selecciona un PDF primero", "warning");

    try {
      setCargando(true);
      const data = await apiFacturacion.uploadPdf(archivoPdf);
      
      // Map extracted data to form
      setDatosExtraidos({
        numeroComprobante: data.numeroComprobante || "",
        proveedorEmisor: data.proveedorEmisor || "",
        fechaEmision: data.fechaEmision ? data.fechaEmision.split('T')[0] : "",
        fechaVencimiento: data.fechaVencimiento ? data.fechaVencimiento.split('T')[0] : "",
        total: data.total || 0,
        estado: data.estado || "Pendiente",
      });
      
      setPaso(2);
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarFactura = async () => {
    try {
      setCargando(true);
      await apiFacturacion.create(datosExtraidos);
      onSuccess();
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatosExtraidos(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in" style={{ maxWidth: '500px' }}>
        <h3 className="modal-title">
          {paso === 1 ? "Importar Factura (PDF)" : "Revisar Datos Extraídos"}
        </h3>
        
        <div className="modal-body">
          {paso === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div 
                style={{ 
                  border: '2px dashed var(--border)', 
                  padding: '2rem', 
                  borderRadius: 'var(--radius)', 
                  width: '100%', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)'
                }}
                onClick={() => fileInputRef.current.click()}
              >
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
                {archivoPdf ? (
                  <strong>{archivoPdf.name}</strong>
                ) : (
                  <span>Haz clic aquí para seleccionar un PDF</span>
                )}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  style={{ display: 'none' }} 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {paso === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Revisa y corrige los datos que el sistema logró extraer antes de guardar.
              </p>
              
              <div className="form-group">
                <label>Proveedor / Emisor</label>
                <input
                  type="text"
                  className="form-input"
                  name="proveedorEmisor"
                  value={datosExtraidos.proveedorEmisor}
                  onChange={handleChange}
                  placeholder="Ej. AFIP / MercadoLibre"
                />
              </div>
              
              <div className="form-group">
                <label>N° Comprobante</label>
                <input
                  type="text"
                  className="form-input"
                  name="numeroComprobante"
                  value={datosExtraidos.numeroComprobante}
                  onChange={handleChange}
                  placeholder="0001-00001234"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Fecha Emisión</label>
                  <input
                    type="date"
                    className="form-input"
                    name="fechaEmision"
                    value={datosExtraidos.fechaEmision}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Vencimiento</label>
                  <input
                    type="date"
                    className="form-input"
                    name="fechaVencimiento"
                    value={datosExtraidos.fechaVencimiento}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    name="total"
                    value={datosExtraidos.total}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Estado Inicial</label>
                  <select 
                    className="form-input"
                    name="estado"
                    value={datosExtraidos.estado}
                    onChange={handleChange}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={cargando}>
            Cancelar
          </button>
          
          {paso === 1 ? (
            <button 
              className="btn btn-primary" 
              onClick={handleExtraerDatos}
              disabled={!archivoPdf || cargando}
            >
              {cargando ? 'Procesando...' : 'Siguiente'}
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={handleGuardarFactura}
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Confirmar y Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
