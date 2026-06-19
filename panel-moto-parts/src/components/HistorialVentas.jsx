// src/components/HistorialVentas.jsx
import { useState, useEffect } from "react";
import { obtenerVentas, limpiarVentas, eliminarVenta } from "../services/api";
import "./HistorialVentas.css";

export function HistorialVentas({ onConfirmar, onAgregarToast }) {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    cargarHistorial();
  }, [filtro]);

  const cargarHistorial = async () => {
    setCargando(true);
    const data = await obtenerVentas(filtro);
    setVentas(data);
    setCargando(false);
  };

  const handleLimpiarHistorial = () => {
    onConfirmar(
      "¿Estás seguro de que querés borrar todo el historial de ventas? Esta acción NO se puede deshacer.",
      async () => {
        const ok = await limpiarVentas();
        if (ok) {
          onAgregarToast("Historial de ventas borrado exitosamente.", "success");
          cargarHistorial();
        } else {
          onAgregarToast("Error al borrar el historial de ventas.", "error");
        }
      }
    );
  };

  const handleEliminarVenta = (id) => {
    onConfirmar(
      "¿Querés eliminar esta venta? Se devolverá el stock de los repuestos vendidos.",
      async () => {
        const ok = await eliminarVenta(id);
        if (ok) {
          onAgregarToast("Venta eliminada. Stock restaurado.", "success");
          cargarHistorial();
        } else {
          onAgregarToast("Error al eliminar la venta.", "error");
        }
      }
    );
  };

  const formatearFecha = (fechaUtc) => {
    const fecha = new Date(fechaUtc);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(fecha);
  };

  const generarTextoTicket = (venta) => {
    let texto = `*FERNANDEZ MOTO PARTS*\nVenta de repuestos y accesorios de motos\nBelgrano, 998. Bragado, Prov. de Buenos Aires\n2342-413823\n\n`;
    texto += `Fecha: ${formatearFecha(venta.fechaVenta)}\n`;
    texto += `Comprobante Nº: #${venta.id.toString().padStart(4, "0")}\n`;
    texto += `--------------------------------\n`;
    venta.detalles.forEach(d => {
      const nombre = d.producto?.nombre || "Producto eliminado";
      const sku = d.producto?.sku ? ` (SKU: ${d.producto.sku})` : "";
      const subtotal = d.cantidad * d.precioUnitario;
      texto += `${d.cantidad}x ${nombre}${sku}\n   $ ${subtotal.toLocaleString("es-AR")}\n`;
    });
    texto += `--------------------------------\n`;
    texto += `TOTAL: $ ${venta.total.toLocaleString("es-AR")}\n`;
    texto += `Método de Pago: ${venta.metodoPago || "Efectivo"}\n\n`;
    texto += `¡Gracias por su compra!`;
    return texto;
  };

  const handleCopiarTicket = (venta) => {
    const texto = generarTextoTicket(venta);
    navigator.clipboard.writeText(texto).then(() => {
      onAgregarToast("Ticket copiado al portapapeles", "success");
    }).catch(err => {
      onAgregarToast("Error al copiar el ticket", "error");
    });
  };

  const handleImprimirTicket = (venta) => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      onAgregarToast("El navegador bloqueó la ventana emergente.", "error");
      return;
    }
    
    let html = `
      <html>
        <head>
          <title>Ticket de Venta #${venta.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; font-size: 14px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; }
            .header p { margin: 2px 0; }
            .details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { border-bottom: 1px dashed #000; text-align: left; padding: 5px 0; }
            td { padding: 5px 0; vertical-align: top; }
            .total-section { border-top: 1px dashed #000; padding-top: 10px; text-align: right; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FERNANDEZ MOTO PARTS</h1>
            <p>Venta de repuestos y accesorios de motos</p>
            <p>Belgrano, 998. Bragado, Prov. de Buenos Aires</p>
            <p>Tel: 2342-413823</p>
          </div>
          <div class="details">
            <p><strong>Fecha:</strong> ${formatearFecha(venta.fechaVenta)}</p>
            <p><strong>Comprobante Nº:</strong> #${venta.id.toString().padStart(4, "0")}</p>
            <p><strong>Método de Pago:</strong> ${venta.metodoPago || "Efectivo"}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>CANT</th>
                <th>DESCRIPCIÓN</th>
                <th style="text-align: right">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
    `;

    venta.detalles.forEach(d => {
      const nombre = d.producto?.nombre || "Producto eliminado";
      const sku = d.producto?.sku ? `<br><span style="font-size: 11px; color: #555;">SKU: ${d.producto.sku}</span>` : "";
      const subtotal = d.cantidad * d.precioUnitario;
      html += `
        <tr>
          <td>${d.cantidad}</td>
          <td>${nombre}${sku}</td>
          <td style="text-align: right">$ ${subtotal.toLocaleString("es-AR")}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
          <div class="total-section">
            TOTAL: $ ${venta.total.toLocaleString("es-AR")}
          </div>
          <div class="footer">
            <p>¡Gracias por su compra!</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    ventana.document.write(html);
    ventana.document.close();
  };

  if (cargando) {
    return (
      <div className="historial-container">
        <div className="page-header">
          <div>
            <h2 className="page-title">Historial de Ventas</h2>
            <p className="page-subtitle">Cargando transacciones...</p>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Método</th>
                <th>Detalle</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan="5">
                    <div className="skeleton" style={{ height: 40 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="historial-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Historial de Ventas</h2>
          <p className="page-subtitle">
            {ventas.length} {ventas.length === 1 ? "venta registrada" : "ventas registradas"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select 
            className="select" 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="todas">Todas las ventas</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mes</option>
            <option value="año">Este Año</option>
          </select>
          <button 
            className="btn btn-secondary" 
            style={{ color: "var(--danger)" }}
            onClick={handleLimpiarHistorial} 
            disabled={ventas.length === 0}
          >
            🗑️ Borrar Todo
          </button>
          <button className="btn btn-secondary" onClick={cargarHistorial}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {ventas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <p className="empty-state-title">No hay ventas registradas</p>
          <p className="empty-state-text">
            Las ventas que realices desde el "Punto de Venta" aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>VENTA</th>
                <th>MÉTODO</th>
                <th>DETALLE</th>
                <th style={{ textAlign: 'center' }}>TOTAL</th>
                <th style={{ textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta, index) => (
                <tr
                  key={venta.id}
                  style={{ animationDelay: `${index * 50}ms`, animation: "fadeInUp 300ms var(--ease-out) backwards" }}
                >
                  <td data-label="VENTA">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold' }}>#{venta.id.toString().padStart(4, "0")}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{formatearFecha(venta.fechaVenta)}</span>
                    </div>
                  </td>
                  <td data-label="MÉTODO">
                    <span className="badge badge-neutral">
                      {venta.metodoPago === "Efectivo" ? "💵 " : venta.metodoPago === "Débito" || venta.metodoPago === "Crédito" ? "💳 " : "📱 "}
                      {venta.metodoPago || "Efectivo"}
                    </span>
                  </td>
                  <td data-label="DETALLE">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {venta.detalles.map((detalle) => (
                        <div key={detalle.id} style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '4px' }}>{detalle.cantidad}x</span> 
                          {detalle.producto?.nombre || "Producto eliminado"}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td data-label="TOTAL" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                        ${venta.total.toLocaleString("es-AR")}
                      </span>
                      {venta.descuentoPorcentaje > 0 && (
                        <span className="badge badge-accent" style={{ fontSize: "0.7rem", marginTop: 4 }}>
                          -{venta.descuentoPorcentaje}% Desc.
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="ACCIONES" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleCopiarTicket(venta)}
                        title="Copiar Ticket"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>📋</span> Copiar
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleImprimirTicket(venta)}
                        title="Imprimir / Guardar PDF"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>📄</span> Ticket
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleEliminarVenta(venta.id)}
                        title="Eliminar venta"
                      >
                        <span>🗑️</span> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
