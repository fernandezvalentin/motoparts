"use client";

import { useId, useState } from "react";
import { FileCheck2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

// Zona para arrastrar un archivo o hacer clic y buscarlo
export function FileDrop({ accept, onFile, archivo, disabled, titulo, detalle, icon: Icono = Upload }) {
  const id = useId();
  const [arrastrando, setArrastrando] = useState(false);

  const elegir = (file) => {
    if (file && !disabled) onFile(file);
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        elegir(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        "hover:border-primary/50 hover:bg-primary/5 has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
        arrastrando && "border-primary bg-primary/10",
        archivo && "border-solid border-primary/40 bg-primary/5",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full ring-1",
          archivo ? "bg-primary/15 text-primary ring-primary/30" : "bg-muted text-muted-foreground ring-border"
        )}
      >
        {archivo ? <FileCheck2 className="size-6" /> : <Icono className="size-6" />}
      </span>
      <span>
        <span className="block text-sm font-medium">{archivo ? archivo.name : titulo}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {archivo ? `${(archivo.size / 1024).toLocaleString("es-AR", { maximumFractionDigits: 0 })} KB · Tocá para cambiarlo` : detalle}
        </span>
      </span>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          elegir(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
