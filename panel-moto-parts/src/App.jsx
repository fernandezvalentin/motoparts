// src/App.jsx
import { useState, useCallback } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard";
import { InventarioList } from "./components/InventarioList";
import { ProductoForm } from "./components/ProductoForm";
import { PuntoVenta } from "./components/PuntoVenta";
import { HistorialVentas } from "./components/HistorialVentas";
import { Login } from "./components/Login";
import { ToastContainer } from "./components/Toast";
import { ConfirmModal } from "./components/ConfirmModal";
import { ConfiguracionModal } from "./components/ConfiguracionModal";

function App() {
  // Navigation
  const [paginaActual, setPaginaActual] = useState("dashboard");
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("moto_parts_token")
  );

  // Data
  const [productoAEditar, setProductoAEditar] = useState(null);
  const [recargarFlag, setRecargarFlag] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Configuración modal
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);

  // Toast management
  const agregarToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Confirm modal management
  const mostrarConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  const handleConfirm = () => {
    if (confirmModal?.onConfirm) confirmModal.onConfirm();
    setConfirmModal(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("moto_parts_token");
    setIsAuthenticated(false);
    setMostrarConfiguracion(false);
  };

  // Navigation helpers
  const handleNavigate = (path) => {
    setPaginaActual(path);
    if (sidebarAbierto) {
      setSidebarAbierto(false);
    }
  };

  const handleEditar = (producto) => {
    setProductoAEditar(producto);
    setPaginaActual("nuevo");
    if (sidebarAbierto) setSidebarAbierto(false);
  };

  const handleNuevo = () => {
    setProductoAEditar(null);
    setPaginaActual("nuevo");
    if (sidebarAbierto) setSidebarAbierto(false);
  };

  const handleRecargar = () => {
    setRecargarFlag((prev) => !prev);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Render active page
  const renderPagina = () => {
    switch (paginaActual) {
      case "dashboard":
        return <Dashboard onNavegar={handleNavigate} />;
      case "inventario":
        return (
          <InventarioList
            onEditar={handleEditar}
            onAgregarToast={agregarToast}
            onConfirmar={mostrarConfirm}
            recargar={recargarFlag}
          />
        );
      case "nuevo":
        return (
          <ProductoForm
            productoAEditar={productoAEditar}
            setProductoAEditar={setProductoAEditar}
            onOperacionExitosa={handleRecargar}
            onAgregarToast={agregarToast}
            onNavegar={handleNavigate}
          />
        );
      case "pos":
        return <PuntoVenta onAgregarToast={agregarToast} />;
      case "historial":
        return <HistorialVentas />;
      default:
        return <Dashboard onNavegar={handleNavigate} />;
    }
  };

  return (
    <div className="app">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-title">
          <span className="mobile-header-icon">🏍️</span>
          Moto Parts
        </div>
        <button
          className="hamburger-btn"
          onClick={() => setSidebarAbierto(!sidebarAbierto)}
          aria-label="Abrir menú"
        >
          {sidebarAbierto ? "✕" : "☰"}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarAbierto && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarAbierto ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🏍️</div>
            <div className="sidebar-logo-text">
              <h1>Moto Parts</h1>
              <p>Sistema de Inventario</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-nav-section">Menú Principal</span>

          <button
            className={`nav-item ${paginaActual === "dashboard" ? "active" : ""}`}
            onClick={() => handleNavigate("dashboard")}
          >
            <span className="nav-item-icon">📊</span>
            Panel de Control
          </button>

          <button
            className={`nav-item ${paginaActual === "inventario" ? "active" : ""}`}
            onClick={() => handleNavigate("inventario")}
          >
            <span className="nav-item-icon">📦</span>
            Inventario
          </button>

          <button
            className={`nav-item ${paginaActual === "pos" ? "active" : ""}`}
            onClick={() => handleNavigate("pos")}
          >
            <span className="nav-item-icon">🛒</span>
            Punto de Venta
          </button>

          <button
            className={`nav-item ${paginaActual === "historial" ? "active" : ""}`}
            onClick={() => handleNavigate("historial")}
          >
            <span className="nav-item-icon">🧾</span>
            Historial de Ventas
          </button>

          <button
            className={`nav-item ${paginaActual === "nuevo" ? "active" : ""}`}
            onClick={handleNuevo}
          >
            <span className="nav-item-icon">➕</span>
            Nuevo Producto
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-secondary" onClick={() => { setMostrarConfiguracion(true); if (sidebarAbierto) setSidebarAbierto(false); }} style={{ width: '100%', marginBottom: '10px' }}>
            ⚙️ Configuración
          </button>
          <button className="btn btn-danger" onClick={handleLogout} style={{ width: '100%', marginBottom: '10px' }}>
            Cerrar Sesión
          </button>
          <p>Moto Parts Inventory v1.0</p>
          <p style={{ marginTop: 4 }}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="main-inner" key={paginaActual}>
          {renderPagina()}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removerToast} />

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Configuracion Modal */}
      {mostrarConfiguracion && (
        <ConfiguracionModal 
          onClose={() => setMostrarConfiguracion(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
