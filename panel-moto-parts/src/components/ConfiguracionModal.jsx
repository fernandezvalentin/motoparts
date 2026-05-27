import { useState } from "react";
import { actualizarCredenciales } from "../services/api";
import "./ConfiguracionModal.css";

export const ConfiguracionModal = ({ onClose, onLogout }) => {
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [nuevaContraseña, setNuevaContraseña] = useState("");
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoUsuario && !nuevaContraseña) {
      setError("Por favor, ingresa al menos un nuevo usuario o contraseña.");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      await actualizarCredenciales(nuevoUsuario, nuevaContraseña);
      setExito(true);
      setTimeout(() => {
        onLogout(); // Forzamos cerrar sesión tras cambiar datos
      }, 3000);
    } catch (err) {
      setError(err.message || "Error al actualizar las credenciales.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay visible" onClick={onClose}>
      <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Configuración</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {exito ? (
            <div className="config-success">
              <h3>¡Credenciales actualizadas!</h3>
              <p>Por seguridad, por favor inicia sesión nuevamente.</p>
              <p className="loading-text">Redirigiendo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="config-form">
              <p className="config-hint">
                Puedes cambiar tu usuario, tu contraseña o ambos. Si dejas un campo en blanco, ese dato no se modificará.
              </p>
              
              {error && <div className="config-error">{error}</div>}

              <div className="form-group">
                <label>Nuevo Usuario</label>
                <input
                  type="text"
                  value={nuevoUsuario}
                  onChange={(e) => setNuevoUsuario(e.target.value)}
                  placeholder="Ej: juan_admin"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  value={nuevaContraseña}
                  onChange={(e) => setNuevaContraseña(e.target.value)}
                  placeholder="Escribe la nueva contraseña"
                  className="form-control"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={cargando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={cargando}>
                  {cargando ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
