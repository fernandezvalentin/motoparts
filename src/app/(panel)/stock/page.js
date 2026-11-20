"use client";

import { CargarStock } from "@/components/CargarStock";
import { usePanel } from "@/components/PanelShell";

export default function CargarStockPage() {
  const { agregarToast, mostrarConfirm } = usePanel();
  return <CargarStock onAgregarToast={agregarToast} onConfirmar={mostrarConfirm} />;
}
