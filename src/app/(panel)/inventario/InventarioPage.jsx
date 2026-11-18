"use client";

import { useRouter } from "next/navigation";
import { InventarioList } from "@/components/InventarioList";
import { usePanel } from "@/components/PanelShell";

export function InventarioPage({ stockBajoInicial }) {
  const router = useRouter();
  const { agregarToast, mostrarConfirm } = usePanel();

  return (
    <InventarioList
      onEditar={(producto) => router.push(`/inventario/${producto.id}`)}
      onAgregarToast={agregarToast}
      onConfirmar={mostrarConfirm}
      stockBajoInicial={stockBajoInicial}
    />
  );
}
