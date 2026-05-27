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

  const categorias = stats.productosPorCategoria || {};
  const maxCategoria = Math.max(...Object.values(categorias), 1);

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
            <span className="kpi-label">Categorías</span>
            <span className="kpi-icon kpi-icon-accent">🏷️</span>
          </div>
          <div className="kpi-value">{stats.totalCategorias}</div>
          <p className="kpi-footer">categorías activas</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Alertas de Stock */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">
              🔔 Alertas de Stock
              {stats.alertasStock?.length > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: 8 }}>
                  {stats.alertasStock.length}
                </span>
              )}
            </h3>
          </div>

          {stats.alertasStock?.length > 0 ? (
            <div className="alert-list">
              {stats.alertasStock.map((item, index) => (
                <div
                  key={item.id}
                  className="alert-item"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="alert-item-info">
                    <span className="td-sku">{item.sku}</span>
                    <span className="alert-item-name">{item.nombre}</span>
                    <span className="badge badge-neutral">{item.categoria}</span>
                  </div>
                  <div className="alert-item-stock">
                    <StockBadge
                      stockActual={item.stockActual}
                      stockMinimo={item.stockMinimo}
                    />
                    <span className="alert-item-numbers">
                      {item.stockActual} / {item.stockMinimo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="section-empty">
              <span>✅</span>
              <p>Todo el stock está en orden. ¡No hay alertas!</p>
            </div>
          )}
        </div>

        {/* Distribución por Categoría */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">📊 Productos por Categoría</h3>
          </div>

          {Object.keys(categorias).length > 0 ? (
            <div className="category-chart">
              {Object.entries(categorias)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count], index) => (
                  <div
                    key={cat}
                    className="category-bar-item"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="category-bar-header">
                      <span className="category-bar-label">{cat}</span>
                      <span className="category-bar-value">{count}</span>
                    </div>
                    <div className="category-bar-track">
                      <div
                        className="category-bar-fill"
                        style={{ width: `${(count / maxCategoria) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="section-empty">
              <span>📂</span>
              <p>No hay categorías registradas aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
