"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ajustarStock,
  altaRapidaProducto,
  deshacerMovimiento,
  obtenerMovimientos,
  obtenerProductos,
} from "@/lib/api";
import "./CargarStock.css";

const MODOS = {
  sumar: { icono: "📦", titulo: "Llegó mercadería", pregunta: "¿Cuántos llegaron?", boton: "Sumar al stock" },
  fijar: { icono: "🔢", titulo: "Conteo", pregunta: "¿Cuántos hay en el estante?", boton: "Guardar conteo" },
};

const TIPOS = {
  ingreso: { texto: "Llegó mercadería", badge: "badge-success" },
  conteo: { texto: "Conteo", badge: "badge-info" },
  alta: { texto: "Producto nuevo", badge: "badge-accent" },
  venta: { texto: "Venta", badge: "badge-neutral" },
  anulacion_venta: { texto: "Venta anulada", badge: "badge-warning" },
  importacion: { texto: "Importación Excel", badge: "badge-neutral" },
  edicion: { texto: "Edición manual", badge: "badge-warning" },
  deshacer: { texto: "Deshecho", badge: "badge-danger" },
};

const soloDigitos = (valor) => valor.replace(/\D/g, "").slice(0, 7);
const formatearMoneda = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n || 0);
const formatearFecha = (iso) =>
  new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
const nombreUsuario = (email) => (email ? email.split("@")[0] : "sistema");
const conSigno = (n) => (n > 0 ? `+${n}` : String(n));

