"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import "./Login.css";

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    setError("");
    setCargando(true);

    try {
      await login(email, password);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Email o contraseña incorrectos.");
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
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              className="form-control"
              placeholder="Ej: admin@motoparts.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={cargando}
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
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
