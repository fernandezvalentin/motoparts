"use client";

import { use, useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import { ProductoForm } from "@/components/ProductoForm";
import { usePanel } from "@/components/PanelShell";
import { obtenerProducto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/EmptyState";

export default function EditarProductoPage({ params }) {
  const { id } = use(params);
  const { agregarToast, navegar } = usePanel();
  const [estado, setEstado] = useState({ cargando: true, producto: null });

  useEffect(() => {
    let activo = true;
    obtenerProducto(id).then((producto) => {
      if (activo) setEstado({ cargando: false, producto });
    });
    return () => {
      activo = false;
    };
  }, [id]);

  if (estado.cargando) {
    return (
      <div>
        <Skeleton className="mb-3 h-8 w-28" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!estado.producto) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Producto no encontrado"
        description="Puede que lo hayan eliminado o que el enlace sea incorrecto."
        action={<Button onClick={() => navegar("inventario")}>Volver al inventario</Button>}
      />
    );
  }

  return <ProductoForm productoAEditar={estado.producto} onAgregarToast={agregarToast} onNavegar={navegar} />;
}