export function CargarStock({ onAgregarToast, onConfirmar }) {
  const [pestana, setPestana] = useState("cargar");

  return (
    <div className="cs-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Cargar Stock</h2>
          <p className="page-subtitle">Sumá lo que llega o corregí con lo que hay en el estante</p>
        </div>
      </div>

      <div className="cs-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={pestana === "cargar"}
          className={`cs-tab ${pestana === "cargar" ? "active" : ""}`}
          onClick={() => setPestana("cargar")}
        >
          📥 Cargar
        </button>
        <button
          role="tab"
          aria-selected={pestana === "movimientos"}
          className={`cs-tab ${pestana === "movimientos" ? "active" : ""}`}
          onClick={() => setPestana("movimientos")}
        >
          🕘 Movimientos
        </button>
      </div>

      {pestana === "cargar" ? (
        <PanelCarga onAgregarToast={onAgregarToast} />
      ) : (
        <PanelMovimientos onAgregarToast={onAgregarToast} onConfirmar={onConfirmar} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña "Cargar"
// ---------------------------------------------------------------------------
function PanelCarga({ onAgregarToast }) {
  const [modo, setModo] = useState("sumar");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState({ termino: "", items: [] });
  const [seleccionado, setSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState("");
  const [creando, setCreando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ultimaCarga, setUltimaCarga] = useState(null);
  const buscadorRef = useRef(null);

  const termino = busqueda.trim();
  const buscando = termino !== "" && resultados.termino !== termino;

  // Búsqueda con espera de 300 ms; se ignoran respuestas viejas
  useEffect(() => {
    if (!termino) return;
    let activo = true;
    const timer = setTimeout(async () => {
      const data = await obtenerProductos({ busqueda: termino, page: 1, pageSize: 15 });
      if (activo) setResultados({ termino, items: data.items || [] });
    }, 300);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [termino]);

  const elegirProducto = (producto) => {
    setSeleccionado(producto);
    setCantidad(modo === "sumar" ? "1" : String(producto.stockActual));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    if (seleccionado) setCantidad(nuevo === "sumar" ? "1" : String(seleccionado.stockActual));
  };

  const volverABuscar = () => {
    setSeleccionado(null);
    setCreando(false);
    setCantidad("");
    setBusqueda("");
    setTimeout(() => buscadorRef.current?.focus(), 50);
  };

  const n = cantidad === "" ? null : Number(cantidad);
  const stockNuevo = seleccionado && n != null ? (modo === "sumar" ? seleccionado.stockActual + n : n) : null;
  const puedeConfirmar = seleccionado && n != null && (modo === "fijar" || n > 0) && !procesando;

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setProcesando(true);
    try {
      const anterior = seleccionado.stockActual;
      const { producto, movimientoId } = await ajustarStock(seleccionado.id, modo, n);
      const sinCambios = producto.stockActual === anterior;
      onAgregarToast(
        sinCambios ? `${producto.nombre}: el stock ya era ${anterior}` : `Listo: ${producto.nombre} ahora tiene ${producto.stockActual}`,
        sinCambios ? "info" : "success"
      );
      setUltimaCarga(
        sinCambios ? null : { movimientoId, nombre: producto.nombre, anterior, nuevo: producto.stockActual }
      );
      volverABuscar();
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setProcesando(false);
    }
  };

  const deshacerUltima = async () => {
    if (!ultimaCarga?.movimientoId) return;
    setProcesando(true);
    try {
      const { producto } = await deshacerMovimiento(ultimaCarga.movimientoId);
      onAgregarToast(`Deshecho: ${producto.nombre} volvió a ${producto.stockActual}`, "success");
      setUltimaCarga(null);
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setProcesando(false);
    }
  };

  const productoCreado = (producto) => {
    onAgregarToast(`Creado: ${producto.nombre} (código ${producto.sku}) con ${producto.stockActual} unidades`, "success");
    setUltimaCarga(null);
    volverABuscar();
  };

  if (creando) {
    return (
      <AltaRapida
        nombreInicial={termino}
        onCancelar={volverABuscar}
        onCreado={productoCreado}
        onAgregarToast={onAgregarToast}
      />
    );
  }

  return (
    <>
      <div className="cs-modos">
        {Object.entries(MODOS).map(([clave, m]) => (
          <button
            key={clave}
            className={`cs-modo ${modo === clave ? "active" : ""}`}
            onClick={() => cambiarModo(clave)}
            aria-pressed={modo === clave}
          >
            <span className="cs-modo-icono">{m.icono}</span>
            {m.titulo}
          </button>
        ))}
      </div>

      {ultimaCarga && !seleccionado && (
        <div className="cs-ultima">
          <div>
            <strong>✅ {ultimaCarga.nombre}</strong>
            <span>
              {ultimaCarga.anterior} → {ultimaCarga.nuevo}
            </span>
          </div>
          <button className="btn btn-secondary" onClick={deshacerUltima} disabled={procesando}>
            ↩ Deshacer
          </button>
        </div>
      )}

      {seleccionado ? (
        <div className="cs-panel">
          <button className="cs-volver" onClick={volverABuscar} disabled={procesando}>
            ← Elegir otro repuesto
          </button>

          <div className="cs-producto-titulo">{seleccionado.nombre}</div>
          <div className="cs-producto-meta">
            <span className="cs-sku">{seleccionado.sku}</span>
            {seleccionado.proveedor && <span>{seleccionado.proveedor}</span>}
          </div>
          <div className="cs-hay">
            Hay <strong>{seleccionado.stockActual}</strong> en stock
          </div>

          <label className="cs-pregunta" htmlFor="cs-cantidad">
            {MODOS[modo].pregunta}
          </label>
          <div className="cs-cantidad">
            <button
              className="cs-qty-btn"
              aria-label="Restar uno"
              onClick={() => setCantidad(String(Math.max(modo === "sumar" ? 1 : 0, (n ?? 0) - 1)))}
              disabled={procesando}
            >
              −
            </button>
            <input
              id="cs-cantidad"
              className="cs-qty-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={cantidad}
              onChange={(e) => setCantidad(soloDigitos(e.target.value))}
              onFocus={(e) => e.target.select()}
              disabled={procesando}
            />
            <button
              className="cs-qty-btn"
              aria-label="Sumar uno"
              onClick={() => setCantidad(String((n ?? 0) + 1))}
              disabled={procesando}
            >
              +
            </button>
          </div>

          {stockNuevo != null && (
            <div className="cs-preview">
              Hay {seleccionado.stockActual} → {modo === "sumar" ? "quedarán" : "quedará en"}{" "}
              <strong>{stockNuevo}</strong>
              {stockNuevo !== seleccionado.stockActual && (
                <span className={stockNuevo > seleccionado.stockActual ? "cs-mas" : "cs-menos"}>
                  {" "}({conSigno(stockNuevo - seleccionado.stockActual)})
                </span>
              )}
            </div>
          )}

          <button className="btn btn-primary cs-confirmar" onClick={confirmar} disabled={!puedeConfirmar}>
            {procesando ? "Guardando..." : `✅ ${MODOS[modo].boton}`}
          </button>
        </div>
      ) : (
        <>
          <div className="cs-buscador">
            <span aria-hidden="true">🔍</span>
            <input
              ref={buscadorRef}
              type="search"
              enterKeyHint="search"
              placeholder="Buscá por nombre o código"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar repuesto"
            />
          </div>

          {!termino ? (
            <p className="cs-ayuda">
              Escribí parte del nombre (por ejemplo <em>cadena</em>) o el código del repuesto, y tocalo en la lista.
            </p>
          ) : buscando ? (
            <div className="cs-resultados">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : (
            <div className="cs-resultados">
              {resultados.items.map((p) => (
                <button key={p.id} className="cs-resultado" onClick={() => elegirProducto(p)}>
                  <span className="cs-resultado-nombre">{p.nombre}</span>
                  <span className="cs-resultado-meta">
                    <span className="cs-sku">{p.sku}</span>
                    {p.proveedor && <span>{p.proveedor}</span>}
                  </span>
                  <span className={`cs-resultado-stock ${p.stockActual <= 0 ? "sin-stock" : ""}`}>
                    Hay {p.stockActual}
                  </span>
                </button>
              ))}
              {resultados.items.length === 0 && (
                <p className="cs-ayuda">No encontré ningún repuesto con &quot;{termino}&quot;.</p>
              )}
              <button className="btn btn-secondary cs-crear" onClick={() => setCreando(true)}>
                ➕ ¿No está? Crear producto nuevo
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Alta rápida: nombre, precio y cantidad (el código es opcional)
// ---------------------------------------------------------------------------
function AltaRapida({ nombreInicial, onCancelar, onCreado, onAgregarToast }) {
  const [form, setForm] = useState({ nombre: nombreInicial, precio: "", cantidad: "1", sku: "" });
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    const valor = campo === "cantidad" ? soloDigitos(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const precio = Number(form.precio.replace(",", "."));
    if (!form.nombre.trim()) return onAgregarToast("Escribí el nombre del repuesto.", "warning");
    if (form.precio === "" || !Number.isFinite(precio) || precio < 0) {
      return onAgregarToast("Escribí el precio de venta.", "warning");
    }
    setGuardando(true);
    try {
      const { producto } = await altaRapidaProducto({
        nombre: form.nombre,
        precio,
        cantidad: Number(form.cantidad || 0),
        sku: form.sku,
      });
      onCreado(producto);
    } catch (error) {
      onAgregarToast(error.message, "error");
      setGuardando(false);
    }
  };

  return (
    <form className="cs-panel" onSubmit={guardar}>
      <button type="button" className="cs-volver" onClick={onCancelar} disabled={guardando}>
        ← Volver a buscar
      </button>
      <div className="cs-producto-titulo">➕ Producto nuevo</div>
      <p className="cs-ayuda" style={{ textAlign: "left", padding: 0 }}>
        Completá lo básico. Los demás datos (costo, proveedor, mínimo) se pueden agregar después desde Inventario.
      </p>

      <label className="cs-label" htmlFor="alta-nombre">Nombre del repuesto</label>
      <input id="alta-nombre" className="cs-input" value={form.nombre} onChange={cambiar("nombre")} autoComplete="off" />

      <label className="cs-label" htmlFor="alta-precio">Precio de venta ($)</label>
      <input
        id="alta-precio"
        className="cs-input"
        type="text"
        inputMode="decimal"
        placeholder="Ej: 4500"
        value={form.precio}
        onChange={cambiar("precio")}
        autoComplete="off"
      />

      <label className="cs-label" htmlFor="alta-cantidad">Cantidad que hay</label>
      <input
        id="alta-cantidad"
        className="cs-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={form.cantidad}
        onChange={cambiar("cantidad")}
        autoComplete="off"
      />

      <label className="cs-label" htmlFor="alta-sku">
        Código <span className="cs-opcional">(opcional: si lo dejás vacío se crea uno solo)</span>
      </label>
      <input
        id="alta-sku"
        className="cs-input"
        value={form.sku}
        onChange={cambiar("sku")}
        autoComplete="off"
        style={{ textTransform: "uppercase" }}
      />

      <button type="submit" className="btn btn-primary cs-confirmar" disabled={guardando}>
        {guardando ? "Guardando..." : "✅ Crear producto"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Pestaña "Movimientos": qué cambió, cuánto, quién y cuándo
// ---------------------------------------------------------------------------
function PanelMovimientos({ onAgregarToast, onConfirmar }) {
  const [filtro, setFiltro] = useState("hoy");
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setMovimientos(await obtenerMovimientos(filtro));
    } catch (error) {
      onAgregarToast(error.message, "error");
    } finally {
      setCargando(false);
    }
  }, [filtro, onAgregarToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al cambiar el filtro
    cargar();
  }, [cargar]);

  const deshacer = (mov) => {
    onConfirmar(
      `Se va a deshacer "${TIPOS[mov.tipo]?.texto ?? mov.tipo}" de ${mov.productoNombre} (${conSigno(
        mov.diferencia
      )}). El stock se corrige restando esa diferencia.`,
      async () => {
        try {
          const { producto } = await deshacerMovimiento(mov.id);
          onAgregarToast(`Deshecho: ${producto.nombre} ahora tiene ${producto.stockActual}`, "success");
          cargar();
        } catch (error) {
          onAgregarToast(error.message, "error");
        }
      }
    );
  };

  return (
    <>
      <div className="cs-filtros">
        {[
          ["hoy", "Hoy"],
          ["semana", "7 días"],
          ["todos", "Todos"],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            className={`filter-chip ${filtro === valor ? "active" : ""}`}
            onClick={() => setFiltro(valor)}
            aria-pressed={filtro === valor}
          >
            {texto}
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={cargar} disabled={cargando} style={{ marginLeft: "auto" }}>
          ↻ Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="cs-resultados">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : movimientos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕘</div>
          <p className="empty-state-title">No hay movimientos {filtro === "hoy" ? "hoy" : "en este período"}</p>
          <p className="empty-state-text">Acá aparece cada cambio de stock: cargas, conteos, ventas e importaciones.</p>
        </div>
      ) : (
        <div className="cs-resultados">
          {movimientos.map((mov) => {
            const tipo = TIPOS[mov.tipo] ?? { texto: mov.tipo, badge: "badge-neutral" };
            const deshacible = (mov.tipo === "ingreso" || mov.tipo === "conteo") && !mov.deshecho && mov.productoId;
            return (
              <div key={mov.id} className={`cs-mov ${mov.deshecho ? "deshecho" : ""}`}>
                <div className="cs-mov-fila">
                  <span className={`badge ${tipo.badge}`}>{tipo.texto}</span>
                  <span className="cs-mov-fecha">{formatearFecha(mov.fecha)}</span>
                </div>
                <div className="cs-mov-nombre">{mov.productoNombre}</div>
                <div className="cs-mov-fila">
                  <span className="cs-mov-cantidades">
                    {mov.cantidadAnterior} → <strong>{mov.cantidadNueva}</strong>{" "}
                    <span className={mov.diferencia > 0 ? "cs-mas" : "cs-menos"}>({conSigno(mov.diferencia)})</span>
                  </span>
                  <span className="cs-mov-usuario">👤 {nombreUsuario(mov.usuario)}</span>
                </div>
                {mov.deshecho && <div className="cs-mov-nota">Deshecho</div>}
                {deshacible && (
                  <button className="btn btn-ghost btn-sm cs-mov-deshacer" onClick={() => deshacer(mov)}>
                    ↩ Deshacer
                  </button>
                )}
              </div>
            );
          })}
          {movimientos.length >= 300 && (
            <p className="cs-ayuda">Se muestran los últimos 300 movimientos.</p>
          )}
        </div>
      )}
    </>
  );
}
