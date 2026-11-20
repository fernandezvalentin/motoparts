"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  History,
  Minus,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Undo2,
  UserRound,
} from "lucide-react";
import {
  ajustarStock,
  altaRapidaProducto,
  deshacerMovimiento,
  obtenerMovimientos,
  obtenerProductos,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Field } from "@/components/app/Field";

// Pantalla pensada para usar desde el celular: letra grande, botones grandes y la cuenta del stock a la vista.

const MODOS = {
  sumar: { icon: PackageOpen, titulo: "Llegó mercadería", pregunta: "¿Cuántos llegaron?", boton: "Sumar al stock" },
  fijar: { icon: ClipboardList, titulo: "Conteo", pregunta: "¿Cuántos hay en el estante?", boton: "Guardar conteo" },
};

const TIPOS = {
  ingreso: { texto: "Llegó mercadería", clase: "bg-success/15 text-green-400 ring-success/25" },
  conteo: { texto: "Conteo", clase: "bg-sky-500/15 text-sky-300 ring-sky-500/25" },
  alta: { texto: "Producto nuevo", clase: "bg-primary/15 text-primary ring-primary/25" },
  venta: { texto: "Venta", clase: "bg-secondary text-muted-foreground ring-border" },
  anulacion_venta: { texto: "Venta anulada", clase: "bg-primary/10 text-amber-300 ring-primary/20" },
  importacion: { texto: "Importación Excel", clase: "bg-secondary text-muted-foreground ring-border" },
  edicion: { texto: "Edición manual", clase: "bg-primary/10 text-amber-300 ring-primary/20" },
  deshacer: { texto: "Deshecho", clase: "bg-destructive/15 text-red-400 ring-destructive/25" },
};

const FILTROS = [
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "7 días" },
  { valor: "todos", label: "Todos" },
];

const soloDigitos = (valor) => valor.replace(/\D/g, "").slice(0, 7);
const conSigno = (n) => (n > 0 ? `+${n}` : String(n));
const nombreUsuario = (email) => (email ? email.split("@")[0] : "sistema");
const formatearFecha = (iso) =>
  new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

// Campo de texto grande (16 px o más evita el zoom automático del iPhone)
const inputGrande = "h-14 rounded-xl px-4 text-lg md:text-lg";

function Sku({ children }) {
  return (
    <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-sky-300 ring-1 ring-sky-500/25 ring-inset">
      {children}
    </span>
  );
}

export function CargarStock({ onAgregarToast, onConfirmar }) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Cargar stock" description="Sumá lo que llega o corregí con lo que hay en el estante." />

      <Tabs defaultValue="cargar" className="gap-5">
        <TabsList className="grid h-12 w-full grid-cols-2">
          <TabsTrigger value="cargar" className="text-base">
            <PackagePlus />
            Cargar
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="text-base">
            <History />
            Movimientos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cargar">
          <PanelCarga onAgregarToast={onAgregarToast} />
        </TabsContent>
        <TabsContent value="movimientos">
          <PanelMovimientos onAgregarToast={onAgregarToast} onConfirmar={onConfirmar} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña "Cargar"
