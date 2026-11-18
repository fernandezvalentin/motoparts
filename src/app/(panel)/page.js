"use client";

import { Dashboard } from "@/components/Dashboard";
import { usePanel } from "@/components/PanelShell";

export default function DashboardPage() {
  const { navegar } = usePanel();
  return <Dashboard onNavegar={navegar} />;
}
