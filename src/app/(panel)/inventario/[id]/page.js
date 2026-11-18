"use client";

import { use, useEffect, useState } from "react";
import { ProductoForm } from "@/components/ProductoForm";
import { usePanel } from "@/components/PanelShell";
import { obtenerProducto } from "@/lib/api";

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
      <div className="card" style={{ maxWidth: 800 }}>
        <div className="skeleton" style={{ width: 240, height: 24 }} />
        <div className="skeleton" style={{ width: "100%", height: 200, marginTop: 16 }} />
      </div>
    );
  }

  if (!estado.producto) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <p className="empty-state-title">Producto no encontrado</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navegar("inventario")}>
          Volver al inventario
        </button>
      </div>
    );
  }

  return <ProductoForm productoAEditar={estado.producto} onAgregarToast={agregarToast} onNavegar={navegar} />;
}
