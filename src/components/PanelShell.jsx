"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { ToastContainer } from "./Toast";
import { ConfirmModal } from "./ConfirmModal";
import { ConfiguracionModal } from "./ConfiguracionModal";
import "./PanelShell.css";

// Rutas del panel. Las claves son los nombres que ya usaban los componentes al navegar.
export const RUTAS = {
  dashboard: "/",
  inventario: "/inventario",
  nuevo: "/inventario/nuevo",
  pos: "/pos",
  historial: "/historial",
  facturacion: "/facturacion",
};

const PanelContext = createContext(null);

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel debe usarse dentro de <PanelShell>");
  return ctx;
}

const NAV_ITEMS = [
  { key: "dashboard", icon: "📊", label: "Panel de Control", mobileLabel: "Inicio" },
  { key: "inventario", icon: "📦", label: "Inventario", mobileLabel: "Inventario" },
  { key: "pos", icon: "🛒", label: "Punto de Venta", mobileLabel: "Ventas" },
  { key: "historial", icon: "🧾", label: "Historial de Ventas", mobileLabel: "Historial" },
  { key: "facturacion", icon: "📄", label: "Facturación", mobileLabel: "Facturas" },
  { key: "nuevo", icon: "➕", label: "Nuevo Producto" },
];

function rutaActiva(pathname) {
  if (pathname === "/inventario/nuevo") return "nuevo";
  if (pathname.startsWith("/inventario")) return "inventario";
  if (pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/historial")) return "historial";
  if (pathname.startsWith("/facturacion")) return "facturacion";
  return "dashboard";
}

export function PanelShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const paginaActual = rutaActiva(pathname);

  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);

  const agregarToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrarConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  // Acepta "inventario", "inventario?stockBajo=true", o una ruta absoluta "/pos"
  const navegar = useCallback(
    (destino) => {
      const [clave, query] = destino.split("?");
      const ruta = clave.startsWith("/") ? clave : RUTAS[clave] ?? "/";
      router.push(query ? `${ruta}?${query}` : ruta);
      setSidebarAbierto(false);
    },
    [router]
  );

  const handleConfirm = () => {
    confirmModal?.onConfirm?.();
    setConfirmModal(null);
  };

  const handleLogout = async () => {
    setMostrarConfiguracion(false);
    await logout();
    router.replace("/login");
    router.refresh();
  };

  const cerrarSidebar = () => setSidebarAbierto(false);

  return (
    <PanelContext.Provider value={{ agregarToast, mostrarConfirm, navegar }}>
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
        {sidebarAbierto && <div className="sidebar-overlay visible" onClick={cerrarSidebar} />}

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
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={RUTAS[item.key]}
                className={`nav-item ${paginaActual === item.key ? "active" : ""}`}
                onClick={cerrarSidebar}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setMostrarConfiguracion(true);
                cerrarSidebar();
              }}
              style={{ width: "100%", marginBottom: "10px" }}
            >
              ⚙️ Configuración
            </button>
            <button className="btn btn-danger" onClick={handleLogout} style={{ width: "100%", marginBottom: "10px" }}>
              Cerrar Sesión
            </button>
            <p>Moto Parts Inventory v2.0</p>
            <p style={{ marginTop: 4 }}>
              <a href="https://github.com/fernandezvalentin/motoparts" target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="main-inner" key={pathname}>
            {children}
          </div>
        </main>

        <ToastContainer toasts={toasts} onRemove={removerToast} />

        {confirmModal && (
          <ConfirmModal
            message={confirmModal.message}
            onConfirm={handleConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}

        {mostrarConfiguracion && (
          <ConfiguracionModal onClose={() => setMostrarConfiguracion(false)} onLogout={handleLogout} />
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav hide-desktop">
          {NAV_ITEMS.filter((item) => item.mobileLabel).map((item) => (
            <Link
              key={item.key}
              href={RUTAS[item.key]}
              className={`bottom-nav-item ${paginaActual === item.key ? "active" : ""}`}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.mobileLabel}</span>
            </Link>
          ))}
        </nav>
      </div>
    </PanelContext.Provider>
  );
}
