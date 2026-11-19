"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  Package,
  PackageCheck,
  PackageSearch,
  Pencil,
  PencilLine,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { obtenerProductos, eliminarProducto, obtenerProveedores } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StockBadge } from "./StockBadge";
import { ImportadorExcel } from "./ImportadorExcel";
import { AumentoMasivoModal } from "./AumentoMasivoModal";
import { RenombrarProveedorModal } from "./RenombrarProveedorModal";

const ITEMS_POR_PAGINA = 50;
const TODOS = "Todos";

const pesos = (valor) =>
  `$${Number(valor ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function FiltroToggle({ activo, onClick, icon: Icono, children }) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "h-10 text-muted-foreground",
        activo && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary/50 dark:bg-primary/10 dark:hover:bg-primary/15"
      )}
    >
      <Icono />
      {children}
    </Button>
  );
}

function SkuCopiable({ sku, onCopiar }) {
  return (
    <button
      type="button"
      onClick={onCopiar}
      title="Copiar SKU"
      className="group/sku inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {sku}
      <Copy className="size-3 opacity-50 transition-opacity group-hover/sku:opacity-100" />
    </button>
  );
}

function AccionesProducto({ onEditar, onEliminar, nombre }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onEditar} aria-label={`Editar ${nombre}`} title="Editar">
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onEliminar}
        aria-label={`Eliminar ${nombre}`}
        title="Eliminar"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-red-400 dark:hover:bg-destructive/15"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function InventarioList({ onEditar, onAgregarToast, onConfirmar, recargar, stockBajoInicial = false }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [proveedoresUnicos, setProveedoresUnicos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState(TODOS);
  const [soloStockBajo, setSoloStockBajo] = useState(stockBajoInicial);
  const [soloConStock, setSoloConStock] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAumentoMasivo, setShowAumentoMasivo] = useState(false);
  const [showRenombrarProveedor, setShowRenombrarProveedor] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const cargarProveedores = useCallback(async () => {
    const data = await obtenerProveedores();
    setProveedoresUnicos(data);
  }, []);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    const data = await obtenerProductos({
      busqueda,
      proveedor: proveedorFiltro,
      soloStockBajo,
      soloConStock,
      page: paginaActual,
      pageSize: ITEMS_POR_PAGINA,
    });
    setProductos(data.items || []);
    setTotalProductos(data.total || 0);
    setTotalPaginas(data.totalPages || 1);
    setCargando(false);
  }, [busqueda, proveedorFiltro, soloStockBajo, soloConStock, paginaActual]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    cargarProveedores();
  }, [cargarProveedores]);

  useEffect(() => {
    // Espera 300 ms para no consultar la base con cada tecla de la búsqueda
    const demora = setTimeout(() => {
      cargarProductos();
    }, 300);
    return () => clearTimeout(demora);
  }, [recargar, cargarProductos]);

  // Al cambiar un filtro volvemos a la primera página
  const cambiarFiltro = (setter) => (valor) => {
    setter(valor);
    setPaginaActual(1);
  };

  const copiarSku = (sku) => {
    navigator.clipboard
      .writeText(sku)
      .then(() => onAgregarToast(`SKU ${sku} copiado`, "success"))
      .catch(() => onAgregarToast("No se pudo copiar el SKU", "error"));
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

  const hayFiltros = Boolean(busqueda) || proveedorFiltro !== TODOS || soloStockBajo || soloConStock;
  const limpiarFiltros = () => {
    setBusqueda("");
    setProveedorFiltro(TODOS);
    setSoloStockBajo(false);
    setSoloConStock(false);
    setPaginaActual(1);
  };

  const desde = totalProductos === 0 ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA + 1;
  const hasta = Math.min(paginaActual * ITEMS_POR_PAGINA, totalProductos);
  const detalle = (p) => [p.marca, p.modelo].filter(Boolean).join(" · ");

  return (
    <div>
      <PageHeader
        title="Inventario"
        description={
          cargando && totalProductos === 0
            ? "Cargando artículos..."
            : `${totalProductos.toLocaleString("es-AR")} ${totalProductos === 1 ? "artículo" : "artículos"}${hayFiltros ? " con estos filtros" : " en total"}`
        }
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Wrench />
                  Herramientas
                  <ChevronDown className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setShowImportModal(true)}>
                  <FileSpreadsheet />
                  Importar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowAumentoMasivo(true)}>
                  <TrendingUp />
                  Gestión de precios
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowRenombrarProveedor(true)}>
                  <PencilLine />
                  Renombrar proveedor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/inventario/nuevo">
                <Plus />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-input"
            type="search"
            className="h-10 pl-9"
            placeholder="Buscar por nombre, SKU o proveedor..."
            value={busqueda}
            onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={proveedorFiltro} onValueChange={cambiarFiltro(setProveedorFiltro)}>
            <SelectTrigger className="h-10! w-full sm:w-56" aria-label="Filtrar por proveedor">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los proveedores</SelectItem>
              {proveedoresUnicos.length > 0 && <SelectSeparator />}
              {proveedoresUnicos.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FiltroToggle
            activo={soloStockBajo}
            icon={TriangleAlert}
            onClick={() => cambiarFiltro(setSoloStockBajo)(!soloStockBajo)}
          >
            Stock bajo
          </FiltroToggle>
          <FiltroToggle
            activo={soloConStock}
            icon={PackageCheck}
            onClick={() => cambiarFiltro(setSoloConStock)(!soloConStock)}
          >
            Con stock
          </FiltroToggle>
        </div>
      </div>

      {!cargando && productos.length === 0 ? (
        hayFiltros ? (
          <EmptyState
            icon={PackageSearch}
            title="No se encontraron productos"
            description="Probá con otra búsqueda o sacá algún filtro."
            action={
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Package}
            title="El inventario está vacío"
            description="Cargá tu primer producto o importá la lista de un proveedor desde Excel."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setShowImportModal(true)}>
                  <FileSpreadsheet />
                  Importar Excel
                </Button>
                <Button asChild>
                  <Link href="/inventario/nuevo">
                    <Plus />
                    Nuevo producto
                  </Link>
                </Button>
              </div>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* Tabla (tablet y escritorio) */}
          <Table id="inventory-table" className="max-md:hidden">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-11 w-[46%] pl-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">Producto</TableHead>
                <TableHead className="h-11 text-xs font-medium tracking-wide text-muted-foreground uppercase max-lg:hidden">Proveedor</TableHead>
                <TableHead className="h-11 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">Precio</TableHead>
                <TableHead className="h-11 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">Stock</TableHead>
                <TableHead className="h-11 w-24 pr-4"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando
                ? Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="py-3 pl-4">
                        <Skeleton className="mb-2 h-4 w-56" />
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="max-lg:hidden"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="mx-auto h-5 w-16" /></TableCell>
                      <TableCell className="pr-4"><Skeleton className="ml-auto h-7 w-16" /></TableCell>
                    </TableRow>
                  ))
                : productos.map((producto) => (
                    <TableRow key={producto.id} className="group">
                      <TableCell className="max-w-0 py-3 pl-4 whitespace-normal">
                        <p className="truncate font-medium" title={producto.nombre}>
                          {producto.nombre}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <SkuCopiable sku={producto.sku} onCopiar={() => copiarSku(producto.sku)} />
                          {detalle(producto) && (
                            <span className="truncate text-xs text-muted-foreground">{detalle(producto)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-lg:hidden">
                        {producto.proveedor || <span className="text-muted-foreground/60">Sin proveedor</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold tabular-nums">{pesos(producto.precio)}</p>
                        {producto.precioLista > 0 && (
                          <p className="text-xs text-muted-foreground tabular-nums">Costo {pesos(producto.precioLista)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("font-semibold tabular-nums", producto.stockActual <= 0 && "text-red-400")}>
                            {producto.stockActual}
                          </span>
                          <StockBadge stockActual={producto.stockActual} stockMinimo={producto.stockMinimo} />
                        </div>
                      </TableCell>
                      <TableCell className="pr-4">
                        <AccionesProducto
                          nombre={producto.nombre}
                          onEditar={() => onEditar(producto)}
                          onEliminar={() => handleEliminar(producto)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {/* Lista (celular) */}
          <ul className="divide-y md:hidden">
            {cargando
              ? Array.from({ length: 6 }, (_, i) => (
                  <li key={i} className="space-y-2 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </li>
                ))
              : productos.map((producto) => (
                  <li key={producto.id} className="flex gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{producto.nombre}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <SkuCopiable sku={producto.sku} onCopiar={() => copiarSku(producto.sku)} />
                        <StockBadge stockActual={producto.stockActual} stockMinimo={producto.stockMinimo} />
                        <span className="text-xs text-muted-foreground tabular-nums">Stock {producto.stockActual}</span>
                      </div>
                      {(producto.proveedor || detalle(producto)) && (
                        <p className="mt-1.5 truncate text-xs text-muted-foreground">
                          {[producto.proveedor, detalle(producto)].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <p className="font-semibold tabular-nums">{pesos(producto.precio)}</p>
                      <AccionesProducto
                        nombre={producto.nombre}
                        onEditar={() => onEditar(producto)}
                        onEliminar={() => handleEliminar(producto)}
                      />
                    </div>
                  </li>
                ))}
          </ul>

          {/* Paginación */}
          {totalProductos > 0 && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {desde.toLocaleString("es-AR")}–{hasta.toLocaleString("es-AR")} de {totalProductos.toLocaleString("es-AR")}
              </span>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                  <span className="tabular-nums max-sm:hidden">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={paginaActual === 1 || cargando}
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={paginaActual === totalPaginas || cargando}
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showImportModal && (
        <ImportadorExcel
          onCerrar={() => setShowImportModal(false)}
          onCompletado={() => {
            setShowImportModal(false);
            cargarProveedores();
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

      {showRenombrarProveedor && (
        <RenombrarProveedorModal
          onCerrar={() => setShowRenombrarProveedor(false)}
          onAgregarToast={onAgregarToast}
          onCompletado={() => {
            setShowRenombrarProveedor(false);
            cargarProveedores();
            cargarProductos();
          }}
        />
      )}
    </div>
  );
}
