import { cn } from "@/lib/utils";

// Mensaje para listas vacías o búsquedas sin resultados
export function EmptyState({ icon: Icono, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center", className)}>
      {Icono && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
          <Icono className="size-6" />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
