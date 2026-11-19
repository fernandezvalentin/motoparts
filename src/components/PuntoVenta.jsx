"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  ScanBarcode,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { obtenerProductos, registrarVenta } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";

const METODOS_PAGO = [
  { valor: "Efectivo", icon: Banknote },
  { valor: "Débito", icon: CreditCard },
  { valor: "Crédito", icon: CreditCard },
  { valor: "Transferencia", icon: ArrowLeftRight },
];
const DESCUENTOS = [0, ...Array.from({ length: 15 }, (_, i) => i + 1)];

const pesos = (valor, decimales = 0) =>
  `$${Number(valor ?? 0).toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: 2 })}`;

function ProductoCard({ producto, cantidadEnCarrito, onAgregar }) {
  const sinStock = producto.stockActual <= 0;
  const stockBajo = !sinStock && producto.stockActual <= producto.stockMinimo;
  const disponible = producto.stockActual - cantidadEnCarrito;

  return (
    <button
      type="button"
      disabled={sinStock}
      onClick={() => onAgregar(producto)}
      className={cn(
        "group relative flex h-full flex-col rounded-xl border bg-card p-4 text-left transition-all outline-none",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-black/30 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-45",
        cantidadEnCarrito > 0 && "border-primary/60 ring-1 ring-primary/30"
      )}
    >
      {cantidadEnCarrito > 0 && (
        <span className="absolute top-3 right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
          {cantidadEnCarrito}
        </span>
      )}
      <span className="font-mono text-xs text-muted-foreground">{producto.sku}</span>
      <span className="mt-1 line-clamp-2 pr-6 font-medium leading-snug" title={producto.nombre}>
        {producto.nombre}
      </span>
      {(producto.marca || producto.modelo) && (
        <span className="mt-1 truncate text-xs text-muted-foreground">
          {[producto.marca, producto.modelo].filter(Boolean).join(" · ")}
        </span>
      )}
      <span className="mt-auto flex items-end justify-between gap-2 pt-4">
        <span
          className={cn(
            "text-xs tabular-nums",
            sinStock ? "text-red-400" : stockBajo ? "text-amber-400" : "text-muted-foreground"
          )}
        >
          {sinStock ? "Sin stock" : disponible === 1 ? "1 disponible" : `${disponible} disponibles`}
        </span>
        <span className="text-lg font-bold tracking-tight text-primary tabular-nums">{pesos(producto.precio)}</span>
      </span>
      {!sinStock && (
        <span className="pointer-events-none absolute right-3 bottom-12 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          <Plus className="size-4" />
        </span>
      )}
    </button>
  );
}

