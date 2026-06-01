// src/components/InventarioList.jsx
import { useState, useEffect } from "react";
import { obtenerProductos, eliminarProducto, obtenerProveedores } from "../services/api";
import { StockBadge } from "./StockBadge";
import { ImportadorExcel } from "./ImportadorExcel";
import { AumentoMasivoModal } from "./AumentoMasivoModal";

export function InventarioList({ onEditar, onAgregarToast, onConfirmar, recargar }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [proveedoresUnicos, setProveedoresUnicos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState("Todos");
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [soloConStock, setSoloConStock] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAumentoMasivo, setShowAumentoMasivo] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const ITEMS_POR_PAGINA = 50;

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      cargarProductos();
    }, 300); // 300ms delay to avoid spamming backend on search

    return () => clearTimeout(delayDebounceFn);
  }, [recargar, paginaActual, busqueda, proveedorFiltro, soloStockBajo, soloConStock]);

  const cargarProveedores = async () => {
    const data = await obtenerProveedores();
    setProveedoresUnicos(data);
  };

  const cargarProductos = async () => {
    setCargando(true);
    const data = await obtenerProductos({
      busqueda,
      proveedor: proveedorFiltro,
      soloStockBajo,
      soloConStock,
      page: paginaActual,
      pageSize: ITEMS_POR_PAGINA
    });
    setProductos(data.items || []);
    setTotalProductos(data.total || 0);
    setTotalPaginas(data.totalPages || 1);
    setCargando(false);
  };

  const handleEliminar = (producto) => {
    onConfirmar(
      `Se eliminará "${producto.nombre}" (SKU: ${producto.sku}) del inventario. Esta acción no se puede deshacer.`,
      async () => {
        const ok = await eliminarProducto(producto.id);
        if (ok) {
          onAgregarToast("Producto eliminado correctamente", "success");
          cargarProductos();
        } else {
          onAgregarToast("Error al eliminar el producto", "error");
        }
      }
    );
  };

  // Reset page when filters change
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, proveedorFiltro, soloStockBajo, soloConStock]);

  const productosPaginados = productos; // Already paginated from server

  return (
    <div className="inventario-list" style={{ animation: "fadeInUp 400ms var(--ease-out)" }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventario</h2>
          <p className="page-subtitle">
            {totalProductos} artículos en total
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowAumentoMasivo(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            📈 Aumento Masivo
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowImportModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            📥 Importar Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, SKU o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          id="provider-filter"
          className="select"
          style={{ minWidth: 220, flexShrink: 0 }}
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
        >
          <option value="Todos">📂 Todos los proveedores</option>
          {proveedoresUnicos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label
          className={`filter-chip ${soloStockBajo ? "active" : ""}`}
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={soloStockBajo}
            onChange={(e) => setSoloStockBajo(e.target.checked)}
            style={{ display: "none" }}
          />
          ⚠️ Solo stock bajo
        </label>

        <label
          className={`filter-chip ${soloConStock ? "active" : ""}`}
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={soloConStock}
            onChange={(e) => setSoloConStock(e.target.checked)}
            style={{ display: "none" }}
          />
          ✅ Solo con stock
        </label>
      </div>

      {/* Loading Skeleton */}
      {cargando && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Artículo</th>
                <th>Proveedor</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i}>
                  <td><div className="skeleton" style={{ width: 70, height: 20 }} /></td>
                  <td><div className="skeleton" style={{ width: 160, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 80, height: 22 }} /></td>
                  <td><div className="skeleton" style={{ width: 80, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 40, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 60, height: 22 }} /></td>
                  <td><div className="skeleton" style={{ width: 100, height: 28 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!cargando && productosFiltrados.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            {busqueda || proveedorFiltro !== "Todos" || soloStockBajo ? "🔍" : "📦"}
          </div>
          <p className="empty-state-title">
            {busqueda || proveedorFiltro !== "Todos" || soloStockBajo
              ? "No se encontraron resultados"
              : "El inventario está vacío"}
          </p>
          <p className="empty-state-text">
            {busqueda || proveedorFiltro !== "Todos" || soloStockBajo
              ? "Probá con otros filtros o términos de búsqueda."
              : "Empezá cargando tu primer producto."}
          </p>
        </div>
      )}

      {/* Data Table */}
      {!cargando && productosFiltrados.length > 0 && (
        <div className="table-container">
          <table className="table" id="inventory-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Artículo</th>
                <th className="hide-mobile">Proveedor</th>
                <th>Precio Pub.</th>
                <th style={{ textAlign: "center" }}>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosPaginados.map((producto, index) => (
                <tr
                  key={producto.id}
                  style={{
                    animation: `fadeInUp 300ms var(--ease-out) backwards`,
                  }}
                >
                  <td data-label="SKU">
                    <span className="td-sku">{producto.sku}</span>
                  </td>
                  <td data-label="Artículo">
                    <div className="td-name">{producto.nombre}</div>
                    {(producto.proveedor || producto.marca || producto.modelo) && (
                      <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                        {[producto.proveedor, producto.marca, producto.modelo].filter(Boolean).join(" - ")}
                      </div>
                    )}
                  </td>
                  <td className="hide-mobile" data-label="Proveedor">
                    <span className="badge badge-neutral">{producto.proveedor || "Sin Proveedor"}</span>
                  </td>
                  <td data-label="Precio Pub.">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="td-precio" style={{ fontWeight: "bold" }}>
                        ${producto.precio?.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      {producto.precioLista > 0 && (
                        <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                          Costo: ${producto.precioLista.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Stock" style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: producto.stockActual <= 0 ? "var(--danger)" : "inherit",
                      }}
                    >
                      {producto.stockActual}
                    </span>
                  </td>
                  <td data-label="Estado">
                    <StockBadge
                      stockActual={producto.stockActual}
                      stockMinimo={producto.stockMinimo}
                    />
                  </td>
                  <td data-label="Acciones">
                    <div className="td-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEditar(producto)}
                        title="Editar producto"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEliminar(producto)}
                        title="Eliminar producto"
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

          {/* Controles de paginación */}
          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4)", borderTop: "1px solid var(--border-secondary)", background: "var(--bg-card)", borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {showImportModal && (
        <ImportadorExcel 
          onCerrar={() => setShowImportModal(false)} 
          onCompletado={() => {
            setShowImportModal(false);
            cargarProductos();
          }}
          onAgregarToast={onAgregarToast}
        />
      )}

      {showAumentoMasivo && (
        <AumentoMasivoModal 
          onCerrar={() => setShowAumentoMasivo(false)} 
          onCompletado={() => {
            setShowAumentoMasivo(false);
            cargarProductos();
          }}
          onAgregarToast={onAgregarToast}
        />
      )}
    </div>
  );
}
