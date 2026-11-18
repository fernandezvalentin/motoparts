"use client";

import { PuntoVenta } from "@/components/PuntoVenta";
import { usePanel } from "@/components/PanelShell";

export default function PuntoVentaPage() {
  const { agregarToast } = usePanel();
  return <PuntoVenta onAgregarToast={agregarToast} />;
}
