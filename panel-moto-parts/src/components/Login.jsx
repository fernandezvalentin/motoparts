import { useState } from "react";
import { login } from "../services/api";
import "./Login.css";

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    setError("");
    setCargando(true);

    try {
      const data = await login(username, password);
      if (data.token) {
        localStorage.setItem("moto_parts_token", data.token);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "Usuario o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏍️</div>
          <h1 className="login-title">Moto Parts</h1>
          <p className="login-subtitle">Acceso seguro al sistema</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={cargando}
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={cargando}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={cargando}
          >
            {cargando ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
