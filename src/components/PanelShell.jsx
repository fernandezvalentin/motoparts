"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Motorbike,
  Package,
  PackagePlus,
  ReceiptText,
  Settings,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmModal } from "./ConfirmModal";
import { ConfiguracionModal } from "./ConfiguracionModal";

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
  { key: "dashboard", icon: LayoutDashboard, label: "Panel de control", mobileLabel: "Inicio" },
  { key: "inventario", icon: Package, label: "Inventario", mobileLabel: "Inventario" },
  { key: "pos", icon: ShoppingCart, label: "Punto de venta", mobileLabel: "Ventas" },
  { key: "historial", icon: ReceiptText, label: "Historial de ventas", mobileLabel: "Historial" },
  { key: "facturacion", icon: FileText, label: "Facturación", mobileLabel: "Facturas" },
];

const ACCIONES = [{ key: "nuevo", icon: PackagePlus, label: "Nuevo producto" }];

function rutaActiva(pathname) {
  if (pathname === "/inventario/nuevo") return "nuevo";
  if (pathname.startsWith("/inventario")) return "inventario";
  if (pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/historial")) return "historial";
  if (pathname.startsWith("/facturacion")) return "facturacion";
  return "dashboard";
}

// Los componentes llaman agregarToast(mensaje, tipo) con tipo success | error | warning | info
const TIPOS_TOAST = { success: toast.success, error: toast.error, warning: toast.warning, info: toast.info };

function Logo({ compacto = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20",
          compacto ? "size-8" : "size-9"
        )}
      >
        <Motorbike className={compacto ? "size-5" : "size-5.5"} strokeWidth={1.75} />
      </div>
      <div className="leading-tight">
        <p className="font-bold tracking-tight">Moto Parts</p>
        {!compacto && <p className="text-xs text-muted-foreground">Inventario y ventas</p>}
      </div>
    </div>
  );
}

function NavLink({ item, activo, onClick }) {
  const Icono = item.icon;
  return (
    <Link
      href={RUTAS[item.key]}
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        activo && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
      )}
    >
      {activo && <span aria-hidden className="absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icono className="size-4.5 shrink-0" />
      {item.label}
    </Link>
  );
}

function MenuUsuario({ email, onConfiguracion, onLogout, onNuevo, align = "start", className }) {
  const inicial = email?.[0]?.toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-md text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:bg-accent",
          className
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-foreground ring-1 ring-border">
          {inicial ?? <UserRound className="size-4 text-muted-foreground" />}
        </span>
        <span className="min-w-0 flex-1 max-md:hidden">
          <span className="block truncate font-medium">{email ?? "Mi cuenta"}</span>
          <span className="block text-xs text-muted-foreground">Configuración y sesión</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground max-md:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={align === "end" ? "bottom" : "top"} className="w-60">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email ?? "Mi cuenta"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onNuevo && (
          <DropdownMenuItem onSelect={onNuevo} className="md:hidden">
            <PackagePlus />
            Nuevo producto
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onConfiguracion}>
          <Settings />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-popover-foreground">
          <a href="https://github.com/fernandezvalentin/motoparts" target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            Ver en GitHub
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onLogout}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PanelShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const paginaActual = rutaActiva(pathname);

  const [email, setEmail] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);

  useEffect(() => {
    let activo = true;
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (activo) setEmail(data.session?.user?.email ?? null);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const agregarToast = useCallback((message, type = "success") => {
    (TIPOS_TOAST[type] ?? toast)(message);
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

  const menuProps = {
    email,
    onConfiguracion: () => setMostrarConfiguracion(true),
    onLogout: handleLogout,
  };

  return (
    <PanelContext.Provider value={{ agregarToast, mostrarConfirm, navegar }}>
      <div className="min-h-dvh bg-background">
        {/* Menú lateral (escritorio) */}
        <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar max-md:hidden">
          <div className="flex h-16 items-center border-b px-5">
            <Logo />
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Principal">
            <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">Menú</p>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.key} item={item} activo={paginaActual === item.key} />
            ))}

            <p className="mt-5 px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">Acciones</p>
            {ACCIONES.map((item) => (
              <NavLink key={item.key} item={item} activo={paginaActual === item.key} />
            ))}
          </nav>

          <div className="border-t p-3">
            <MenuUsuario {...menuProps} className="w-full p-2" />
          </div>
        </aside>

        {/* Encabezado (celular) */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-sidebar/95 px-4 backdrop-blur md:hidden">
          <Link href="/" aria-label="Ir al inicio" className="text-foreground">
            <Logo compacto />
          </Link>
          <MenuUsuario {...menuProps} onNuevo={() => navegar("nuevo")} align="end" className="p-1" />
        </header>

        {/* Contenido */}
        <main className="min-w-0 pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] md:ml-64 md:pt-0 md:pb-0">
          <div
            key={pathname}
            className="mx-auto max-w-[1200px] px-4 pt-6 pb-12 animate-in fade-in-0 duration-300 md:px-6 lg:px-8 lg:pt-8"
          >
            {children}
          </div>
        </main>

        {/* Navegación inferior (celular) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Principal"
        >
          {NAV_ITEMS.map((item) => {
            const Icono = item.icon;
            const activo = paginaActual === item.key;
            return (
              <Link
                key={item.key}
                href={RUTAS[item.key]}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium text-muted-foreground transition-colors",
                  activo && "text-primary"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    activo && "bg-primary/15"
                  )}
                >
                  <Icono className="size-5" />
                </span>
                {item.mobileLabel}
              </Link>
            );
          })}
        </nav>

        <Toaster position="top-right" richColors={false} closeButton />

        <ConfirmModal
          open={Boolean(confirmModal)}
          message={confirmModal?.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />

        {mostrarConfiguracion && (
          <ConfiguracionModal onClose={() => setMostrarConfiguracion(false)} onLogout={handleLogout} />
        )}
      </div>
    </PanelContext.Provider>
  );
}
