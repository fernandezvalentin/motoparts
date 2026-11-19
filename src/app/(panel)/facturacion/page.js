"use client";

import { FacturacionList } from "@/components/FacturacionList";
import { usePanel } from "@/components/PanelShell";

export default function FacturacionPage() {
  const { agregarToast, mostrarConfirm } = usePanel();
  return <FacturacionList onAgregarToast={agregarToast} onConfirmar={mostrarConfirm} />;
}
