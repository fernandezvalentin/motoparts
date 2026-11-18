"use client";

import { HistorialVentas } from "@/components/HistorialVentas";
import { usePanel } from "@/components/PanelShell";

export default function HistorialPage() {
  const { agregarToast, mostrarConfirm } = usePanel();
  return <HistorialVentas onConfirmar={mostrarConfirm} onAgregarToast={agregarToast} />;
}
