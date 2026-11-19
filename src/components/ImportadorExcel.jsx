"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Check, FileSpreadsheet, Languages, Loader2 } from "lucide-react";
import { importarProductosJson, obtenerCotizacion } from "@/lib/api";
import { CASAS_DOLAR } from "@/lib/cotizacion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/app/Field";
import { FileDrop } from "@/components/app/FileDrop";

// Convierte "$ 1.234,50" o 1234.5 en número
const parsearPrecio = (valor) => {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  const str = valor.toString().replace("$", "").trim();
  const clean = str.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

const IGNORAR = "__ignorar__";

const CAMPOS = [
  { key: "nombre", label: "Nombre / descripción", req: true },
  { key: "precioLista", label: "Precio de lista en pesos" },
  { key: "precioListaDolar", label: "Precio de lista en dólares" },
  { key: "sku", label: "Código / SKU" },
  { key: "stock", label: "Stock" },
  { key: "proveedor", label: "Proveedor" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo / aplicación" },
];

const PASOS = ["Archivo", "Columnas", "Importar"];

export function ImportadorExcel({ onCerrar, onCompletado, onAgregarToast }) {
  const [archivo, setArchivo] = useState(null);
  const [datosExcel, setDatosExcel] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [hojas, setHojas] = useState([]);
  const [hojaSeleccionada, setHojaSeleccionada] = useState("");
  const [mapeo, setMapeo] = useState({
    sku: "",
    nombre: "",
    precioLista: "",
    precioListaDolar: "",
    stock: "",
    proveedor: "",
    marca: "",
    modelo: "",
  });
  const [valoresPorDefecto, setValoresPorDefecto] = useState({
    proveedor: "",
    marca: ""
  });
  const [tipoDolar, setTipoDolar] = useState("oficial"); // oficial | blue | bolsa | manual
  const [cotizacionDolar, setCotizacionDolar] = useState("");
  const [estadoCotizacion, setEstadoCotizacion] = useState({ cargando: false, error: "", actualizado: null });
  const [porcentajeGanancia, setPorcentajeGanancia] = useState(40);
  const [traducirNombres, setTraducirNombres] = useState(false);
  const [paso, setPaso] = useState(1); // 1: Subir, 2: Mapear, 3: Procesando

  const handleArchivo = (file) => {
    if (!file) return;

    setArchivo(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        setWorkbook(wb);
        setHojas(wb.SheetNames);
        
        const wsname = wb.SheetNames[0];
        setHojaSeleccionada(wsname);
        
        procesarHoja(wb, wsname);
        
        setPaso(2);
      } catch (error) {
        console.error(error);
        onAgregarToast("Error al leer el archivo Excel.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const procesarHoja = (wb, wsname) => {
    const ws = wb.Sheets[wsname];
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    if (data.length < 2) {
      onAgregarToast(`La hoja "${wsname}" parece estar vacía o no tiene suficientes datos.`, "warning");
      setDatosExcel([]);
      setColumnas([]);
      return;
    }

    // Buscar la fila de encabezados usando palabras clave (scoring)
    let headerRowIndex = 0;
    let maxScore = -1;
    let fallbackRowIndex = 0;
    let maxCols = 0;
    
    const keywords = ["codigo", "código", "sku", "articulo", "artículo", "descripcion", "descripción", "producto", "nombre", "precio", "costo", "importe", "stock", "marca", "modelo", "proveedor"];

    for (let i = 0; i < Math.min(data.length, 25); i++) {
      const row = data[i] || [];
      const colsCount = row.filter(cell => cell && cell.toString().trim() !== "").length;
      
      // Guardar por si falla el scoring
      if (colsCount > maxCols) {
        maxCols = colsCount;
        fallbackRowIndex = i;
      }

      let score = 0;
      row.forEach(cell => {
        if (cell) {
          const str = cell.toString().toLowerCase();
          if (keywords.some(kw => str === kw || str.includes(kw))) {
            score++;
          }
        }
      });

      // Preferir filas más arriba si hay empate en score
      if (score > maxScore) {
        maxScore = score;
        headerRowIndex = i;
      }
    }

    // Si no encontramos al menos 2 palabras clave claras, usamos la fila con más columnas
    if (maxScore < 2) {
      headerRowIndex = fallbackRowIndex;
    }

    const headers = (data[headerRowIndex] || []).map(h => h ? h.toString().trim() : "");
    const cleanHeaders = headers.filter(h => h !== "");
    setColumnas(cleanHeaders);
    
    // Convertir filas a objetos usando los headers
    const rows = data.slice(headerRowIndex + 1).map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i];
      });
      return obj;
    });

    // Filtrar filas vacías
    const validRows = rows.filter(r => Object.keys(r).length > 0);
    
    setDatosExcel(validRows);
    
    // Intentar autodetectar columnas comunes
    autoMapearColumnas(cleanHeaders);
  };

  const autoMapearColumnas = (headers) => {
    const nuevoMapeo = { ...mapeo };
    const hLower = headers.map(h => h.toLowerCase());

    const findMatch = (keywords) => {
      for (let kw of keywords) {
        const idx = hLower.findIndex(h => h.includes(kw));
        if (idx !== -1) return headers[idx];
      }
      return "";
    };

    nuevoMapeo.sku = findMatch(["codigo", "código", "sku", "id", "ref"]);
    nuevoMapeo.nombre = findMatch(["nombre", "descripci", "articulo", "artículo", "producto"]);
    // Columnas en dólares: se detectan aparte para no confundirlas con el precio en pesos
    const esDolar = (h) => /usd|u\$s|us\$|d[oó]lar/i.test(h);
    const columnaDolar = headers.find((h) => esDolar(h) && /precio|costo|importe|valor|usd|u\$s|us\$/i.test(h)) || "";
    nuevoMapeo.precioListaDolar = columnaDolar;
    nuevoMapeo.precioLista =
      headers.find((h) => !esDolar(h) && ["precio", "costo", "importe", "valor"].some((kw) => h.toLowerCase().includes(kw))) || "";
    if (columnaDolar && tipoDolar !== "manual") cargarCotizacion(tipoDolar);
    nuevoMapeo.stock = findMatch(["stock", "cant", "disponible"]);
    nuevoMapeo.proveedor = findMatch(["proveedor", "distribuidor"]);
    nuevoMapeo.marca = findMatch(["marca", "fabricante"]);
    nuevoMapeo.modelo = findMatch(["modelo", "aplicacion", "para moto"]);

    setMapeo(nuevoMapeo);
  };

  // Trae la cotización del día; si falla, queda para cargarla a mano
  const cargarCotizacion = async (casa) => {
    if (casa === "manual") {
      setEstadoCotizacion({ cargando: false, error: "", actualizado: null });
      return;
    }
    setEstadoCotizacion({ cargando: true, error: "", actualizado: null });
    try {
      const cotizacion = await obtenerCotizacion(casa);
      setCotizacionDolar(cotizacion.venta);
      setEstadoCotizacion({ cargando: false, error: "", actualizado: cotizacion.actualizado });
    } catch (error) {
      setEstadoCotizacion({ cargando: false, error: error.message, actualizado: null });
    }
  };

  const handleTipoDolarChange = (casa) => {
    setTipoDolar(casa);
    cargarCotizacion(casa);
  };

  const handleMapeoChange = (campo, valor) => {
    setMapeo(prev => ({ ...prev, [campo]: valor }));
    // Al elegir por primera vez la columna en dólares, buscamos la cotización
    if (campo === "precioListaDolar" && valor && !mapeo.precioListaDolar && tipoDolar !== "manual") {
      cargarCotizacion(tipoDolar);
    }
  };

  const handleImportar = async () => {
    if (!mapeo.nombre || (!mapeo.precioLista && !mapeo.precioListaDolar)) {
      onAgregarToast("Elegí la columna del nombre y la del precio (en pesos o en dólares).", "error");
      return;
    }

    const cotizacion = Number(cotizacionDolar);
    if (mapeo.precioListaDolar && !(cotizacion > 0)) {
      onAgregarToast("Ingresá la cotización del dólar para convertir los precios.", "error");
      return;
    }

    setPaso(3);

    try {
      // Formatear datos al DTO que espera el backend
      const productosAImportar = datosExcel.map(fila => {
        
        let precioPesos = parsearPrecio(fila[mapeo.precioLista]);
        let precioDolares = mapeo.precioListaDolar ? parsearPrecio(fila[mapeo.precioListaDolar]) : 0;
        
        // Si hay precio en dólares, lo usamos convirtiéndolo a pesos
        let precioNum = precioDolares > 0 ? (precioDolares * cotizacion) : precioPesos;

        // Calcular precio al público
        const precioPublico = precioNum + (precioNum * (porcentajeGanancia / 100));

        return {
          sku: mapeo.sku ? (fila[mapeo.sku]?.toString() || "") : "",
          nombre: fila[mapeo.nombre]?.toString() || "",
          precioLista: precioNum,
          precioPublico: precioPublico,
          stock: mapeo.stock ? (parseInt(fila[mapeo.stock]) || 0) : -1,
          proveedor: mapeo.proveedor ? (fila[mapeo.proveedor]?.toString() || "") : valoresPorDefecto.proveedor,
          marca: mapeo.marca ? (fila[mapeo.marca]?.toString() || "") : valoresPorDefecto.marca,
          modelo: mapeo.modelo ? (fila[mapeo.modelo]?.toString() || "") : "",
        };
      }).filter(p => p.nombre && p.precioLista > 0);

      if (productosAImportar.length === 0) {
        onAgregarToast("No se encontraron productos válidos para importar.", "error");
        setPaso(2);
        return;
      }

      // La traducción usa un servicio gratuito de Google que no es oficial: si falla,
      // los nombres quedan como vienen en el Excel y se avisa al terminar.
      let sinTraducir = 0;
      if (traducirNombres) {
        const chunkSize = 20;
        for (let i = 0; i < productosAImportar.length; i += chunkSize) {
          const chunk = productosAImportar.slice(i, i + chunkSize);
          const textoUnido = chunk.map(p => p.nombre).join(" ||| ");
          try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(textoUnido)}`);
            if (!res.ok) throw new Error(`El traductor respondió ${res.status}`);
            const data = await res.json();
            const translatedText = data[0].map(item => item[0]).join('');
            const translatedNombres = translatedText.split(/\|\|\|/g).map(s => s.trim());
            
            chunk.forEach((p, idx) => {
              if (translatedNombres[idx] && translatedNombres[idx].length > 0) {
                p.nombre = translatedNombres[idx];
              }
            });
          } catch (e) {
            console.error("Error al traducir lote", e);
            sinTraducir += chunk.length;
          }
        }
      }

      const res = await importarProductosJson(productosAImportar);
      onAgregarToast(`¡Importación exitosa! Se actualizaron ${res.actualizados} y se crearon ${res.creados} productos.`, "success");
      if (sinTraducir > 0) {
        onAgregarToast(`No se pudieron traducir ${sinTraducir} nombres: quedaron como venían en el Excel.`, "warning");
      }
      onCompletado();
    } catch (error) {
      onAgregarToast(error.message || "Hubo un error al guardar los productos en la base de datos.", "error");
      setPaso(2);
    }
  };


  // Vista previa: cómo quedarían los primeros productos con el mapeo actual
  const cotizacion = Number(cotizacionDolar);
  const vistaPrevia = datosExcel.slice(0, 3).map((fila) => {
    const dolares = mapeo.precioListaDolar ? parsearPrecio(fila[mapeo.precioListaDolar]) : 0;
    const costo = dolares > 0 && cotizacion > 0 ? dolares * cotizacion : parsearPrecio(fila[mapeo.precioLista]);
    return {
      sku: mapeo.sku ? fila[mapeo.sku]?.toString() || "" : "",
      nombre: mapeo.nombre ? fila[mapeo.nombre]?.toString() || "" : "",
      costo,
      precio: costo * (1 + porcentajeGanancia / 100),
    };
  });
  const pesos = (n) => `$${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
  const listo = Boolean(mapeo.nombre && (mapeo.precioLista || mapeo.precioListaDolar));

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && paso !== 3 && onCerrar()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-2xl" showCloseButton={paso !== 3}>
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>Importar lista de precios</DialogTitle>
          <DialogDescription>Actualizá o cargá productos desde el Excel de un proveedor.</DialogDescription>
          <ol className="mt-3 flex items-center gap-2 text-xs">
            {PASOS.map((nombre, i) => {
              const n = i + 1;
              const hecho = paso > n;
              const actual = paso === n;
              return (
                <li key={nombre} className="flex items-center gap-2">
                  {i > 0 && <span className={cn("h-px w-6", paso > i ? "bg-primary" : "bg-border")} />}
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[0.68rem] font-semibold ring-1",
                      hecho && "bg-primary text-primary-foreground ring-primary",
                      actual && "bg-primary/15 text-primary ring-primary",
                      !hecho && !actual && "text-muted-foreground ring-border"
                    )}
                  >
                    {hecho ? <Check className="size-3" /> : n}
                  </span>
                  <span className={cn(actual ? "font-medium text-foreground" : "text-muted-foreground")}>{nombre}</span>
                </li>
              );
            })}
          </ol>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {paso === 1 && (
            <FileDrop
              accept=".xlsx,.xls,.csv"
              archivo={archivo}
              onFile={handleArchivo}
              icon={FileSpreadsheet}
              titulo="Arrastrá el Excel acá o hacé clic para buscarlo"
              detalle="Archivos .xlsx, .xls o .csv"
            />
          )}

          {paso === 2 && (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm ring-1 ring-border">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-primary" />
                  <span className="font-medium">{archivo?.name}</span>
                  <span className="text-muted-foreground">· {datosExcel.length.toLocaleString("es-AR")} filas</span>
                </span>
                {hojas.length > 1 && (
                  <Select
                    value={hojaSeleccionada}
                    onValueChange={(v) => {
                      setHojaSeleccionada(v);
                      procesarHoja(workbook, v);
                    }}
                  >
                    <SelectTrigger size="sm" className="w-48 bg-background" aria-label="Hoja del Excel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hojas.map((h) => (
                        <SelectItem key={h} value={h}>
                          Hoja: {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <section>
                <h3 className="text-sm font-semibold">Columnas</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Elegí qué columna del Excel corresponde a cada dato. Las que se detectaron solas ya están elegidas.
                </p>
                <div className="divide-y rounded-lg border">
                  {CAMPOS.map((campo) => (
                    <div key={campo.key} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <span className="text-sm">
                        {campo.label}
                        {campo.req && <span className="text-primary">*</span>}
                      </span>
                      <Select
                        value={mapeo[campo.key] || IGNORAR}
                        onValueChange={(v) => handleMapeoChange(campo.key, v === IGNORAR ? "" : v)}
                      >
                        <SelectTrigger size="sm" className={cn("w-48 sm:w-56", !mapeo[campo.key] && "text-muted-foreground")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>No importar</SelectItem>
                          <SelectSeparator />
                          {columnas.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">* Hace falta el nombre y al menos un precio (en pesos o en dólares).</p>
              </section>

              <section className="grid gap-4">
                <h3 className="text-sm font-semibold">Precios</h3>
                {mapeo.precioListaDolar && (
                  <Field
                    label="Cotización del dólar"
                    hint={
                      estadoCotizacion.cargando
                        ? "Buscando la cotización del día..."
                        : estadoCotizacion.error ||
                          (tipoDolar === "manual"
                            ? "Valor cargado a mano."
                            : cotizacionDolar !== "" &&
                              `Precio de venta del dólar ${CASAS_DOLAR[tipoDolar]}${estadoCotizacion.actualizado ? ` (actualizado el ${new Date(estadoCotizacion.actualizado).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })})` : ""}. Podés corregirlo a mano.`)
                    }
                    error={estadoCotizacion.error || undefined}
                  >
                    <div className="flex gap-2">
                      <Select value={tipoDolar} onValueChange={handleTipoDolarChange}>
                        <SelectTrigger className="w-40" aria-label="Tipo de dólar">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CASAS_DOLAR).map(([casa, nombre]) => (
                            <SelectItem key={casa} value={casa}>
                              Dólar {nombre}
                            </SelectItem>
                          ))}
                          <SelectSeparator />
                          <SelectItem value="manual">Cargar a mano</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        {estadoCotizacion.cargando && (
                          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                        <Input
                          type="number"
                          min="0"
                          className="pl-7 tabular-nums"
                          placeholder={estadoCotizacion.cargando ? "Buscando..." : "0"}
                          value={cotizacionDolar}
                          onChange={(e) => {
                            setCotizacionDolar(e.target.value);
                            if (tipoDolar !== "manual") setTipoDolar("manual");
                          }}
                          aria-label="Cotización del dólar"
                        />
                      </div>
                    </div>
                  </Field>
                )}
                <Field label="Ganancia sobre el costo" htmlFor="ganancia" hint="Se suma al costo para calcular el precio al público.">
                  <div className="relative w-36">
                    <Input
                      id="ganancia"
                      type="number"
                      className="pr-8 tabular-nums"
                      value={porcentajeGanancia}
                      onChange={(e) => setPorcentajeGanancia(parseFloat(e.target.value) || 0)}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </Field>
              </section>

              <section className="grid gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Datos para toda la lista</h3>
                  <p className="text-xs text-muted-foreground">Opcional. Se usan si el Excel no tiene esas columnas.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Proveedor (ej: Tercom)"
                    value={valoresPorDefecto.proveedor}
                    onChange={(e) => setValoresPorDefecto((prev) => ({ ...prev, proveedor: e.target.value }))}
                    aria-label="Proveedor para toda la lista"
                  />
                  <Input
                    placeholder="Marca"
                    value={valoresPorDefecto.marca}
                    onChange={(e) => setValoresPorDefecto((prev) => ({ ...prev, marca: e.target.value }))}
                    aria-label="Marca para toda la lista"
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={traducirNombres}
                    onChange={(e) => setTraducirNombres(e.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Languages className="size-4 text-muted-foreground" />
                      Traducir nombres del inglés al español
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Ideal para listas de BAJAJ. Usa el traductor gratuito de Google, que no es un servicio oficial y puede fallar: si algún nombre no se traduce, queda como viene y te avisamos.
                    </span>
                  </span>
                </label>
              </section>

              {listo && vistaPrevia.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Vista previa</h3>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Producto</th>
                          <th className="px-3 py-2 text-right font-medium">Costo</th>
                          <th className="px-3 py-2 text-right font-medium">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vistaPrevia.map((fila, i) => (
                          <tr key={i}>
                            <td className="max-w-0 px-3 py-2">
                              <p className="truncate">{fila.nombre || <span className="text-muted-foreground">Sin nombre</span>}</p>
                              {fila.sku && <p className="font-mono text-xs text-muted-foreground">{fila.sku}</p>}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{pesos(fila.costo)}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{pesos(fila.precio)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {paso === 3 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="font-medium">{traducirNombres ? "Traduciendo e importando productos..." : "Importando productos..."}</p>
              <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos. No cierres esta ventana.</p>
            </div>
          )}
        </div>

        {paso !== 3 && (
          <DialogFooter className="border-t px-6 py-4">
            {paso === 2 && (
              <Button variant="ghost" className="sm:mr-auto" onClick={() => setPaso(1)}>
                Elegir otro archivo
              </Button>
            )}
            <Button variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            {paso === 2 && (
              <Button onClick={handleImportar} disabled={!listo}>
                Importar {datosExcel.length.toLocaleString("es-AR")} productos
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
