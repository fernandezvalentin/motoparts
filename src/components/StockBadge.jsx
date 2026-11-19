import { cn } from "@/lib/utils";

const ESTADOS = {
  sinStock: { label: "Sin stock", clase: "bg-destructive/12 text-red-400 ring-destructive/25", punto: "bg-destructive" },
  critico: { label: "Crítico", clase: "bg-destructive/12 text-red-400 ring-destructive/25", punto: "bg-destructive" },
  bajo: { label: "Bajo", clase: "bg-primary/12 text-amber-400 ring-primary/25", punto: "bg-primary" },
  ok: { label: "OK", clase: "bg-success/12 text-green-400 ring-success/25", punto: "bg-success" },
};

export function estadoStock(stockActual, stockMinimo) {
  if (stockActual <= 0) return "sinStock";
  if (stockActual <= stockMinimo) return "critico";
  if (stockActual <= stockMinimo * 2) return "bajo";
  return "ok";
}

export function StockBadge({ stockActual, stockMinimo, className }) {
  const estado = ESTADOS[estadoStock(stockActual, stockMinimo)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        estado.clase,
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", estado.punto)} />
      {estado.label}
    </span>
  );
}
