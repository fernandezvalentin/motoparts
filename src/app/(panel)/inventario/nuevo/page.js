"use client";

import { ProductoForm } from "@/components/ProductoForm";
import { usePanel } from "@/components/PanelShell";

export default function NuevoProductoPage() {
  const { agregarToast, navegar } = usePanel();
  return <ProductoForm onAgregarToast={agregarToast} onNavegar={navegar} />;
}
