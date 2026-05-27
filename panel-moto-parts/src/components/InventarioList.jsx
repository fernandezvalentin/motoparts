// src/components/InventarioList.jsx
import { useState, useEffect } from "react";
import { obtenerProductos, eliminarProducto } from "../services/api";
import { StockBadge } from "./StockBadge";

const CATEGORIAS = [
  "Todas",
  "Motor",
  "Frenos",
  "Suspensión",
  "Eléctrico",
  "Transmisión",
  "Carrocería",
  "Filtros",
  "Lubricantes",
  "Accesorios",
  "Otros",
];

export function InventarioList({ onEditar, onAgregarToast, onConfirmar, recargar }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, [recargar]);

  const cargarProductos = async () => {
    setCargando(true);
    const data = await obtenerProductos();
    setProductos(data);
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

  // Filter products locally
  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda =
      busqueda === "" ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.proveedor && p.proveedor.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideCategoria =
      categoriaFiltro === "Todas" || p.categoria === categoriaFiltro;

    const coincideStock = !soloStockBajo || p.stockActual <= p.stockMinimo;

    return coincideBusqueda && coincideCategoria && coincideStock;
  });

  return (
    <div className="inventario-list" style={{ animation: "fadeInUp 400ms var(--ease-out)" }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventario</h2>
          <p className="page-subtitle">
            {productosFiltrados.length} de {productos.length} artículos
          </p>
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
          id="category-filter"
          className="select"
          style={{ maxWidth: 180 }}
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
        >
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "Todas" ? "📂 Todas las categorías" : cat}
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
      </div>

      {/* Loading Skeleton */}
      {cargando && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Artículo</th>
                <th>Categoría</th>
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
            {busqueda || categoriaFiltro !== "Todas" || soloStockBajo ? "🔍" : "📦"}
          </div>
          <p className="empty-state-title">
            {busqueda || categoriaFiltro !== "Todas" || soloStockBajo
              ? "No se encontraron resultados"
              : "El inventario está vacío"}
          </p>
          <p className="empty-state-text">
            {busqueda || categoriaFiltro !== "Todas" || soloStockBajo
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
                <th className="hide-mobile">Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto, index) => (
                <tr
                  key={producto.id}
                  style={{
                    animation: `fadeInUp 300ms var(--ease-out) ${index * 30}ms backwards`,
                  }}
                >
                  <td>
                    <span className="td-sku">{producto.sku}</span>
                  </td>
                  <td>
                    <div className="td-name">{producto.nombre}</div>
                    {producto.proveedor && (
                      <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                        {producto.proveedor}
                      </div>
                    )}
                  </td>
                  <td className="hide-mobile">
                    <span className="badge badge-neutral">{producto.categoria || "Otros"}</span>
                  </td>
                  <td>
                    <span className="td-precio">
                      ${producto.precio?.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>
                    {producto.stockActual}
                  </td>
                  <td>
                    <StockBadge
                      stockActual={producto.stockActual}
                      stockMinimo={producto.stockMinimo}
                    />
                  </td>
                  <td>
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
        </div>
      )}
    </div>
  );
}
