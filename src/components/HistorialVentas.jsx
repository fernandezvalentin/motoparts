"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  MessageCircle,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { obtenerVentas, eliminarVenta } from "@/lib/api";
import { formatearFecha, htmlTicket, numeroComprobante, textoTicket } from "@/lib/ticket";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";

const PERIODOS = [
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Semana" },
  { valor: "mes", label: "Mes" },
  { valor: "año", label: "Año" },
  { valor: "todas", label: "Todas" },
];

const ICONOS_PAGO = { Efectivo: Banknote, Débito: CreditCard, Crédito: CreditCard, Transferencia: ArrowLeftRight };

const pesos = (valor) =>
  `$${Number(valor ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function MedioPago({ metodo }) {
  const Icono = ICONOS_PAGO[metodo] ?? Banknote;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border ring-inset">
      <Icono className="size-3.5" />
      {metodo || "Efectivo"}
    </span>
  );
}

function Resumen({ ventas, cargando }) {
  const total = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
  const porMetodo = ventas.reduce((acc, v) => {
    const m = v.metodoPago || "Efectivo";
    acc[m] = (acc[m] || 0) + Number(v.total || 0);
    return acc;
  }, {});

  const datos = [
    { titulo: "Total vendido", valor: pesos(total), destacado: true },
    { titulo: "Ventas", valor: ventas.length.toLocaleString("es-AR") },
    { titulo: "Ticket promedio", valor: ventas.length ? pesos(Math.round(total / ventas.length)) : "—" },
  ];

  return (
    <Card className="mb-6 gap-0 py-0">
      <CardContent className="grid grid-cols-3 divide-x px-0">
        {datos.map((d) => (
          <div key={d.titulo} className="min-w-0 px-3 py-3 sm:px-5 sm:py-4">
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{d.titulo}</p>
            {cargando ? (
              <Skeleton className="mt-2 h-7 w-28" />
            ) : (
              <p className={cn("mt-1 truncate text-base font-bold tracking-tight tabular-nums sm:text-2xl", d.destacado && "text-primary")}>{d.valor}</p>
            )}
          </div>
        ))}
      </CardContent>
      {!cargando && Object.keys(porMetodo).length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t px-3 py-3 text-sm sm:px-5">
          {Object.entries(porMetodo)
            .sort((a, b) => b[1] - a[1])
            .map(([metodo, monto]) => {
              const Icono = ICONOS_PAGO[metodo] ?? Banknote;
              return (
                <span key={metodo} className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Icono className="size-4" />
                  {metodo}
                  <span className="font-semibold text-foreground tabular-nums">{pesos(monto)}</span>
                </span>
              );
            })}
        </div>
      )}
    </Card>
  );
}

function AccionesVenta({ onWhatsApp, onImprimir, onEliminar }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onWhatsApp} title="Enviar por WhatsApp" aria-label="Enviar el ticket por WhatsApp">
        <MessageCircle />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onImprimir} title="Imprimir ticket" aria-label="Imprimir ticket">
        <Printer />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onEliminar}
        title="Anular venta"
        aria-label="Anular venta"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-red-400 dark:hover:bg-destructive/15"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function DetalleItems({ detalles }) {
  const visibles = detalles.slice(0, 3);
  return (
    <ul className="space-y-0.5 text-sm">
      {visibles.map((d) => (
        <li key={d.id} className="truncate text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{d.cantidad}×</span> {d.producto?.nombre || "Producto eliminado"}
        </li>
      ))}
      {detalles.length > 3 && <li className="text-xs text-muted-foreground">y {detalles.length - 3} productos más</li>}
    </ul>
  );
}

export function HistorialVentas({ onConfirmar, onAgregarToast }) {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("hoy");

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    const data = await obtenerVentas(filtro);
    setVentas(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [filtro]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al cambiar el filtro
    cargarHistorial();
  }, [cargarHistorial]);

  const handleEliminarVenta = (venta) => {
    onConfirmar(
      `Se anulará la venta ${numeroComprobante(venta.id)} por ${pesos(venta.total)} y se devolverá el stock de los productos vendidos.`,
      async () => {
        const ok = await eliminarVenta(venta.id);
        if (ok) {
          onAgregarToast("Venta anulada. Se devolvió el stock.", "success");
          cargarHistorial();
        } else {
          onAgregarToast("Error al anular la venta.", "error");
        }
      },
      { titulo: "¿Anular esta venta?", confirmar: "Anular venta" }
    );
  };

  // Abre WhatsApp (web o app) con el ticket listo para elegir el contacto y enviarlo
  const handleEnviarWhatsApp = (venta) => {
    const ventana = window.open(`https://wa.me/?text=${encodeURIComponent(textoTicket(venta))}`, "_blank");
    if (!ventana) {
      onAgregarToast("El navegador bloqueó la ventana emergente.", "error");
      return;
    }
    ventana.opener = null;
  };

  const handleImprimirTicket = (venta) => {
    const ventana = window.open("", "_blank");
    if (!ventana) {
      onAgregarToast("El navegador bloqueó la ventana emergente.", "error");
      return;
    }
    ventana.document.write(htmlTicket(venta));
    ventana.document.close();
  };

  const periodo = PERIODOS.find((p) => p.valor === filtro)?.label.toLowerCase();

  return (
    <div>
      <PageHeader
        title="Historial de ventas"
        description="Ventas registradas, tickets y anulaciones."
        actions={
          <Button variant="outline" onClick={cargarHistorial} disabled={cargando}>
            <RefreshCw className={cn(cargando && "animate-spin")} />
            Actualizar
          </Button>
        }
      />

      <Tabs value={filtro} onValueChange={setFiltro} className="mb-4">
        <TabsList className="h-10 w-full sm:w-fit">
          {PERIODOS.map((p) => (
            <TabsTrigger key={p.valor} value={p.valor} className="px-3 sm:px-4">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Resumen ventas={ventas} cargando={cargando} />

      {!cargando && ventas.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtro === "todas" ? "Todavía no hay ventas" : `No hay ventas ${filtro === "hoy" ? "hoy" : `en este ${periodo}`}`}
          description="Las ventas que registres en el punto de venta van a aparecer acá."
          action={
            <Button asChild>
              <Link href="/pos">
                <ShoppingCart />
                Ir al punto de venta
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* Escritorio */}
          <table className="w-full text-sm max-md:hidden">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <th className="h-11 w-44 pl-5 font-medium">Venta</th>
                <th className="h-11 font-medium">Detalle</th>
                <th className="h-11 w-40 font-medium max-lg:hidden">Pago</th>
                <th className="h-11 w-32 text-right font-medium">Total</th>
                <th className="h-11 w-32 pr-5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cargando
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td className="py-4 pl-5"><Skeleton className="h-4 w-16" /><Skeleton className="mt-2 h-3 w-28" /></td>
                      <td><Skeleton className="h-4 w-56" /></td>
                      <td className="max-lg:hidden"><Skeleton className="h-5 w-20" /></td>
                      <td><Skeleton className="ml-auto h-4 w-20" /></td>
                      <td className="pr-5"><Skeleton className="ml-auto h-7 w-24" /></td>
                    </tr>
                  ))
                : ventas.map((venta) => (
                    <tr key={venta.id} className="align-top transition-colors hover:bg-muted/40">
                      <td className="py-3.5 pl-5">
                        <p className="font-semibold tabular-nums">{numeroComprobante(venta.id)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatearFecha(venta.fechaVenta)}</p>
                      </td>
                      <td className="max-w-0 py-3.5 pr-4">
                        <DetalleItems detalles={venta.detalles} />
                      </td>
                      <td className="py-3.5 max-lg:hidden">
                        <MedioPago metodo={venta.metodoPago} />
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <p className="font-semibold tabular-nums">{pesos(venta.total)}</p>
                        {venta.descuentoPorcentaje > 0 && (
                          <p className="text-xs text-green-400">−{venta.descuentoPorcentaje}% desc.</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-5">
                        <AccionesVenta
                          onWhatsApp={() => handleEnviarWhatsApp(venta)}
                          onImprimir={() => handleImprimirTicket(venta)}
                          onEliminar={() => handleEliminarVenta(venta)}
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {/* Celular */}
          <ul className="divide-y md:hidden">
            {cargando
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="space-y-2 p-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-3/4" />
                  </li>
                ))
              : ventas.map((venta) => (
                  <li key={venta.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold tabular-nums">{numeroComprobante(venta.id)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatearFecha(venta.fechaVenta)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{pesos(venta.total)}</p>
                        {venta.descuentoPorcentaje > 0 && (
                          <p className="text-xs text-green-400">−{venta.descuentoPorcentaje}% desc.</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <DetalleItems detalles={venta.detalles} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <MedioPago metodo={venta.metodoPago} />
                      <AccionesVenta
                        onWhatsApp={() => handleEnviarWhatsApp(venta)}
                        onImprimir={() => handleImprimirTicket(venta)}
                        onEliminar={() => handleEliminarVenta(venta)}
                      />
                    </div>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}
