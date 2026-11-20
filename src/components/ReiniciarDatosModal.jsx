"use client";

import { useState } from "react";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { reiniciarDatos } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/app/Field";

const CONFIRMACION = "BORRAR TODO";

// Reinicio de datos para la etapa de prueba. Solo se muestra a administradores
// (y la base de datos vuelve a verificarlo).
export function ReiniciarDatosModal({ onClose }) {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const confirmado = texto.trim() === CONFIRMACION;

  const reiniciar = async (e) => {
    e.preventDefault();
    if (!confirmado) return;
    setCargando(true);
    setError(null);
    try {
      setResultado(await reiniciarDatos(texto.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Recarga completa para que ninguna pantalla siga mostrando datos borrados
  const terminar = () => window.location.reload();

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !cargando && (resultado ? terminar() : onClose())}>
      <DialogContent className="sm:max-w-md" showCloseButton={!cargando}>
        {resultado ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleCheck className="size-5 text-green-400" />
                Datos reiniciados
              </DialogTitle>
              <DialogDescription>La app quedó vacía y lista para empezar a cargar de nuevo.</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Se borró:</p>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Productos", resultado.productos],
                ["Ventas", resultado.ventas],
                ["Facturas", resultado.facturas],
                ["Movimientos", resultado.movimientos],
              ].map(([nombre, cantidad]) => (
                <li key={nombre} className="rounded-md bg-secondary px-3 py-2">
                  <span className="text-muted-foreground">{nombre}: </span>
                  <strong className="tabular-nums">{cantidad}</strong>
                </li>
              ))}
            </ul>
            {resultado.avisoPdfs && (
              <Alert>
                <TriangleAlert />
                <AlertDescription>{resultado.avisoPdfs}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button onClick={terminar}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={reiniciar} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert className="size-5 text-red-400" />
                Reiniciar todos los datos
              </DialogTitle>
              <DialogDescription>Para volver a empezar de cero. No se puede deshacer.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 text-sm">
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                <p className="font-medium text-red-300">Se borra</p>
                <p className="mt-1 text-muted-foreground">
                  Todos los productos y su stock, las ventas, las facturas con sus PDFs y el historial de movimientos.
                </p>
              </div>
              <div className="rounded-md border px-3 py-2.5">
                <p className="font-medium">Se mantiene</p>
                <p className="mt-1 text-muted-foreground">Los usuarios y sus contraseñas, y la configuración de la app.</p>
              </div>
            </div>

            <Field label={`Para confirmar, escribí ${CONFIRMACION}`} htmlFor="confirmar-reinicio">
              <Input
                id="confirmar-reinicio"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={CONFIRMACION}
                autoComplete="off"
                disabled={cargando}
              />
            </Field>

            {error && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={cargando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={!confirmado || cargando}>
                {cargando && <Loader2 className="animate-spin" />}
                {cargando ? "Borrando..." : "Borrar todo"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
