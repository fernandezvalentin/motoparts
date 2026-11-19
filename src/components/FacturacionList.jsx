"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleCheck, FileText, FileUp, Plus, Trash2, TriangleAlert, Wallet } from "lucide-react";
import { actualizarEstadoFactura, eliminarFactura, obtenerFacturas, urlArchivoFactura } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FacturaUploadModal } from "./FacturaUploadModal";

const ESTADOS = {
  Pendiente: { label: "Pendiente", punto: "bg-primary", texto: "text-amber-400" },
  Pagado: { label: "Pagada", punto: "bg-success", texto: "text-green-400" },
  Vencido: { label: "Vencida", punto: "bg-destructive", texto: "text-red-400" },
};

const FILTROS = [
  { valor: "Todas", label: "Todas" },
  { valor: "Pendiente", label: "Pendientes" },
  { valor: "Vencido", label: "Vencidas" },
  { valor: "Pagado", label: "Pagadas" },
];

// Las fechas vienen como "aaaa-mm-dd" (sin hora): se formatean sin pasar por Date para evitar corrimientos de zona horaria
const formatearFecha = (iso) => {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const formatearMoneda = (monto) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto || 0);

const hoyArgentina = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

const diasEntre = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);

function textoVencimiento(factura, hoy) {
  if (!factura.fechaVencimiento || factura.estado === "Pagado") return null;
  const dias = diasEntre(hoy, factura.fechaVencimiento);
  if (dias < 0) return { texto: `Venció hace ${-dias} ${dias === -1 ? "día" : "días"}`, clase: "text-red-400" };
  if (dias === 0) return { texto: "Vence hoy", clase: "text-red-400" };
  if (dias <= 7) return { texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`, clase: "text-amber-400" };
  return { texto: `Vence en ${dias} días`, clase: "text-muted-foreground" };
}

function EstadoSelect({ factura, onCambiar }) {
  const estado = ESTADOS[factura.estado] ?? ESTADOS.Pendiente;
  return (
    <Select value={factura.estado} onValueChange={(v) => onCambiar(factura.id, v)}>
      <SelectTrigger size="sm" className={cn("h-8 w-32 gap-2 bg-transparent text-xs font-medium", estado.texto)} aria-label="Estado de la factura">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ESTADOS).map(([valor, e]) => (
          <SelectItem key={valor} value={valor}>
            <span className={cn("size-2 rounded-full", e.punto)} />
            {e.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Resumen({ titulo, valor, detalle, icon: Icono, tono, cargando }) {
  return (
    <Card className={cn("gap-0 py-5", tono === "peligro" && "border-destructive/40")}>
      <CardContent className="flex items-start justify-between gap-4 px-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{titulo}</p>
          {cargando ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className={cn("mt-2 truncate text-2xl font-bold tracking-tight tabular-nums", tono === "peligro" && "text-red-400")}>{valor}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            tono === "peligro" ? "bg-destructive/12 text-red-400 ring-destructive/20" : tono === "aviso" ? "bg-primary/12 text-primary ring-primary/20" : "bg-secondary text-muted-foreground ring-border"
          )}
        >
          <Icono className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export function FacturacionList({ onAgregarToast, onConfirmar }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("Todas");

  const cargarFacturas = useCallback(async () => {
    setCargando(true);
    try {
      setFacturas(await obtenerFacturas());
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  }, [onAgregarToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    cargarFacturas();
  }, [cargarFacturas]);

  const hoy = hoyArgentina();

  const resumen = useMemo(() => {
    const esVencida = (f) => f.estado === "Vencido" || (f.estado === "Pendiente" && f.fechaVencimiento && f.fechaVencimiento < hoy);
    const pendientes = facturas.filter((f) => f.estado !== "Pagado");
    const vencidas = facturas.filter(esVencida);
    const proximas = pendientes.filter((f) => {
      if (!f.fechaVencimiento || esVencida(f)) return false;
      const dias = diasEntre(hoy, f.fechaVencimiento);
      return dias >= 0 && dias <= 7;
    });
    return {
      totalAPagar: pendientes.reduce((acc, f) => acc + f.total, 0),
      cantidadPendientes: pendientes.length,
      cantidadVencidas: vencidas.length,
      montoVencido: vencidas.reduce((acc, f) => acc + f.total, 0),
      cantidadProximas: proximas.length,
      montoProximas: proximas.reduce((acc, f) => acc + f.total, 0),
    };
  }, [facturas, hoy]);

  const facturasFiltradas = filtroEstado === "Todas" ? facturas : facturas.filter((f) => f.estado === filtroEstado);
  const cuenta = (estado) => (estado === "Todas" ? facturas.length : facturas.filter((f) => f.estado === estado).length);

  const handleCambiarEstado = async (id, estado) => {
    try {
      const actualizada = await actualizarEstadoFactura(id, estado);
      setFacturas((prev) => prev.map((f) => (f.id === id ? actualizada : f)));
      onAgregarToast(`Factura marcada como ${ESTADOS[estado]?.label.toLowerCase() ?? estado}`, "success");
    } catch (error) {
      onAgregarToast(error.message, "error");
    }
  };

  const handleEliminar = (factura) => {
    onConfirmar(
      `Se eliminará la factura ${factura.numeroComprobante || `#${factura.id}`}${
        factura.proveedorEmisor ? ` de ${factura.proveedorEmisor}` : ""
      } junto con su PDF. Esta acción no se puede deshacer.`,
      async () => {
        try {
          await eliminarFactura(factura.id);
          setFacturas((prev) => prev.filter((f) => f.id !== factura.id));
          onAgregarToast("Factura eliminada", "success");
        } catch (error) {
          onAgregarToast(error.message, "error");
        }
      },
      { titulo: "¿Eliminar la factura?", confirmar: "Eliminar" }
    );
  };

  const acciones = (f) => (
    <div className="flex items-center justify-end gap-1">
      {f.estado !== "Pagado" && (
        <Button variant="ghost" size="icon-sm" title="Marcar como pagada" aria-label="Marcar como pagada" onClick={() => handleCambiarEstado(f.id, "Pagado")}>
          <CircleCheck />
        </Button>
      )}
      {f.rutaArchivo && (
        <Button variant="ghost" size="icon-sm" asChild title="Ver PDF original">
          <a href={urlArchivoFactura(f.id)} target="_blank" rel="noopener noreferrer" aria-label="Ver PDF original">
            <FileText />
          </a>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Eliminar factura"
        aria-label="Eliminar factura"
        onClick={() => handleEliminar(f)}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-red-400 dark:hover:bg-destructive/15"
      >
        <Trash2 />
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Facturas de proveedores y su estado de pago."
        actions={
          <Button onClick={() => setModalAbierto(true)}>
            <Plus />
            Cargar factura
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Resumen
          titulo="A pagar"
          valor={formatearMoneda(resumen.totalAPagar)}
          detalle={`${resumen.cantidadPendientes} ${resumen.cantidadPendientes === 1 ? "factura sin pagar" : "facturas sin pagar"}`}
          icon={Wallet}
          tono="aviso"
          cargando={cargando}
        />
        <Resumen
          titulo="Vencen esta semana"
          valor={formatearMoneda(resumen.montoProximas)}
          detalle={resumen.cantidadProximas === 0 ? "Nada por vencer en 7 días" : `${resumen.cantidadProximas} ${resumen.cantidadProximas === 1 ? "factura" : "facturas"} en los próximos 7 días`}
          icon={CalendarClock}
          cargando={cargando}
        />
        <Resumen
          titulo="Vencidas"
          valor={formatearMoneda(resumen.montoVencido)}
          detalle={resumen.cantidadVencidas === 0 ? "No hay facturas vencidas" : `${resumen.cantidadVencidas} ${resumen.cantidadVencidas === 1 ? "factura vencida" : "facturas vencidas"}`}
          icon={TriangleAlert}
          tono={resumen.cantidadVencidas > 0 ? "peligro" : undefined}
          cargando={cargando}
        />
      </div>

      <Tabs value={filtroEstado} onValueChange={setFiltroEstado} className="mb-4">
        <TabsList className="h-10 w-full sm:w-fit">
          {FILTROS.map((f) => (
            <TabsTrigger key={f.valor} value={f.valor} className="gap-1.5 px-3 sm:px-4">
              {f.label}
              {!cargando && <span className="text-xs text-muted-foreground tabular-nums max-sm:hidden">{cuenta(f.valor)}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {cargando ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : facturasFiltradas.length === 0 ? (
        <EmptyState
          icon={FileUp}
          title={facturas.length === 0 ? "Todavía no cargaste facturas" : "No hay facturas en este estado"}
          description={facturas.length === 0 ? "Subí el PDF de una factura de proveedor y el sistema lee los datos por vos." : "Probá con otro filtro."}
          action={
            facturas.length === 0 && (
              <Button onClick={() => setModalAbierto(true)}>
                <Plus />
                Cargar factura
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm max-md:hidden">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <th className="h-11 pl-5 font-medium">Proveedor</th>
                <th className="h-11 font-medium max-lg:hidden">Emisión</th>
                <th className="h-11 font-medium">Vencimiento</th>
                <th className="h-11 text-right font-medium">Total</th>
                <th className="h-11 pl-6 font-medium">Estado</th>
                <th className="h-11 w-32 pr-5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {facturasFiltradas.map((f) => {
                const venc = textoVencimiento(f, hoy);
                return (
                  <tr key={f.id} className="transition-colors hover:bg-muted/40">
                    <td className="py-3 pl-5">
                      <p className="font-medium">{f.proveedorEmisor || "Sin proveedor"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{f.numeroComprobante || "Sin número"}</p>
                    </td>
                    <td className="py-3 whitespace-nowrap text-muted-foreground tabular-nums max-lg:hidden">{formatearFecha(f.fechaEmision)}</td>
                    <td className="py-3 whitespace-nowrap">
                      <p className="tabular-nums">{formatearFecha(f.fechaVencimiento)}</p>
                      {venc && <p className={cn("text-xs", venc.clase)}>{venc.texto}</p>}
                    </td>
                    <td className="py-3 text-right font-semibold whitespace-nowrap tabular-nums">{formatearMoneda(f.total)}</td>
                    <td className="py-3 pl-6">
                      <EstadoSelect factura={f} onCambiar={handleCambiarEstado} />
                    </td>
                    <td className="py-3 pr-5">{acciones(f)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="divide-y md:hidden">
            {facturasFiltradas.map((f) => {
              const venc = textoVencimiento(f, hoy);
              return (
                <li key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{f.proveedorEmisor || "Sin proveedor"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{f.numeroComprobante || "Sin número"}</p>
                    </div>
                    <p className="font-semibold whitespace-nowrap tabular-nums">{formatearMoneda(f.total)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vence {formatearFecha(f.fechaVencimiento)}
                    {venc && <span className={cn("ml-1", venc.clase)}>· {venc.texto}</span>}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <EstadoSelect factura={f} onCambiar={handleCambiarEstado} />
                    {acciones(f)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {modalAbierto && (
        <FacturaUploadModal
          onClose={() => setModalAbierto(false)}
          onSuccess={() => {
            setModalAbierto(false);
            cargarFacturas();
            onAgregarToast("Factura guardada", "success");
          }}
          onAgregarToast={onAgregarToast}
        />
      )}
    </div>
  );
}
