"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { crearProducto, actualizarProducto, obtenerProveedores } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/app/Field";
import { StockBadge } from "./StockBadge";

const INITIAL_STATE = {
  sku: "",
  nombre: "",
  descripcion: "",
  proveedor: "",
  marca: "",
  modelo: "",
  precioLista: "",
  precio: "",
  stockActual: "",
  stockMinimo: "",
};

function formDesdeProducto(producto) {
  if (!producto) return INITIAL_STATE;
  return {
    sku: producto.sku || "",
    nombre: producto.nombre || "",
    descripcion: producto.descripcion || "",
    proveedor: producto.proveedor || "",
    marca: producto.marca || "",
    modelo: producto.modelo || "",
    precioLista: producto.precioLista?.toString() || "",
    precio: producto.precio?.toString() || "",
    stockActual: producto.stockActual?.toString() || "",
    stockMinimo: producto.stockMinimo?.toString() || "",
  };
}

function InputMoneda({ id, ...props }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input id={id} type="number" step="0.01" min="0" inputMode="decimal" className="pl-7 tabular-nums" placeholder="0,00" {...props} />
    </div>
  );
}

export function ProductoForm({ productoAEditar = null, onAgregarToast, onNavegar }) {
  // Cada página (nuevo / editar) monta su propio formulario, así que el estado inicial
  // se calcula una sola vez a partir del producto recibido.
  const [form, setForm] = useState(() => formDesdeProducto(productoAEditar));
  const [enviando, setEnviando] = useState(false);
  const [errors, setErrors] = useState({});
  const [proveedores, setProveedores] = useState([]);

  const editando = productoAEditar !== null;

  useEffect(() => {
    obtenerProveedores().then((lista) => setProveedores(Array.isArray(lista) ? lista : []));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validar = () => {
    const nuevos = {};
    if (!form.sku.trim()) nuevos.sku = "El SKU es obligatorio";
    if (!form.nombre.trim()) nuevos.nombre = "El nombre es obligatorio";
    if (!form.precio || parseFloat(form.precio) < 0) nuevos.precio = "Ingresá un precio válido";
    if (form.stockActual === "" || parseInt(form.stockActual) < 0) nuevos.stockActual = "Ingresá el stock actual";
    if (form.stockMinimo === "" || parseInt(form.stockMinimo) < 0) nuevos.stockMinimo = "Ingresá el stock mínimo";
    setErrors(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) {
      onAgregarToast("Revisá los campos marcados.", "warning");
      return;
    }

    setEnviando(true);
    const productoData = {
      sku: form.sku.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      proveedor: form.proveedor.trim(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      precioLista: form.precioLista ? parseFloat(form.precioLista) : 0,
      precio: parseFloat(form.precio),
      stockActual: parseInt(form.stockActual),
      stockMinimo: parseInt(form.stockMinimo),
    };

    if (editando) {
      productoData.id = productoAEditar.id;
      const ok = await actualizarProducto(productoAEditar.id, productoData);
      if (ok) {
        onAgregarToast(`"${productoData.nombre}" actualizado correctamente`, "success");
        onNavegar("inventario");
        return;
      }
      onAgregarToast("Error al actualizar el producto", "error");
    } else {
      const resultado = await crearProducto(productoData);
      if (resultado) {
        onAgregarToast(`"${productoData.nombre}" agregado al inventario`, "success");
        onNavegar("inventario");
        return;
      }
      onAgregarToast("Error al guardar. Verificá que el SKU no esté duplicado.", "error");
    }
    setEnviando(false);
  };

  const costo = parseFloat(form.precioLista);
  const precio = parseFloat(form.precio);
  const margen = costo > 0 && precio > 0 ? ((precio - costo) / costo) * 100 : null;
  const stockActual = parseInt(form.stockActual);
  const stockMinimo = parseInt(form.stockMinimo);

  const aplicarMargen = (porcentaje) => {
    if (!(costo > 0)) return;
    setForm((prev) => ({ ...prev, precio: (costo * (1 + porcentaje / 100)).toFixed(2) }));
    if (errors.precio) setErrors((prev) => ({ ...prev, precio: null }));
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 text-muted-foreground">
          <Link href="/inventario">
            <ArrowLeft />
            Inventario
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight md:text-[1.75rem]">
              {editando ? productoAEditar.nombre : "Nuevo producto"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {editando ? (
                <>
                  Editando el artículo <span className="font-mono">{productoAEditar.sku}</span>
                </>
              ) : (
                "Completá los datos del artículo. Los campos con * son obligatorios."
              )}
            </p>
          </div>
          <div className="flex gap-2 max-sm:hidden">
            <Button type="button" variant="outline" onClick={() => onNavegar("inventario")} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? <Loader2 className="animate-spin" /> : <Save />}
              {enviando ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos del producto</CardTitle>
              <CardDescription>Cómo se identifica el artículo en el inventario y en las ventas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <Field label="SKU" htmlFor="sku" required error={errors.sku} hint="Código interno o del proveedor">
                  <Input
                    id="sku"
                    name="sku"
                    className="font-mono uppercase"
                    placeholder="MOT-001"
                    value={form.sku}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.sku)}
                    autoFocus={!editando}
                  />
                </Field>
                <Field label="Nombre" htmlFor="nombre" required error={errors.nombre}>
                  <Input
                    id="nombre"
                    name="nombre"
                    placeholder="Ej: Pistón 150cc STD"
                    value={form.nombre}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.nombre)}
                  />
                </Field>
              </div>
              <Field label="Descripción" htmlFor="descripcion" hint="Opcional. Medidas, equivalencias, notas para el mostrador.">
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  rows={3}
                  placeholder="Detalles adicionales del producto..."
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clasificación</CardTitle>
              <CardDescription>Sirve para buscar y filtrar el inventario.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              <Field label="Proveedor" htmlFor="proveedor">
                <Input id="proveedor" name="proveedor" list="lista-proveedores" placeholder="Ej: Tercom" value={form.proveedor} onChange={handleChange} />
                <datalist id="lista-proveedores">
                  {proveedores.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
              <Field label="Marca" htmlFor="marca">
                <Input id="marca" name="marca" placeholder="Ej: Honda" value={form.marca} onChange={handleChange} />
              </Field>
              <Field label="Modelo / aplicación" htmlFor="modelo">
                <Input id="modelo" name="modelo" placeholder="Ej: CG 150 Titan" value={form.modelo} onChange={handleChange} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Field label="Costo (precio de lista)" htmlFor="precioLista">
                <InputMoneda id="precioLista" name="precioLista" value={form.precioLista} onChange={handleChange} />
              </Field>
              <Field label="Precio al público" htmlFor="precio" required error={errors.precio}>
                <InputMoneda id="precio" name="precio" value={form.precio} onChange={handleChange} aria-invalid={Boolean(errors.precio)} />
              </Field>
              <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Margen</span>
                  <span className={cn("font-semibold tabular-nums", margen === null ? "text-muted-foreground" : margen < 0 ? "text-red-400" : "text-green-400")}>
                    {margen === null ? "—" : `${margen.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`}
                  </span>
                </div>
                {costo > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Calcular precio con</span>
                    {[30, 40, 50, 60].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => aplicarMargen(p)}
                        className="rounded-md bg-background px-2 py-0.5 text-xs font-medium ring-1 ring-border transition-colors hover:text-primary hover:ring-primary/50"
                      >
                        +{p}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                Stock
                {Number.isFinite(stockActual) && Number.isFinite(stockMinimo) && (
                  <StockBadge stockActual={stockActual} stockMinimo={stockMinimo} />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Actual" htmlFor="stockActual" required error={errors.stockActual}>
                <Input
                  id="stockActual"
                  name="stockActual"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  className="tabular-nums"
                  value={form.stockActual}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.stockActual)}
                />
              </Field>
              <Field label="Mínimo" htmlFor="stockMinimo" required error={errors.stockMinimo}>
                <Input
                  id="stockMinimo"
                  name="stockMinimo"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  className="tabular-nums"
                  value={form.stockMinimo}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.stockMinimo)}
                />
              </Field>
              <p className="col-span-2 -mt-1 text-xs text-muted-foreground">
                Cuando el stock llegue al mínimo, el producto aparece en las alertas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Acciones (celular) */}
      <div className="mt-6 flex gap-2 sm:hidden">
        <Button type="button" variant="outline" className="flex-1" onClick={() => onNavegar("inventario")} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-[2]" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : <Save />}
          {enviando ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
