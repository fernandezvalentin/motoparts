// src/components/ImportadorExcel.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { importarProductosJson } from "../services/api";
import "./ImportadorExcel.css";

export function ImportadorExcel({ onCerrar, onCompletado, onAgregarToast }) {
  const [archivo, setArchivo] = useState(null);
  const [datosExcel, setDatosExcel] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [mapeo, setMapeo] = useState({
    sku: "",
    nombre: "",
    precioLista: "",
    stock: "",
    proveedor: "",
    marca: "",
  });
  const [porcentajeGanancia, setPorcentajeGanancia] = useState(40);
  const [paso, setPaso] = useState(1); // 1: Subir, 2: Mapear, 3: Procesando

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convertir a JSON
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length < 2) {
          onAgregarToast("El archivo parece estar vacío o no tiene suficientes datos.", "error");
          return;
        }

        // Buscar la fila que tenga más columnas de texto (probablemente los encabezados)
        // Revisamos las primeras 15 filas
        let headerRowIndex = 0;
        let maxCols = 0;
        
        for (let i = 0; i < Math.min(data.length, 15); i++) {
          const row = data[i] || [];
          const colsCount = row.filter(cell => cell && cell.toString().trim() !== "").length;
          if (colsCount > maxCols) {
            maxCols = colsCount;
            headerRowIndex = i;
          }
        }

        const headers = (data[headerRowIndex] || []).map(h => h ? h.toString().trim() : "");
        setColumnas(headers.filter(h => h !== ""));
        
        // Convertir filas a objetos usando los headers
        const rows = data.slice(headerRowIndex + 1).map(row => {
          let obj = {};
          headers.forEach((h, i) => {
            if (h) obj[h] = row[i];
          });
          return obj;
        });

        // Filtrar filas vacías
        const validRows = rows.filter(r => Object.keys(r).length > 0);
        
        setDatosExcel(validRows);
        
        // Intentar autodetectar columnas comunes
        autoMapearColumnas(headers);
        
        setPaso(2);
      } catch (error) {
        console.error(error);
        onAgregarToast("Error al leer el archivo Excel.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapearColumnas = (headers) => {
    const nuevoMapeo = { ...mapeo };
    const hLower = headers.map(h => h.toLowerCase());

    const findMatch = (keywords) => {
      for (let kw of keywords) {
        const idx = hLower.findIndex(h => h.includes(kw));
        if (idx !== -1) return headers[idx];
      }
      return "";
    };

    nuevoMapeo.sku = findMatch(["codigo", "código", "sku", "id", "ref"]);
    nuevoMapeo.nombre = findMatch(["nombre", "descripci", "articulo", "artículo", "producto"]);
    nuevoMapeo.precioLista = findMatch(["precio", "costo", "importe", "valor"]);
    nuevoMapeo.stock = findMatch(["stock", "cant", "disponible"]);
    nuevoMapeo.proveedor = findMatch(["proveedor", "distribuidor"]);
    nuevoMapeo.marca = findMatch(["marca", "fabricante"]);

    setMapeo(nuevoMapeo);
  };

  const handleMapeoChange = (campo, valor) => {
    setMapeo(prev => ({ ...prev, [campo]: valor }));
  };

  const handleImportar = async () => {
    if (!mapeo.nombre || !mapeo.precioLista) {
      onAgregarToast("El Nombre y el Precio Lista son obligatorios para importar.", "error");
      return;
    }

    setPaso(3);

    try {
      // Formatear datos al DTO que espera el backend
      const productosAImportar = datosExcel.map(fila => {
        // Limpiar el precio (si viene con $, comas, etc)
        let precioVal = fila[mapeo.precioLista];
        let precioNum = 0;
        if (typeof precioVal === 'number') {
          precioNum = precioVal;
        } else if (precioVal) {
          precioNum = parseFloat(precioVal.toString().replace('$', '').replace(',', '.').trim()) || 0;
        }
        
        // Calcular precio al público
        const precioPublico = precioNum + (precioNum * (porcentajeGanancia / 100));

        return {
          sku: mapeo.sku ? (fila[mapeo.sku]?.toString() || "") : "",
          nombre: fila[mapeo.nombre]?.toString() || "",
          precioLista: precioNum,
          precioPublico: precioPublico,
          stock: mapeo.stock ? (parseInt(fila[mapeo.stock]) || 0) : 0,
          proveedor: mapeo.proveedor ? (fila[mapeo.proveedor]?.toString() || "") : "",
          marca: mapeo.marca ? (fila[mapeo.marca]?.toString() || "") : "",
        };
      }).filter(p => p.nombre && p.precioLista > 0);

      if (productosAImportar.length === 0) {
        onAgregarToast("No se encontraron productos válidos para importar.", "error");
        setPaso(2);
        return;
      }

      const res = await importarProductosJson(productosAImportar);
      onAgregarToast(`¡Importación exitosa! Se actualizaron ${res.actualizados} y se crearon ${res.creados} productos.`, "success");
      onCompletado();
    } catch (error) {
      onAgregarToast("Hubo un error al guardar los productos en la base de datos.", "error");
      setPaso(2);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content import-modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">📥 Importar Lista de Precios</h2>
          <button className="btn btn-ghost" onClick={onCerrar}>❌</button>
        </div>

        <div className="modal-body">
          {paso === 1 && (
            <div className="import-step upload-step">
              <p style={{ marginBottom: "var(--space-4)", color: "var(--text-secondary)" }}>
                Subí el archivo de Excel (.xlsx, .xls, .csv) que te mandó el proveedor. 
                El sistema detectará las columnas para que elijas cuál es el precio, el código, etc.
              </p>
              
              <div className="file-drop-area">
                <span className="file-icon">📊</span>
                <span className="file-msg">Arrastrá tu archivo acá o hacé clic para buscarlo</span>
                <input 
                  className="file-input" 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="import-step map-step">
              <div className="alert alert-info" style={{ marginBottom: "var(--space-4)", padding: "var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--accent)" }}>
                <strong>¡Archivo cargado! ({datosExcel.length} filas)</strong>
                <p style={{ margin: 0, fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
                  Revisá que cada campo de Moto Parts coincida con la columna correcta de tu Excel.
                </p>
              </div>

              <div className="mapping-grid">
                {[
                  { key: "nombre", label: "Nombre / Descripción *", req: true },
                  { key: "precioLista", label: "Precio de Lista (Costo) *", req: true },
                  { key: "sku", label: "Código / Artículo", req: false },
                  { key: "stock", label: "Stock", req: false },
                  { key: "proveedor", label: "Proveedor", req: false },
                  { key: "marca", label: "Marca", req: false },
                ].map(campo => (
                  <div key={campo.key} className="mapping-row">
                    <label className="mapping-label">
                      {campo.label}
                    </label>
                    <select 
                      className="select mapping-select" 
                      value={mapeo[campo.key]}
                      onChange={(e) => handleMapeoChange(campo.key, e.target.value)}
                    >
                      <option value="">-- Ignorar este dato --</option>
                      {columnas.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="markup-section" style={{ marginTop: "var(--space-6)", padding: "var(--space-4)", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-secondary)" }}>
                <h4 style={{ margin: "0 0 var(--space-3) 0" }}>Ganancia (Precio Público)</h4>
                <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                  ¿Qué porcentaje le sumamos al Precio de Lista para calcular automáticamente el Precio de Venta al público?
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="number" 
                    className="input" 
                    style={{ width: "100px" }}
                    value={porcentajeGanancia}
                    onChange={(e) => setPorcentajeGanancia(parseFloat(e.target.value) || 0)}
                  />
                  <span style={{ fontWeight: "bold" }}>%</span>
                </div>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="import-step processing-step" style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
              <div className="spinner" style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>⏳</div>
              <h3>Importando productos...</h3>
              <p style={{ color: "var(--text-muted)" }}>Esto puede demorar unos segundos dependiendo del tamaño de la lista.</p>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: "var(--space-6)" }}>
          {paso === 2 && (
            <>
              <button className="btn btn-ghost" onClick={() => setPaso(1)}>
                Volver
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: "var(--success)" }}
                onClick={handleImportar}
              >
                Comenzar Importación
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