function Carrito({
  carrito,
  subtotal,
  montoDescuento,
  total,
  descuento,
  setDescuento,
  metodoPago,
  setMetodoPago,
  procesando,
  modificarCantidad,
  removerDelCarrito,
  vaciarCarrito,
  confirmarVenta,
  className,
}) {
  const unidades = carrito.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="size-4 text-primary" />
            Venta actual
          </h2>
          <p className="text-xs text-muted-foreground">
            {carrito.length === 0 ? "Sin productos" : `${unidades} ${unidades === 1 ? "unidad" : "unidades"} · ${carrito.length} ${carrito.length === 1 ? "producto" : "productos"}`}
          </p>
        </div>
        {carrito.length > 0 && (
          <Button variant="ghost" size="sm" onClick={vaciarCarrito} disabled={procesando} className="text-muted-foreground">
            <Trash2 />
            Vaciar
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {carrito.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted ring-1 ring-border">
              <ScanBarcode className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">El carrito está vacío</p>
            <p className="mt-1 max-w-56 text-xs text-muted-foreground">
              Tocá un producto o escaneá su código para agregarlo.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {carrito.map((item) => (
              <li key={item.productoId} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-snug font-medium">{item.nombre}</p>
                  <button
                    type="button"
                    onClick={() => removerDelCarrito(item.productoId)}
                    className="-mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-400"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-md border bg-background">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-r-none"
                      onClick={() => modificarCantidad(item.productoId, -1)}
                      disabled={item.cantidad <= 1 || procesando}
                      aria-label="Restar uno"
                    >
                      <Minus />
                    </Button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">{item.cantidad}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-l-none"
                      onClick={() => modificarCantidad(item.productoId, 1)}
                      disabled={item.cantidad >= item.stockMaximo || procesando}
                      aria-label="Sumar uno"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{pesos(item.cantidad * item.precioUnitario)}</p>
                    {item.cantidad > 1 && (
                      <p className="text-xs text-muted-foreground tabular-nums">{pesos(item.precioUnitario)} c/u</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t bg-muted/40 px-5 py-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Medio de pago</Label>
          <div className="grid grid-cols-2 gap-2">
            {METODOS_PAGO.map(({ valor, icon: Icono }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setMetodoPago(valor)}
                aria-pressed={metodoPago === valor}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-md border bg-background text-sm font-medium text-muted-foreground transition-colors outline-none",
                  "hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  metodoPago === valor && "border-primary bg-primary/10 text-primary hover:text-primary"
                )}
              >
                <Icono className="size-4" />
                {valor}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="descuento" className="text-xs text-muted-foreground">Descuento</Label>
          <Select value={String(descuento)} onValueChange={(v) => setDescuento(Number(v))}>
            <SelectTrigger id="descuento" size="sm" className="w-36 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESCUENTOS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d === 0 ? "Sin descuento" : `${d}%`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{pesos(subtotal, 2)}</dd>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-green-400">
              <dt>Descuento ({descuento}%)</dt>
              <dd className="tabular-nums">−{pesos(montoDescuento, 2)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="text-2xl font-bold tracking-tight text-primary tabular-nums">{pesos(total, 2)}</dd>
          </div>
        </dl>

        <Button size="lg" className="h-12 w-full text-base font-semibold" onClick={confirmarVenta} disabled={carrito.length === 0 || procesando}>
          {procesando ? <Loader2 className="animate-spin" /> : <Check />}
          {procesando ? "Registrando venta..." : "Cobrar"}
        </Button>
      </div>
    </div>
  );
}

export function PuntoVenta({ onAgregarToast, onConfirmar }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [descuento, setDescuento] = useState(0);
  const [carritoMovilAbierto, setCarritoMovilAbierto] = useState(false);
  const buscadorRef = useRef(null);

  const cargarCatalogo = useCallback(async () => {
    setCargando(true);
    const data = await obtenerProductos({ busqueda, page: 1, pageSize: 24 });
    setProductos(data.items || []);
    setCargando(false);
  }, [busqueda]);

  useEffect(() => {
    const demora = setTimeout(() => {
      cargarCatalogo();
    }, 300);
    return () => clearTimeout(demora);
  }, [cargarCatalogo]);

  const agregarAlCarrito = (producto) => {
    if (producto.stockActual <= 0) return;
    const existente = carrito.find((item) => item.productoId === producto.id);
    if (existente && existente.cantidad >= producto.stockActual) {
      onAgregarToast(`No hay más stock de ${producto.nombre}`, "warning");
      return;
    }
    setCarrito((prev) =>
      existente
        ? prev.map((item) => (item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item))
        : [
            ...prev,
            {
              productoId: producto.id,
              nombre: producto.nombre,
              precioUnitario: producto.precio,
              cantidad: 1,
              stockMaximo: producto.stockActual,
            },
          ]
    );
  };

  // Enter en el buscador: si el texto coincide con un SKU (por ejemplo, desde un
  // lector de código de barras) o hay un único resultado, lo agrega al carrito.
  const handleEnterBuscador = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const texto = busqueda.trim();
    if (!texto) return;
    const data = await obtenerProductos({ busqueda: texto, page: 1, pageSize: 24 });
    const items = data.items || [];
    const exacto = items.find((p) => p.sku?.toLowerCase() === texto.toLowerCase());
    const elegido = exacto ?? (items.length === 1 ? items[0] : null);
    if (elegido) {
      agregarAlCarrito(elegido);
      setBusqueda("");
    } else {
      setProductos(items);
      if (items.length === 0) onAgregarToast(`No se encontró ningún producto con "${texto}"`, "warning");
    }
  };

  const modificarCantidad = (productoId, delta) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.productoId !== productoId) return item;
        const nuevaCantidad = item.cantidad + delta;
        return nuevaCantidad > 0 && nuevaCantidad <= item.stockMaximo ? { ...item, cantidad: nuevaCantidad } : item;
      })
    );
  };

  const removerDelCarrito = (productoId) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  };

  const vaciarCarrito = () => {
    const vaciar = () => {
      setCarrito([]);
      setDescuento(0);
    };
    if (onConfirmar) {
      onConfirmar("Se van a quitar todos los productos de la venta actual.", vaciar, {
        titulo: "¿Vaciar el carrito?",
        confirmar: "Vaciar",
      });
    } else {
      vaciar();
    }
  };

  const subtotal = carrito.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const montoDescuento = subtotal * (descuento / 100);
  const total = subtotal - montoDescuento;
  const unidades = carrito.reduce((s, i) => s + i.cantidad, 0);

  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      await registrarVenta({
        metodoPago,
        descuentoPorcentaje: descuento,
        detalles: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
      });
      onAgregarToast(`Venta registrada: ${pesos(total, 2)} en ${metodoPago.toLowerCase()}`, "success");
      setCarrito([]);
      setBusqueda("");
      setMetodoPago("Efectivo");
      setDescuento(0);
      setCarritoMovilAbierto(false);
      await cargarCatalogo();
      buscadorRef.current?.focus();
    } catch (error) {
      onAgregarToast(error.message || "Error al registrar la venta", "error");
    } finally {
      setProcesando(false);
    }
  };

  const propsCarrito = {
    carrito,
    subtotal,
    montoDescuento,
    total,
    descuento,
    setDescuento,
    metodoPago,
    setMetodoPago,
    procesando,
    modificarCantidad,
    removerDelCarrito,
    vaciarCarrito,
    confirmarVenta,
  };

  const cantidadEnCarrito = (id) => carrito.find((i) => i.productoId === id)?.cantidad ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="min-w-0">
        <PageHeader title="Punto de venta" description="Buscá o escaneá productos para armar la venta." />

        <div className="relative mb-4">
          <ScanBarcode className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={buscadorRef}
            type="search"
            autoFocus
            className="h-12 pl-11 text-base md:text-base"
            placeholder="Escaneá un código o buscá por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleEnterBuscador}
          />
        </div>

        {cargando && productos.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No se encontraron productos"
            description={busqueda ? `No hay resultados para "${busqueda}".` : "Todavía no hay productos cargados."}
          />
        ) : (
          <>
            <div className={cn("grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3", cargando && "opacity-60")}>
              {productos.map((producto) => (
                <ProductoCard
                  key={producto.id}
                  producto={producto}
                  cantidadEnCarrito={cantidadEnCarrito(producto.id)}
                  onAgregar={agregarAlCarrito}
                />
              ))}
            </div>
            {productos.length >= 24 && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Se muestran los primeros 24 resultados. Escribí más para afinar la búsqueda.
              </p>
            )}
          </>
        )}
      </section>

      {/* Carrito (escritorio) */}
      <aside className="max-lg:hidden">
        <div className="sticky top-8 flex max-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <Carrito {...propsCarrito} className="flex-1" />
        </div>
      </aside>

      {/* Barra del carrito (celular y tablet) */}
      {carrito.length > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 md:bottom-6 md:left-[calc(16rem+1.5rem)] lg:hidden">
          <Button
            size="lg"
            className="h-14 w-full justify-between rounded-xl px-5 text-base shadow-xl shadow-black/50"
            onClick={() => setCarritoMovilAbierto(true)}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart />
              Ver venta · {unidades} {unidades === 1 ? "unidad" : "unidades"}
            </span>
            <span className="font-bold tabular-nums">{pesos(total, 2)}</span>
          </Button>
        </div>
      )}

      <Dialog open={carritoMovilAbierto} onOpenChange={setCarritoMovilAbierto}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md lg:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Venta actual</DialogTitle>
            <DialogDescription>Revisá los productos, elegí el medio de pago y cobrá.</DialogDescription>
          </DialogHeader>
          <Carrito {...propsCarrito} className="min-h-0 flex-1 [&>div:first-child]:pr-12" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
