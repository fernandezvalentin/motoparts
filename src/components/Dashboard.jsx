"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleCheck,
  Package,
  RefreshCw,
  Receipt,
  TriangleAlert,
  Trophy,
  Truck,
} from "lucide-react";
import { obtenerEstadisticas, obtenerVentas } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StockBadge } from "./StockBadge";

const pesos = (valor) =>
  `$${Number(valor ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TONOS = {
  primario: "bg-primary/12 text-primary ring-primary/20",
  exito: "bg-success/12 text-green-400 ring-success/20",
  peligro: "bg-destructive/12 text-red-400 ring-destructive/20",
  neutro: "bg-secondary text-muted-foreground ring-border",
};

function Kpi({ titulo, valor, detalle, icon: Icono, tono = "neutro", href, alerta = false }) {
  const contenido = (
    <Card
      className={cn(
        "h-full gap-0 py-5 transition-colors",
        href && "hover:border-primary/40 hover:bg-secondary/60",
        alerta && "border-destructive/40"
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 px-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold tracking-tight tabular-nums lg:text-[1.7rem]", alerta && "text-red-400")}>
            {valor}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detalle}</p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", TONOS[tono])}>
          <Icono className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}

function KpiCargando() {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-32" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function BarraHorizontal({ etiqueta, valor, maximo, sufijo, posicion }) {
  return (
    <li>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {posicion !== undefined && (
            <span className="w-4 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular-nums">{posicion}</span>
          )}
          <span className="truncate" title={etiqueta}>{etiqueta}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{sufijo}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${Math.max(4, (valor / maximo) * 100)}%` }}
        />
      </div>
    </li>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarEstadisticas = useCallback(async () => {
    setCargando(true);
    const [data, ventas] = await Promise.all([obtenerEstadisticas(), obtenerVentas("hoy")]);
    setStats(data);
    setVentasHoy(Array.isArray(ventas) ? ventas : []);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  const fechaHoy = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const header = (
    <PageHeader
      title="Panel de control"
      description={`Resumen del negocio · ${fechaHoy.charAt(0).toUpperCase()}${fechaHoy.slice(1)}`}
      actions={
        <Button variant="outline" onClick={cargarEstadisticas} disabled={cargando}>
          <RefreshCw className={cn(cargando && "animate-spin")} />
          Actualizar
        </Button>
      }
    />
  );

  if (cargando && !stats) {
    return (
      <div>
        {header}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <KpiCargando key={i} />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        {header}
        <EmptyState
          icon={TriangleAlert}
          title="No se pudieron cargar las estadísticas"
          description="Revisá tu conexión a internet y volvé a intentar."
          action={<Button onClick={cargarEstadisticas}>Reintentar</Button>}
        />
      </div>
    );
  }

  const totalHoy = ventasHoy.reduce((suma, v) => suma + Number(v.total || 0), 0);
  const proveedores = Object.entries(stats.productosPorProveedor || {}).sort((a, b) => b[1] - a[1]);
  const maxProveedor = Math.max(...proveedores.map(([, c]) => c), 1);
  const proveedoresVisibles = proveedores.slice(0, 8);
  const otrosProveedores = proveedores.slice(8).reduce((s, [, c]) => s + c, 0);
  const topVendidos = stats.topVendidos || [];
  const maxVendidos = Math.max(...topVendidos.map((p) => p.cantidadVendida), 1);
  const alertas = stats.alertasStock || [];

  return (
    <div>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Ventas de hoy"
          valor={pesos(totalHoy)}
          detalle={ventasHoy.length === 0 ? "Todavía no hay ventas" : `${ventasHoy.length} ${ventasHoy.length === 1 ? "venta" : "ventas"}`}
          icon={Receipt}
          tono="primario"
          href="/historial"
        />
        <Kpi
          titulo="Valor del inventario"
          valor={pesos(stats.valorInventario)}
          detalle="Precio de venta × stock"
          icon={BadgeDollarSign}
          tono="exito"
        />
        <Kpi
          titulo="Stock crítico"
          valor={stats.productosStockCritico}
          detalle={stats.productosStockCritico > 0 ? "Bajo el stock mínimo" : "Todo en orden"}
          icon={TriangleAlert}
          tono={stats.productosStockCritico > 0 ? "peligro" : "neutro"}
          alerta={stats.productosStockCritico > 0}
          href="/inventario?stockBajo=true"
        />
        <Kpi
          titulo="Productos"
          valor={Number(stats.totalProductos).toLocaleString("es-AR")}
          detalle={`De ${stats.totalProveedores} ${stats.totalProveedores === 1 ? "proveedor" : "proveedores"}`}
          icon={Package}
          href="/inventario"
        />
      </div>

      {/* Alertas de stock */}
      <Card className="mt-6 gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-primary" />
            Alertas de stock
            {stats.productosStockCritico > 0 && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-red-400 tabular-nums">
                {stats.productosStockCritico}
              </span>
            )}
          </CardTitle>
          <CardDescription>Productos con stock igual o menor al mínimo</CardDescription>
          {alertas.length > 0 && (
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/inventario?stockBajo=true">
                  Ver todos
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        {alertas.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            <ul className="divide-y">
              {alertas.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={item.nombre}>{item.nombre}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <span className="font-mono">{item.sku}</span>
                      {item.proveedor && <> · {item.proveedor}</>}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground tabular-nums max-sm:hidden">
                    <span className={cn("text-sm font-semibold", item.stockActual <= 0 ? "text-red-400" : "text-foreground")}>
                      {item.stockActual}
                    </span>{" "}
                    / mín. {item.stockMinimo}
                  </div>
                  <StockBadge stockActual={item.stockActual} stockMinimo={item.stockMinimo} />
                </li>
              ))}
            </ul>
            {stats.productosStockCritico > alertas.length && (
              <p className="border-t px-6 py-3 text-center text-sm text-muted-foreground">
                Y {stats.productosStockCritico - alertas.length} productos más con stock bajo.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-6 py-8 text-sm text-muted-foreground">
            <CircleCheck className="size-5 text-green-400" />
            Todo el stock está en orden. No hay alertas.
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="gap-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-primary" />
              Más vendidos
            </CardTitle>
            <CardDescription>Los 5 productos con más unidades vendidas</CardDescription>
          </CardHeader>
          <CardContent>
            {topVendidos.length > 0 ? (
              <ol className="space-y-4">
                {topVendidos.map((prod, i) => (
                  <BarraHorizontal
                    key={prod.id}
                    posicion={i + 1}
                    etiqueta={prod.nombre}
                    valor={prod.cantidadVendida}
                    maximo={maxVendidos}
                    sufijo={`${prod.cantidadVendida} u.`}
                  />
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay ventas registradas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              Productos por proveedor
            </CardTitle>
            <CardDescription>Cantidad de artículos de cada proveedor</CardDescription>
          </CardHeader>
          <CardContent>
            {proveedoresVisibles.length > 0 ? (
              <ul className="space-y-4">
                {proveedoresVisibles.map(([prov, count]) => (
                  <BarraHorizontal
                    key={prov}
                    etiqueta={prov || "Sin proveedor"}
                    valor={count}
                    maximo={maxProveedor}
                    sufijo={`${count.toLocaleString("es-AR")} ${count === 1 ? "producto" : "productos"}`}
                  />
                ))}
                {otrosProveedores > 0 && (
                  <li className="text-xs text-muted-foreground">
                    Y {proveedores.length - 8} proveedores más ({otrosProveedores.toLocaleString("es-AR")} productos)
                  </li>
                )}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay proveedores cargados.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
