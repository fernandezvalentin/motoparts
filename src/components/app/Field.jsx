import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Campo de formulario: etiqueta, control, ayuda y error
export function Field({ label, htmlFor, hint, error, required, className, children }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm">
          {label}
          {required && <span className="text-primary">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
