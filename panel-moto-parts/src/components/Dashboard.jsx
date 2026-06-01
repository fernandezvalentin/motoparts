// src/components/Dashboard.jsx
import { useState, useEffect } from "react";
import { obtenerEstadisticas } from "../services/api";
import { StockBadge } from "./StockBadge";
import "./Dashboard.css";

export function Dashboard({ onNavegar }) {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setCargando(true);
    const data = await obtenerEstadisticas();
    setStats(data);
    setCargando(false);
  };

  if (cargando) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <div>
            <h2 className="page-title">Panel de Control</h2>
            <p className="page-subtitle">Resumen general del inventario</p>
          </div>
        </div>
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton" style={{ width: 80, height: 14 }} />
              <div className="skeleton" style={{ width: 120, height: 36, marginTop: 12 }} />
              <div className="skeleton" style={{ width: 60, height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-title">No se pudieron cargar las estadísticas</p>
          <p className="empty-state-text">Verificá que el servidor esté corriendo.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={cargarEstadisticas}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const proveedores = stats.productosPorProveedor || {};
  const maxProveedor = Math.max(...Object.values(proveedores), 1);

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h2 className="page-title">Panel de Control</h2>
          <p className="page-subtitle">Resumen general del inventario</p>
        </div>
        <button className="btn btn-secondary" onClick={cargarEstadisticas}>
          ↻ Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavegar("inventario")}>
          <div className="kpi-header">
            <span className="kpi-label">Total Productos</span>
            <span className="kpi-icon kpi-icon-info">📦</span>
          </div>
          <div className="kpi-value">{stats.totalProductos}</div>
          <p className="kpi-footer">artículos en catálogo</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Valor del Inventario</span>
            <span className="kpi-icon kpi-icon-success">💰</span>
          </div>
          <div className="kpi-value">
            ${stats.valorInventario?.toLocaleString("es-AR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <p className="kpi-footer">valor total en stock</p>
        </div>

        <div
          className={`kpi-card ${stats.productosStockCritico > 0 ? "kpi-card-alert" : ""}`}
          onClick={() => onNavegar("inventario")}
        >
          <div className="kpi-header">
            <span className="kpi-label">Stock Crítico</span>
            <span className="kpi-icon kpi-icon-danger">⚠️</span>
          </div>
          <div className={`kpi-value ${stats.productosStockCritico > 0 ? "text-danger" : ""}`}>
            {stats.productosStockCritico}
          </div>
          <p className="kpi-footer">productos por debajo del mínimo</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Proveedores</span>
            <span className="kpi-icon kpi-icon-accent">🏢</span>
          </div>
          <div className="kpi-value">{stats.totalProveedores}</div>
          <p className="kpi-footer">proveedores activos</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Alertas de Stock */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">
              🔔 Alertas de Stock
              {stats.productosStockCritico > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: 8 }}>
                  {stats.productosStockCritico}
                </span>
              )}
            </h3>
          </div>

          {stats.alertasStock?.length > 0 ? (
            <div className="table-container" style={{ margin: "var(--space-2)", border: "none" }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>DESCRIPCIÓN</th>
                    <th className="hide-mobile">PROVEEDOR</th>
                    <th style={{ textAlign: "center" }}>ESTADO</th>
                    <th style={{ textAlign: "center" }}>STOCK</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.alertasStock.map((item, index) => (
                    <tr key={item.id} style={{ animationDelay: `${index * 50}ms`, animation: "fadeInUp 300ms var(--ease-out) backwards" }}>
                      <td data-label="SKU">
                        <span className="td-sku" style={{ whiteSpace: "nowrap" }}>{item.sku}</span>
                      </td>
                      <td data-label="REPUESTO">
                        <span className="alert-item-name" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.nombre}
                        </span>
                      </td>
                      <td className="hide-mobile" style={{ whiteSpace: "nowrap", width: "1%" }} data-label="PROVEEDOR">
                        <span className="badge badge-neutral" style={{ whiteSpace: "nowrap" }}>{item.proveedor || "Sin Proveedor"}</span>
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }} data-label="ESTADO">
                        <StockBadge
                          stockActual={item.stockActual}
                          stockMinimo={item.stockMinimo}
                        />
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }} data-label="STOCK">
                        <span className="alert-item-numbers">
                          {item.stockActual} / {item.stockMinimo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {stats.productosStockCritico > stats.alertasStock.length && (
                <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)", borderTop: "1px solid var(--border-primary)" }}>
                  Y {stats.productosStockCritico - stats.alertasStock.length} repuestos más con stock bajo.
                </div>
              )}
            </div>
          ) : (
            <div className="section-empty">
              <span>✅</span>
              <p>Todo el stock está en orden. ¡No hay alertas!</p>
            </div>
          )}
        </div>

        {/* Sidebar Derecha */}
        <div className="dashboard-sidebar" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Top 5 Más Vendidos */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">🏆 Top 5 Más Vendidos</h3>
            </div>
              {stats.topVendidos?.length > 0 ? (
                <div className="table-container" style={{ margin: "var(--space-2)", border: "none" }}>
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>CÓDIGO</th>
                        <th>REPUESTO</th>
                        <th style={{ textAlign: "center" }}>VENDIDOS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topVendidos.map((prod, index) => (
                        <tr key={prod.id} style={{ animationDelay: `${index * 50}ms`, animation: "fadeInUp 300ms var(--ease-out) backwards" }}>
                          <td data-label="CÓDIGO">
                            <span className="td-sku" style={{ whiteSpace: "nowrap" }}>{prod.sku}</span>
                          </td>
                          <td data-label="REPUESTO">
                            <span className="alert-item-name" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }} title={prod.nombre}>
                              {prod.nombre}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", width: "1%" }} data-label="VENDIDOS">
                            <span className="badge badge-success" style={{ fontWeight: "bold" }}>{prod.cantidadVendida}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "var(--space-3) 0" }}>
                  <p>Aún no hay ventas registradas.</p>
                </div>
              )}
          </div>

          {/* Distribución por Proveedor */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">📊 Productos por Proveedor</h3>
            </div>
          {Object.keys(proveedores).length > 0 ? (
            <div className="category-chart">
              {Object.entries(proveedores)
                .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad descendente
                .map(([prov, count]) => (
                  <div key={prov} className="category-bar-item">
                    <div className="category-bar-header">
                      <span className="category-bar-label">{prov || "Sin Proveedor"}</span>
                      <span className="category-bar-value">{count} {count === 1 ? 'producto' : 'productos'}</span>
                    </div>
                    <div className="category-bar-track">
                      <div 
                        className="category-bar-fill" 
                        style={{ width: `${(count / maxProveedor) * 100}%` }}
                      ></div>
                    </div>
                  </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No hay proveedores registrados aún.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