// ---------------------------------------------------------------------------
function PanelCarga({ onAgregarToast }) {
  const [modo, setModo] = useState("sumar");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState({ termino: "", items: [] });
  const [seleccionado, setSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState("");
  const [creando, setCreando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ultimaCarga, setUltimaCarga] = useState(null);
  const buscadorRef = useRef(null);

  const termino = busqueda.trim();
  const buscando = termino !== "" && resultados.termino !== termino;

  // Búsqueda con espera de 300 ms; se ignoran respuestas viejas
  useEffect(() => {
    if (!termino) return;
    let activo = true;
    const timer = setTimeout(async () => {
      const data = await obtenerProductos({ busqueda: termino, page: 1, pageSize: 15 });
      if (activo) setResultados({ termino, items: data.items || [] });
    }, 300);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [termino]);

  const elegirProducto = (producto) => {
    setSeleccionado(producto);
    setCantidad(modo === "sumar" ? "1" : String(producto.stockActual));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    if (seleccionado) setCantidad(nuevo === "sumar" ? "1" : String(seleccionado.stockActual));
  };

  const volverABuscar = () => {
    setSeleccionado(null);
    setCreando(false);
    setCantidad("");
    setBusqueda("");
    setTimeout(() => buscadorRef.current?.focus(), 50);
  };

  const n = cantidad === "" ? null : Number(cantidad);
  const stockNuevo = seleccionado && n != null ? (modo === "sumar" ? seleccionado.stockActual + n : n) : null;
  const puedeConfirmar = seleccionado && n != null && (modo === "fijar" || n > 0) && !procesando;

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setProcesando(true);
    try {
      const anterior = seleccionado.stockActual;
      const { producto, movimientoId } = await ajustarStock(seleccionado.id, modo, n);
      const sinCambios = producto.stockActual === anterior;
      onAgregarToast(
        sinCambios ? `${producto.nombre}: el stock ya era ${anterior}` : `Listo: ${producto.nombre} ahora tiene ${producto.stockActual}`,
        sinCambios ? "info" : "success"
      );
      setUltimaCarga(sinCambios ? null : { movimientoId, nombre: producto.nombre, anterior, nuevo: producto.stockActual });
      volverABuscar();
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setProcesando(false);
    }
  };

  const deshacerUltima = async () => {
    if (!ultimaCarga?.movimientoId) return;
    setProcesando(true);
    try {
      const { producto } = await deshacerMovimiento(ultimaCarga.movimientoId);
      onAgregarToast(`Deshecho: ${producto.nombre} volvió a ${producto.stockActual}`, "success");
      setUltimaCarga(null);
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setProcesando(false);
    }
  };

  const productoCreado = (producto) => {
    onAgregarToast(`Creado: ${producto.nombre} (código ${producto.sku}) con ${producto.stockActual} unidades`, "success");
    setUltimaCarga(null);
    volverABuscar();
  };

  if (creando) {
    return (
      <AltaRapida
        nombreInicial={termino}
        onCancelar={volverABuscar}
        onCreado={productoCreado}
        onAgregarToast={onAgregarToast}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Modo */}
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Qué querés hacer">
        {Object.entries(MODOS).map(([clave, m]) => {
          const Icono = m.icon;
          const activo = modo === clave;
          return (
            <button
              key={clave}
              type="button"
              onClick={() => cambiarModo(clave)}
              aria-pressed={activo}
              className={cn(
                "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-card px-3 py-3 text-base font-semibold text-muted-foreground transition-colors [-webkit-tap-highlight-color:transparent]",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                activo && "border-primary bg-primary/10 text-primary"
              )}
            >
              <Icono className="size-6" />
              {m.titulo}
            </button>
          );
        })}
      </div>

      {/* Última carga, con Deshacer */}
      {ultimaCarga && !seleccionado && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 animate-in fade-in-0 slide-in-from-top-1" data-testid="cs-ultima">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              <Check className="size-4 shrink-0 text-green-400" />
              <span className="truncate">{ultimaCarga.nombre}</span>
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {ultimaCarga.anterior} → {ultimaCarga.nuevo}
            </p>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={deshacerUltima} disabled={procesando}>
            <Undo2 />
            Deshacer
          </Button>
        </div>
      )}

      {seleccionado ? (
        <Card className="gap-0 py-5 animate-in fade-in-0 slide-in-from-bottom-2">
          <CardContent className="flex flex-col gap-4 px-5">
            <Button variant="link" className="h-auto self-start px-0 text-base" onClick={volverABuscar} disabled={procesando}>
              <ArrowLeft />
              Elegir otro repuesto
            </Button>

            <div>
              <h2 className="text-2xl leading-tight font-bold tracking-tight">{seleccionado.nombre}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Sku>{seleccionado.sku}</Sku>
                {seleccionado.proveedor && <span>{seleccionado.proveedor}</span>}
              </div>
              <p className="mt-3 text-lg text-muted-foreground">
                Hay <strong className="text-2xl text-foreground tabular-nums">{seleccionado.stockActual}</strong> en stock
              </p>
            </div>

            <label htmlFor="cs-cantidad" className="mt-1 text-lg font-semibold" data-testid="cs-pregunta">
              {MODOS[modo].pregunta}
            </label>
            <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-3">
              <Button
                variant="outline"
                className="h-18 rounded-xl [-webkit-tap-highlight-color:transparent]"
                aria-label="Restar uno"
                onClick={() => setCantidad(String(Math.max(modo === "sumar" ? 1 : 0, (n ?? 0) - 1)))}
                disabled={procesando}
              >
                <Minus className="size-7" />
              </Button>
              <Input
                id="cs-cantidad"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={cantidad}
                onChange={(e) => setCantidad(soloDigitos(e.target.value))}
                onFocus={(e) => e.target.select()}
                disabled={procesando}
                className="h-18 rounded-xl text-center text-3xl font-bold tabular-nums md:text-3xl"
              />
              <Button
                variant="outline"
                className="h-18 rounded-xl [-webkit-tap-highlight-color:transparent]"
                aria-label="Sumar uno"
                onClick={() => setCantidad(String((n ?? 0) + 1))}
                disabled={procesando}
              >
                <Plus className="size-7" />
              </Button>
            </div>

            {stockNuevo != null && (
              <p className="flex flex-wrap items-center justify-center gap-x-2 rounded-lg bg-secondary px-4 py-3 text-lg tabular-nums" data-testid="cs-preview">
                Hay {seleccionado.stockActual}
                <ArrowRight className="size-4 text-muted-foreground" />
                {modo === "sumar" ? "quedarán" : "quedará en"} <strong className="text-xl">{stockNuevo}</strong>
                {stockNuevo !== seleccionado.stockActual && (
                  <span className={cn("font-semibold", stockNuevo > seleccionado.stockActual ? "text-green-400" : "text-red-400")}>
                    ({conSigno(stockNuevo - seleccionado.stockActual)})
                  </span>
                )}
              </p>
            )}

            <Button className="h-14 rounded-xl text-lg font-semibold" onClick={confirmar} disabled={!puedeConfirmar} data-testid="cs-confirmar">
              <Check className="size-5" />
              {procesando ? "Guardando..." : MODOS[modo].boton}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={buscadorRef}
              type="search"
              enterKeyHint="search"
              placeholder="Buscá por nombre o código"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar repuesto"
              className={cn(inputGrande, "pl-12")}
            />
          </div>

          {!termino ? (
            <p className="px-2 py-6 text-center text-base leading-relaxed text-muted-foreground">
              Escribí parte del nombre (por ejemplo <em>cadena</em>) o el código del repuesto, y tocalo en la lista.
            </p>
          ) : buscando ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {resultados.items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegirProducto(p)}
                  data-testid="cs-resultado"
                  className={cn(
                    "flex min-h-[4.5rem] w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors [-webkit-tap-highlight-color:transparent]",
                    "hover:border-primary/60 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:border-primary"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-lg leading-snug font-semibold">{p.nombre}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Sku>{p.sku}</Sku>
                      {p.proveedor && <span>{p.proveedor}</span>}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg bg-secondary px-3 py-2 text-base font-bold whitespace-nowrap tabular-nums",
                      p.stockActual <= 0 && "text-red-400"
                    )}
                  >
                    Hay {p.stockActual}
                  </span>
                </button>
              ))}
              {resultados.items.length === 0 && (
                <EmptyState
                  icon={PackageSearch}
                  title={`No encontré "${termino}"`}
                  description="Probá con otra palabra o con el código. Si es un repuesto nuevo, crealo abajo."
                  className="py-10"
                />
              )}
              <Button variant="outline" className="h-13 rounded-xl text-base" onClick={() => setCreando(true)} data-testid="cs-crear">
                <Plus />
                ¿No está? Crear producto nuevo
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alta rápida: nombre, precio y cantidad (el código es opcional)
// ---------------------------------------------------------------------------
function AltaRapida({ nombreInicial, onCancelar, onCreado, onAgregarToast }) {
  const [form, setForm] = useState({ nombre: nombreInicial, precio: "", cantidad: "1", sku: "" });
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    const valor = campo === "cantidad" ? soloDigitos(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    // Acepta "4500", "4.500" o "4500,50"
    const precio = Number(form.precio.replace(/\./g, "").replace(",", "."));
    if (!form.nombre.trim()) return onAgregarToast("Escribí el nombre del repuesto.", "warning");
    if (form.precio === "" || !Number.isFinite(precio) || precio < 0) {
      return onAgregarToast("Escribí el precio de venta.", "warning");
    }
    setGuardando(true);
    try {
      const { producto } = await altaRapidaProducto({
        nombre: form.nombre,
        precio,
        cantidad: Number(form.cantidad || 0),
        sku: form.sku,
      });
      onCreado(producto);
    } catch (error) {
      onAgregarToast(error.message, "error");
      setGuardando(false);
    }
  };

  return (
    <Card className="gap-0 py-5 animate-in fade-in-0 slide-in-from-bottom-2">
      <CardContent className="px-5">
        <form className="flex flex-col gap-4" onSubmit={guardar}>
          <Button type="button" variant="link" className="h-auto self-start px-0 text-base" onClick={onCancelar} disabled={guardando}>
            <ArrowLeft />
            Volver a buscar
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <PackagePlus className="size-6 text-primary" />
              Producto nuevo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Completá lo básico. El costo, el proveedor y el stock mínimo se pueden agregar después desde Inventario.
            </p>
          </div>

          <Field label="Nombre del repuesto" htmlFor="alta-nombre">
            <Input id="alta-nombre" className={inputGrande} value={form.nombre} onChange={cambiar("nombre")} autoComplete="off" />
          </Field>
          <Field label="Precio de venta ($)" htmlFor="alta-precio">
            <Input
              id="alta-precio"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 4500"
              className={inputGrande}
              value={form.precio}
              onChange={cambiar("precio")}
              autoComplete="off"
            />
          </Field>
          <Field label="Cantidad que hay" htmlFor="alta-cantidad">
            <Input
              id="alta-cantidad"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={inputGrande}
              value={form.cantidad}
              onChange={cambiar("cantidad")}
              autoComplete="off"
            />
          </Field>
          <Field label="Código" htmlFor="alta-sku" hint="Opcional: si lo dejás vacío se crea uno solo.">
            <Input id="alta-sku" className={cn(inputGrande, "uppercase")} value={form.sku} onChange={cambiar("sku")} autoComplete="off" />
          </Field>

          <Button type="submit" className="mt-1 h-14 rounded-xl text-lg font-semibold" disabled={guardando} data-testid="cs-confirmar">
            <Check className="size-5" />
            {guardando ? "Guardando..." : "Crear producto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pestaña "Movimientos": qué cambió, cuánto, quién y cuándo
// ---------------------------------------------------------------------------
function PanelMovimientos({ onAgregarToast, onConfirmar }) {
  const [filtro, setFiltro] = useState("hoy");
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setMovimientos(await obtenerMovimientos(filtro));
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  }, [filtro, onAgregarToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al cambiar el filtro
    cargar();
  }, [cargar]);

  const deshacer = (mov) => {
    onConfirmar(
      `Se va a deshacer "${TIPOS[mov.tipo]?.texto ?? mov.tipo}" de ${mov.productoNombre} (${conSigno(mov.diferencia)}). El stock se corrige restando esa diferencia.`,
      async () => {
        try {
          const { producto } = await deshacerMovimiento(mov.id);
          onAgregarToast(`Deshecho: ${producto.nombre} ahora tiene ${producto.stockActual}`, "success");
          cargar();
        } catch (error) {
          onAgregarToast(error.message, "error");
        }
      },
      { titulo: "¿Deshacer este movimiento?", confirmar: "Deshacer" }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.valor}
            variant="ghost"
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              "h-11 rounded-full border px-4 text-base",
              filtro === f.valor && "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
            )}
          >
            {f.label}
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="ml-auto size-11" onClick={cargar} disabled={cargando} aria-label="Actualizar" title="Actualizar">
          <RefreshCw className={cn(cargando && "animate-spin")} />
        </Button>
      </div>

      {cargando ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : movimientos.length === 0 ? (
        <EmptyState
          icon={History}
          title={filtro === "hoy" ? "No hay movimientos hoy" : "No hay movimientos en este período"}
          description="Acá aparece cada cambio de stock: cargas, conteos, ventas e importaciones."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {movimientos.map((mov) => {
            const tipo = TIPOS[mov.tipo] ?? { texto: mov.tipo, clase: "bg-secondary text-muted-foreground ring-border" };
            const deshacible = (mov.tipo === "ingreso" || mov.tipo === "conteo") && !mov.deshecho && mov.productoId;
            return (
              <div
                key={mov.id}
                data-testid="cs-mov"
                className={cn("flex flex-col gap-2 rounded-xl border bg-card px-4 py-3.5", mov.deshecho && "opacity-55")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tipo.clase)}>{tipo.texto}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{formatearFecha(mov.fecha)}</span>
                </div>
                <p className="text-lg leading-snug font-semibold">{mov.productoNombre}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base tabular-nums">
                    {mov.cantidadAnterior} → <strong>{mov.cantidadNueva}</strong>{" "}
                    <span className={cn("font-semibold", mov.diferencia > 0 ? "text-green-400" : "text-red-400")}>({conSigno(mov.diferencia)})</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserRound className="size-4" />
                    {nombreUsuario(mov.usuario)}
                  </span>
                </div>
                {mov.deshecho && <p className="text-sm font-semibold text-red-400">Deshecho</p>}
                {deshacible && (
                  <Button
                    variant="ghost"
                    className="h-10 self-start px-2 text-amber-300 hover:text-amber-200"
                    onClick={() => deshacer(mov)}
                    data-testid="cs-mov-deshacer"
                  >
                    <Undo2 />
                    Deshacer
                  </Button>
                )}
              </div>
            );
          })}
          {movimientos.length >= 300 && <p className="py-2 text-center text-sm text-muted-foreground">Se muestran los últimos 300 movimientos.</p>}
        </div>
      )}
    </div>
  );
}
