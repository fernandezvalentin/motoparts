"use client";

import { useState } from "react";
import { FileText, Info, Loader2, TriangleAlert } from "lucide-react";
import {
  MAX_MB_FACTURA,
  crearFactura,
  descartarPdfFactura,
  extraerDatosFactura,
  subirPdfFactura,
} from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/app/Field";
import { FileDrop } from "@/components/app/FileDrop";

const DATOS_VACIOS = {
  numeroComprobante: "",
  proveedorEmisor: "",
  fechaEmision: "",
  fechaVencimiento: "",
  total: "",
  estado: "Pendiente",
};

export function FacturaUploadModal({ onClose, onSuccess, onAgregarToast }) {
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [rutaSubida, setRutaSubida] = useState(null);
  const [sinTexto, setSinTexto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(1); // 1: elegir PDF, 2: revisar datos
  const [datos, setDatos] = useState(DATOS_VACIOS);

  const handleArchivo = (archivo) => {
    if (archivo.type !== "application/pdf") {
      onAgregarToast("El archivo debe ser un PDF.", "warning");
      return;
    }
    if (archivo.size > MAX_MB_FACTURA * 1024 * 1024) {
      onAgregarToast(`El PDF no puede superar los ${MAX_MB_FACTURA} MB.`, "warning");
      return;
    }
    // Si ya se había subido otro PDF, se descarta
    if (rutaSubida) {
      descartarPdfFactura(rutaSubida).catch(() => {});
      setRutaSubida(null);
    }
    setArchivoPdf(archivo);
  };

  const handleExtraerDatos = async () => {
    if (!archivoPdf) return;
    setCargando(true);
    let ruta = rutaSubida;
    try {
      if (!ruta) {
        ruta = await subirPdfFactura(archivoPdf);
        setRutaSubida(ruta);
      }
      const extraidos = await extraerDatosFactura(ruta);
      setDatos({
        numeroComprobante: extraidos.numeroComprobante || "",
        proveedorEmisor: extraidos.proveedorEmisor || "",
        fechaEmision: extraidos.fechaEmision || "",
        fechaVencimiento: extraidos.fechaVencimiento || "",
        total: extraidos.total ? String(extraidos.total) : "",
        estado: "Pendiente",
      });
      setSinTexto(Boolean(extraidos.sinTexto));
      setPaso(2);
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (e) => {
    e?.preventDefault();
    const total = Number(datos.total || 0);
    if (!Number.isFinite(total) || total < 0) {
      onAgregarToast("Ingresá un total válido.", "warning");
      return;
    }
    setCargando(true);
    try {
      await crearFactura({ ...datos, total, rutaArchivo: rutaSubida });
      onSuccess();
    } catch (error) {
      onAgregarToast(error.message, "error");
      setCargando(false);
    }
  };

  // Al cancelar se borra el PDF que ya se había subido y no se llegó a guardar
  const handleCancelar = () => {
    if (cargando) return;
    if (rutaSubida) descartarPdfFactura(rutaSubida).catch(() => {});
    onClose();
  };

  const set = (campo) => (e) => setDatos((prev) => ({ ...prev, [campo]: e.target.value }));

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && handleCancelar()}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => cargando && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{paso === 1 ? "Cargar factura de proveedor" : "Revisar datos de la factura"}</DialogTitle>
          <DialogDescription>
            {paso === 1
              ? "Subí el PDF y el sistema va a intentar leer el número, el proveedor, las fechas y el total."
              : "Revisá y corregí lo que se leyó del PDF antes de guardar."}
          </DialogDescription>
        </DialogHeader>

        {paso === 1 ? (
          <FileDrop
            accept="application/pdf"
            archivo={archivoPdf}
            onFile={handleArchivo}
            disabled={cargando}
            icon={FileText}
            titulo="Arrastrá el PDF acá o hacé clic para buscarlo"
            detalle={`Solo PDF, hasta ${MAX_MB_FACTURA} MB`}
          />
        ) : (
          <form id="form-factura" onSubmit={handleGuardar} className="grid gap-4">
            {sinTexto ? (
              <Alert className="border-primary/30 bg-primary/5 text-amber-300">
                <TriangleAlert />
                <AlertDescription className="text-amber-200/90">
                  El PDF parece ser una imagen escaneada y no se pudo leer el texto. Completá los datos a mano.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info />
                <AlertDescription>Los datos se completaron automáticamente. Verificalos con la factura.</AlertDescription>
              </Alert>
            )}

            <Field label="Proveedor / emisor" htmlFor="proveedorEmisor">
              <Input id="proveedorEmisor" value={datos.proveedorEmisor} onChange={set("proveedorEmisor")} placeholder="Ej: FAR Motopartes" />
            </Field>
            <Field label="N° de comprobante" htmlFor="numeroComprobante">
              <Input id="numeroComprobante" value={datos.numeroComprobante} onChange={set("numeroComprobante")} placeholder="00001-00001234" className="font-mono" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha de emisión" htmlFor="fechaEmision">
                <Input id="fechaEmision" type="date" value={datos.fechaEmision} onChange={set("fechaEmision")} />
              </Field>
              <Field label="Fecha de vencimiento" htmlFor="fechaVencimiento">
                <Input id="fechaVencimiento" type="date" value={datos.fechaVencimiento} onChange={set("fechaVencimiento")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total" htmlFor="total">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input id="total" type="number" min="0" step="0.01" className="pl-7 tabular-nums" value={datos.total} onChange={set("total")} placeholder="0,00" />
                </div>
              </Field>
              <Field label="Estado" htmlFor="estado">
                <Select value={datos.estado} onValueChange={(v) => setDatos((prev) => ({ ...prev, estado: v }))}>
                  <SelectTrigger id="estado" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Pagado">Pagada</SelectItem>
                    <SelectItem value="Vencido">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </form>
        )}

        <DialogFooter>
          {paso === 2 && (
            <Button variant="ghost" onClick={() => setPaso(1)} disabled={cargando} className="sm:mr-auto">
              Volver
            </Button>
          )}
          <Button variant="outline" onClick={handleCancelar} disabled={cargando}>
            Cancelar
          </Button>
          {paso === 1 ? (
            <Button onClick={handleExtraerDatos} disabled={!archivoPdf || cargando}>
              {cargando && <Loader2 className="animate-spin" />}
              {cargando ? "Leyendo PDF..." : "Continuar"}
            </Button>
          ) : (
            <Button type="submit" form="form-factura" disabled={cargando}>
              {cargando && <Loader2 className="animate-spin" />}
              {cargando ? "Guardando..." : "Guardar factura"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
