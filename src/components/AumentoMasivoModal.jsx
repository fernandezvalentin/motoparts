"use client";

import { useState, useEffect } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { aumentoMasivo, obtenerProveedores } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/app/Field";

const OPERACIONES = [
  { valor: "Ambos", titulo: "Costo y precio", detalle: "Sube o baja los dos" },
  { valor: "Publico", titulo: "Solo precio al público", detalle: "El costo no cambia" },
  { valor: "Costo", titulo: "Solo costo", detalle: "El precio no cambia" },
  { valor: "FijarMargen", titulo: "Fijar margen", detalle: "Precio = costo + margen" },
];
const TODOS = "Todos";

const pesos = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;

export function AumentoMasivoModal({ onCerrar, onCompletado, onAgregarToast }) {
  const [tipoOperacion, setTipoOperacion] = useState("Ambos");
  const [porcentaje, setPorcentaje] = useState("");
  const [proveedor, setProveedor] = useState(TODOS);
  const [marca, setMarca] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    obtenerProveedores()
      .then((data) => {
        if (Array.isArray(data)) setProveedores(data.filter(Boolean));
      })
      .catch(console.error);
  }, []);

  const valor = parseFloat(porcentaje);
  const valido = Number.isFinite(valor) && valor !== 0 && (tipoOperacion !== "FijarMargen" || valor > 0);
  const esMargen = tipoOperacion === "FijarMargen";

  const cambiar = (setter) => (v) => {
    setter(v);
    setConfirmando(false);
  };

  // Ejemplo para que se entienda el efecto antes de aplicar
  const ejemplo = (() => {
    if (!valido) return null;
    if (esMargen) return `Un producto que cuesta ${pesos(10000)} va a quedar a ${pesos(10000 * (1 + valor / 100))}.`;
    const quien = tipoOperacion === "Costo" ? "costo" : "precio";
    return `Un ${quien} de ${pesos(10000)} pasa a ${pesos(10000 * (1 + valor / 100))}.`;
  })();

  const alcance = [
    proveedor !== TODOS ? `del proveedor "${proveedor}"` : null,
    marca.trim() ? `de la marca "${marca.trim()}"` : null,
  ].filter(Boolean);
  const textoAlcance = alcance.length ? `los productos ${alcance.join(" y ")}` : "TODOS los productos del inventario";

  const handleAplicar = async () => {
    if (!valido) return;
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setProcesando(true);
    try {
      const res = await aumentoMasivo({
        tipoOperacion,
        porcentaje: valor,
        proveedor: proveedor === TODOS ? "" : proveedor,
        marca: marca.trim(),
      });
      onAgregarToast(res.message, "success");
      onCompletado();
    } catch (error) {
      onAgregarToast(error.message || "Error al aplicar la operación.", "error");
      setProcesando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !procesando && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestión de precios</DialogTitle>
          <DialogDescription>Aumentá, bajá o fijá el margen de muchos productos a la vez.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de operación">
            {OPERACIONES.map((op) => (
              <button
                key={op.valor}
                type="button"
                role="radio"
                aria-checked={tipoOperacion === op.valor}
                onClick={() => cambiar(setTipoOperacion)(op.valor)}
                className={cn(
                  "rounded-lg border bg-background px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  tipoOperacion === op.valor ? "border-primary bg-primary/10" : "hover:border-muted-foreground/40"
                )}
              >
                <span className={cn("block text-sm font-medium", tipoOperacion === op.valor && "text-primary")}>{op.titulo}</span>
                <span className="block text-xs text-muted-foreground">{op.detalle}</span>
              </button>
            ))}
          </div>

          <Field
            label={esMargen ? "Margen sobre el costo" : "Porcentaje"}
            htmlFor="porcentaje"
            hint={ejemplo ?? (esMargen ? "Ej: 50 para vender a costo + 50%." : "Positivo para aumentar (15) o negativo para bajar (-10).")}
          >
            <div className="relative">
              <Input
                id="porcentaje"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="h-11 pr-9 text-lg font-semibold tabular-nums"
                placeholder={esMargen ? "50" : "15"}
                value={porcentaje}
                onChange={(e) => cambiar(setPorcentaje)(e.target.value)}
                autoFocus
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </Field>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">¿A qué productos?</p>
            <p className="mb-3 text-xs text-muted-foreground">Si no elegís nada, se aplica a todo el inventario.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Proveedor" htmlFor="am-proveedor">
                <Select value={proveedor} onValueChange={cambiar(setProveedor)}>
                  <SelectTrigger id="am-proveedor" className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {proveedores.length > 0 && <SelectSeparator />}
                    {proveedores.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marca" htmlFor="am-marca">
                <Input id="am-marca" className="bg-background" placeholder="Todas" value={marca} onChange={(e) => cambiar(setMarca)(e.target.value)} />
              </Field>
            </div>
          </div>

          {confirmando && (
            <Alert className="border-primary/30 bg-primary/5 text-amber-300 animate-in fade-in-0">
              <TriangleAlert />
              <AlertDescription className="text-amber-200/90">
                {esMargen
                  ? `Se va a recalcular el precio al público de ${textoAlcance} con un margen del ${valor}% sobre el costo.`
                  : `Se va a aplicar un ${valor > 0 ? "aumento" : "descuento"} del ${Math.abs(valor)}% a ${textoAlcance}.`}{" "}
                No se puede deshacer automáticamente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </Button>
          <Button onClick={handleAplicar} disabled={procesando || !valido}>
            {procesando && <Loader2 className="animate-spin" />}
            {procesando ? "Aplicando..." : confirmando ? "Sí, aplicar" : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
