// src/components/ImportadorExcel.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { importarProductosJson } from "../services/api";
import "./ImportadorExcel.css";

export function ImportadorExcel({ onCerrar, onCompletado, onAgregarToast }) {
  const [archivo, setArchivo] = useState(null);
  const [datosExcel, setDatosExcel] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [hojas, setHojas] = useState([]);
  const [hojaSeleccionada, setHojaSeleccionada] = useState("");
  const [mapeo, setMapeo] = useState({
    sku: "",
    nombre: "",
    precioLista: "",
    precioListaDolar: "",
    stock: "",
    proveedor: "",
    marca: "",
    modelo: "",
  });
  const [valoresPorDefecto, setValoresPorDefecto] = useState({
    proveedor: "",
    marca: ""
  });
  const [cotizacionDolar, setCotizacionDolar] = useState(1000);
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
        setWorkbook(wb);
        setHojas(wb.SheetNames);
        
        const wsname = wb.SheetNames[0];
        setHojaSeleccionada(wsname);
        
        procesarHoja(wb, wsname);
        
        setPaso(2);
      } catch (error) {
        console.error(error);
        onAgregarToast("Error al leer el archivo Excel.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const procesarHoja = (wb, wsname) => {
    const ws = wb.Sheets[wsname];
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    if (data.length < 2) {
      onAgregarToast(`La hoja "${wsname}" parece estar vacía o no tiene suficientes datos.`, "warning");
      setDatosExcel([]);
      setColumnas([]);
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
    const cleanHeaders = headers.filter(h => h !== "");
    setColumnas(cleanHeaders);
    
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
    autoMapearColumnas(cleanHeaders);
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
    nuevoMapeo.modelo = findMatch(["modelo", "aplicacion", "para moto"]);

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
        
        // Helper para limpiar números
        const parsearPrecio = (valor) => {
          if (typeof valor === 'number') return valor;
          if (!valor) return 0;
          const str = valor.toString().replace('$', '').trim();
          const clean = str.replace(/\./g, '').replace(',', '.');
          return parseFloat(clean) || 0;
        };

        let precioPesos = parsearPrecio(fila[mapeo.precioLista]);
        let precioDolares = mapeo.precioListaDolar ? parsearPrecio(fila[mapeo.precioListaDolar]) : 0;
        
        // Si hay precio en dólares, lo usamos convirtiéndolo a pesos
        let precioNum = precioDolares > 0 ? (precioDolares * cotizacionDolar) : precioPesos;

        // Calcular precio al público
        const precioPublico = precioNum + (precioNum * (porcentajeGanancia / 100));

        return {
          sku: mapeo.sku ? (fila[mapeo.sku]?.toString() || "") : "",
          nombre: fila[mapeo.nombre]?.toString() || "",
          precioLista: precioNum,
          precioPublico: precioPublico,
          stock: mapeo.stock ? (parseInt(fila[mapeo.stock]) || 0) : 0,
          proveedor: mapeo.proveedor ? (fila[mapeo.proveedor]?.toString() || "") : valoresPorDefecto.proveedor,
          marca: mapeo.marca ? (fila[mapeo.marca]?.toString() || "") : valoresPorDefecto.marca,
          modelo: mapeo.modelo ? (fila[mapeo.modelo]?.toString() || "") : "",
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
      onAgregarToast(error.message || "Hubo un error al guardar los productos en la base de datos.", "error");
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

              {hojas.length > 1 && (
                <div className="form-group sheet-selector" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <label style={{ fontWeight: '500', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>📄 Pestaña del Excel a importar</label>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--space-3) 0' }}>El archivo tiene varias hojas. Seleccioná la que contiene la lista de repuestos de esta marca/proveedor.</p>
                  <select
                    className="select"
                    value={hojaSeleccionada}
                    onChange={(e) => {
                      setHojaSeleccionada(e.target.value);
                      procesarHoja(workbook, e.target.value);
                    }}
                  >
                    {hojas.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              <div className="mapping-grid">
                {[
                  { key: "nombre", label: "Nombre / Descripción *", req: true },
                  { key: "precioLista", label: "Precio de Lista (en Pesos) *", req: true },
                  { key: "precioListaDolar", label: "Precio de Lista (en Dólares) - Opcional", req: false },
                  { key: "sku", label: "Código / Artículo", req: false },
                  { key: "stock", label: "Stock", req: false },
                  { key: "proveedor", label: "Proveedor", req: false },
                  { key: "marca", label: "Marca", req: false },
                  { key: "modelo", label: "Modelo / Aplicación", req: false },
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
                <h4 style={{ margin: "0 0 var(--space-3) 0" }}>Variables de Precio</h4>
                
                {mapeo.precioListaDolar && (
                  <div style={{ marginBottom: "var(--space-4)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-primary)" }}>
                    <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
                      Cotización del Dólar (para convertir la columna importada)
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: "bold" }}>$</span>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ width: "120px" }}
                        value={cotizacionDolar}
                        onChange={(e) => setCotizacionDolar(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}

                <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                  Ganancia: ¿Qué porcentaje le sumamos al Costo para calcular el Precio al Público?
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

              <div className="markup-section" style={{ marginTop: "var(--space-4)", padding: "var(--space-4)", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-secondary)" }}>
                <h4 style={{ margin: "0 0 var(--space-3) 0" }}>Valores Manuales (Opcional)</h4>
                <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                  Si el Excel no tiene columna de Proveedor o Marca, podés ingresarlos acá y se aplicarán a toda la lista.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Proveedor (ej: Tercom)" 
                    value={valoresPorDefecto.proveedor}
                    onChange={(e) => setValoresPorDefecto(prev => ({ ...prev, proveedor: e.target.value }))}
                  />
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Marca" 
                    value={valoresPorDefecto.marca}
                    onChange={(e) => setValoresPorDefecto(prev => ({ ...prev, marca: e.target.value }))}
                  />
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
