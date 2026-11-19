"use client";

import { useState, useEffect } from "react";
import { ArrowDown, Loader2, TriangleAlert } from "lucide-react";
import { obtenerProveedores, renombrarProveedor } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/app/Field";

export function RenombrarProveedorModal({ onCerrar, onCompletado, onAgregarToast }) {
  const [viejo, setViejo] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    obtenerProveedores()
      .then((data) => {
        if (Array.isArray(data)) setProveedores(data);
      })
      .catch(console.error);
  }, []);

  const nombreNuevo = nuevo.trim();
  const valido = viejo && nombreNuevo && nombreNuevo !== viejo;
  const fusiona = proveedores.includes(nombreNuevo) && nombreNuevo !== viejo;

  const handleAplicar = async () => {
    if (!valido) return;
    // Primer clic: pide confirmación; segundo clic: aplica
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setProcesando(true);
    try {
      const res = await renombrarProveedor(viejo, nombreNuevo);
      onAgregarToast(res.message, "success");
      onCompletado();
    } catch (error) {
      onAgregarToast(error.message || "Error al renombrar el proveedor.", "error");
      setProcesando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !procesando && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renombrar proveedor</DialogTitle>
          <DialogDescription>
            Pasa todos los productos de un proveedor a otro nombre. Útil cuando una importación dejó el mismo proveedor escrito de dos formas (por ejemplo, &quot;FAR MOTOPARTES&quot; y &quot;FAR&quot;).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Proveedor actual" htmlFor="prov-viejo">
            <Select
              value={viejo}
              onValueChange={(v) => {
                setViejo(v);
                setConfirmando(false);
              }}
            >
              <SelectTrigger id="prov-viejo" className="w-full">
                <SelectValue placeholder="Elegí un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <ArrowDown className="mx-auto size-4 text-muted-foreground" />
          <Field label="Nombre nuevo" htmlFor="prov-nuevo" hint={fusiona ? "Ya existe: los productos se van a unir a ese proveedor." : undefined}>
            <Input
              id="prov-nuevo"
              list="lista-proveedores-renombrar"
              placeholder="Ej: FAR"
              value={nuevo}
              onChange={(e) => {
                setNuevo(e.target.value);
                setConfirmando(false);
              }}
            />
            <datalist id="lista-proveedores-renombrar">
              {proveedores.filter((p) => p !== viejo).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>

          {confirmando && (
            <Alert className="border-primary/30 bg-primary/5 text-amber-300 animate-in fade-in-0">
              <TriangleAlert />
              <AlertDescription className="text-amber-200/90">
                Todos los productos de &quot;{viejo}&quot; van a pasar a &quot;{nombreNuevo}&quot;. No se puede deshacer automáticamente.
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
            {procesando ? "Renombrando..." : confirmando ? "Sí, renombrar" : "Renombrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
