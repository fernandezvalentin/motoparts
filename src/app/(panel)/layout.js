import { PanelShell } from "@/components/PanelShell";

// Todas las páginas del panel requieren sesión (lo verifica src/proxy.js)
export default function PanelLayout({ children }) {
  return <PanelShell>{children}</PanelShell>;
}
