"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { actualizarCredenciales } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/app/Field";

export const ConfiguracionModal = ({ onClose, onLogout }) => {
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevaContraseña, setNuevaContraseña] = useState("");
  const [confirmarContraseña, setConfirmarContraseña] = useState("");
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoEmail && !nuevaContraseña) {
      setError("Ingresá un email nuevo, una contraseña nueva o ambos.");
      return;
    }
    if (nuevaContraseña && nuevaContraseña.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (nuevaContraseña && nuevaContraseña !== confirmarContraseña) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    setError(null);
    try {
      await actualizarCredenciales(nuevoEmail, nuevaContraseña);
      setExito(true);
      // Por seguridad se cierra la sesión después de cambiar los datos de acceso
      setTimeout(() => onLogout(), 3000);
    } catch (err) {
      setError(err.message || "Error al actualizar los datos de acceso.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !exito && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={!exito}>
        <DialogHeader>
          <DialogTitle>Configuración de la cuenta</DialogTitle>
          <DialogDescription>
            Cambiá tu email, tu contraseña o ambos. Lo que dejes en blanco no se modifica.
          </DialogDescription>
        </DialogHeader>

        {exito ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-green-400 ring-1 ring-success/30">
              <CircleCheck className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Datos actualizados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Por seguridad vas a tener que volver a iniciar sesión.
                {nuevoEmail && " Si cambiaste el email, revisá tu correo para confirmarlo."}
              </p>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Cerrando sesión...
            </p>
          </div>
        ) : (
          <form id="form-config" onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field label="Nuevo email" htmlFor="nuevo-email" hint="Te vamos a mandar un correo para confirmarlo.">
              <Input
                id="nuevo-email"
                type="email"
                autoComplete="email"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
              />
            </Field>
            <Field label="Nueva contraseña" htmlFor="nueva-pass" hint="Mínimo 6 caracteres.">
              <Input
                id="nueva-pass"
                type="password"
                autoComplete="new-password"
                value={nuevaContraseña}
                onChange={(e) => setNuevaContraseña(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {nuevaContraseña && (
              <Field label="Repetir contraseña" htmlFor="repetir-pass" className="animate-in fade-in-0 slide-in-from-top-1">
                <Input
                  id="repetir-pass"
                  type="password"
                  autoComplete="new-password"
                  value={confirmarContraseña}
                  onChange={(e) => setConfirmarContraseña(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            )}
          </form>
        )}

        {!exito && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={cargando}>
              Cancelar
            </Button>
            <Button type="submit" form="form-config" disabled={cargando}>
              {cargando && <Loader2 className="animate-spin" />}
              {cargando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
