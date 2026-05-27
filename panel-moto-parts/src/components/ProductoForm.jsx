// src/components/ProductoForm.jsx
import { useState, useEffect } from "react";
import { crearProducto, actualizarProducto } from "../services/api";

const CATEGORIAS = [
  "Motor",
  "Frenos",
  "Suspensión",
  "Eléctrico",
  "Transmisión",
  "Carrocería",
  "Filtros",
  "Lubricantes",
  "Accesorios",
  "Otros",
];

const INITIAL_STATE = {
  sku: "",
  nombre: "",
  categoria: "Otros",
  descripcion: "",
  proveedor: "",
  precio: "",
  stockActual: "",
  stockMinimo: "",
};

export function ProductoForm({ productoAEditar, setProductoAEditar, onOperacionExitosa, onAgregarToast, onNavegar }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [enviando, setEnviando] = useState(false);
  const [errors, setErrors] = useState({});

  const editando = productoAEditar !== null;

  useEffect(() => {
    if (productoAEditar) {
      setForm({
        sku: productoAEditar.sku || "",
        nombre: productoAEditar.nombre || "",
        categoria: productoAEditar.categoria || "Otros",
        descripcion: productoAEditar.descripcion || "",
        proveedor: productoAEditar.proveedor || "",
        precio: productoAEditar.precio?.toString() || "",
        stockActual: productoAEditar.stockActual?.toString() || "",
        stockMinimo: productoAEditar.stockMinimo?.toString() || "",
      });
      setErrors({});
    } else {
      setForm(INITIAL_STATE);
      setErrors({});
    }
  }, [productoAEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validar = () => {
    const newErrors = {};
    if (!form.sku.trim()) newErrors.sku = "El SKU es obligatorio";
    if (!form.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!form.precio || parseFloat(form.precio) < 0) newErrors.precio = "Ingresá un precio válido";
    if (form.stockActual === "" || parseInt(form.stockActual) < 0) newErrors.stockActual = "Stock inválido";
    if (form.stockMinimo === "" || parseInt(form.stockMinimo) < 0) newErrors.stockMinimo = "Mínimo inválido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);

    const productoData = {
      sku: form.sku.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      proveedor: form.proveedor.trim(),
      precio: parseFloat(form.precio),
      stockActual: parseInt(form.stockActual),
      stockMinimo: parseInt(form.stockMinimo),
    };

    if (editando) {
      productoData.id = productoAEditar.id;
      const ok = await actualizarProducto(productoAEditar.id, productoData);
      if (ok) {
        onAgregarToast(`"${productoData.nombre}" actualizado correctamente`, "success");
        setProductoAEditar(null);
        setForm(INITIAL_STATE);
        onOperacionExitosa();
        onNavegar("inventario");
      } else {
        onAgregarToast("Error al actualizar el producto", "error");
      }
    } else {
      const resultado = await crearProducto(productoData);
      if (resultado) {
        onAgregarToast(`"${productoData.nombre}" agregado al inventario`, "success");
        setForm(INITIAL_STATE);
        onOperacionExitosa();
        onNavegar("inventario");
      } else {
        onAgregarToast("Error al guardar. Verificá que el SKU no esté duplicado.", "error");
      }
    }

    setEnviando(false);
  };

  const handleCancelar = () => {
    setProductoAEditar(null);
    setForm(INITIAL_STATE);
    setErrors({});
    onNavegar("inventario");
  };

  return (
    <div className="producto-form-page" style={{ animation: "fadeInUp 400ms var(--ease-out)" }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {editando ? `Editando: ${productoAEditar.nombre}` : "Nuevo Producto"}
          </h2>
          <p className="page-subtitle">
            {editando
              ? `Modificando artículo SKU: ${productoAEditar.sku}`
              : "Completá los datos del nuevo artículo"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 800 }}>
        {/* Row 1: SKU + Nombre */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
          <div className="form-group">
            <label className="label" htmlFor="sku">SKU *</label>
            <input
              id="sku"
              name="sku"
              type="text"
              className={`input ${errors.sku ? "error" : ""}`}
              placeholder="Ej: MOT-001"
              value={form.sku}
              onChange={handleChange}
              style={{ textTransform: "uppercase" }}
            />
            {errors.sku && <span style={{ color: "var(--danger)", fontSize: "var(--font-xs)" }}>{errors.sku}</span>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="nombre">Nombre del Artículo *</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              className={`input ${errors.nombre ? "error" : ""}`}
              placeholder="Ej: Pistón 150cc"
              value={form.nombre}
              onChange={handleChange}
            />
            {errors.nombre && <span style={{ color: "var(--danger)", fontSize: "var(--font-xs)" }}>{errors.nombre}</span>}
          </div>
        </div>

        {/* Row 2: Categoría + Proveedor */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
          <div className="form-group">
            <label className="label" htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              name="categoria"
              className="select"
              value={form.categoria}
              onChange={handleChange}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="proveedor">Proveedor</label>
            <input
              id="proveedor"
              name="proveedor"
              type="text"
              className="input"
              placeholder="Ej: Honda Original"
              value={form.proveedor}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Row 3: Precio + Stock Actual + Stock Mínimo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
          <div className="form-group">
            <label className="label" htmlFor="precio">Precio ($) *</label>
            <input
              id="precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              className={`input ${errors.precio ? "error" : ""}`}
              placeholder="0.00"
              value={form.precio}
              onChange={handleChange}
            />
            {errors.precio && <span style={{ color: "var(--danger)", fontSize: "var(--font-xs)" }}>{errors.precio}</span>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="stockActual">Stock Actual *</label>
            <input
              id="stockActual"
              name="stockActual"
              type="number"
              min="0"
              className={`input ${errors.stockActual ? "error" : ""}`}
              placeholder="0"
              value={form.stockActual}
              onChange={handleChange}
            />
            {errors.stockActual && <span style={{ color: "var(--danger)", fontSize: "var(--font-xs)" }}>{errors.stockActual}</span>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="stockMinimo">Stock Mínimo *</label>
            <input
              id="stockMinimo"
              name="stockMinimo"
              type="number"
              min="0"
              className={`input ${errors.stockMinimo ? "error" : ""}`}
              placeholder="0"
              value={form.stockMinimo}
              onChange={handleChange}
            />
            {errors.stockMinimo && <span style={{ color: "var(--danger)", fontSize: "var(--font-xs)" }}>{errors.stockMinimo}</span>}
          </div>
        </div>

        {/* Row 4: Descripción */}
        <div className="form-group" style={{ marginBottom: "var(--space-8)" }}>
          <label className="label" htmlFor="descripcion">Descripción (opcional)</label>
          <textarea
            id="descripcion"
            name="descripcion"
            className="textarea"
            placeholder="Detalles adicionales del producto..."
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          {editando && (
            <button type="button" className="btn btn-secondary" onClick={handleCancelar}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={enviando}
          >
            {enviando
              ? "Guardando..."
              : editando
              ? "💾 Actualizar Producto"
              : "➕ Guardar Producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
