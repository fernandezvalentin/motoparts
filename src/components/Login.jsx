"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail, Motorbike, Play } from "lucide-react";
import { login } from "@/lib/api";
import { ES_DEMO_CLIENTE } from "@/lib/demo/config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // En la demo pública el formulario queda plegado debajo del botón "Entrar a la demo"
  const [mostrarFormulario, setMostrarFormulario] = useState(!ES_DEMO_CLIENTE);
  const [entrandoDemo, setEntrandoDemo] = useState(false);
  const [errorDemo, setErrorDemo] = useState("");

  const entrarDemo = async () => {
    setErrorDemo("");
    setEntrandoDemo(true);
    try {
      const res = await fetch("/api/demo/login", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo entrar a la demo.");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setErrorDemo(err.message);
      setEntrandoDemo(false);
    }
  };

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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Resplandor ámbar de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Motorbike className="size-8" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Moto Parts</h1>
            <p className="text-sm text-muted-foreground">Sistema de inventario y ventas</p>
          </div>
        </div>

        {ES_DEMO_CLIENTE && (
          <Card className="mb-4 gap-4 border-primary/40 shadow-xl shadow-black/40">
            <CardHeader>
              <CardTitle className="text-lg">Probá la demo</CardTitle>
              <CardDescription>
                Recorré el inventario, hacé ventas y cargá facturas con datos de ejemplo. No hace falta registrarse:
                los datos se reinician todos los días.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {errorDemo && (
                <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                  <CircleAlert />
                  <AlertDescription>{errorDemo}</AlertDescription>
                </Alert>
              )}
              <Button size="lg" className="h-11 w-full font-semibold" onClick={entrarDemo} disabled={entrandoDemo}>
                {entrandoDemo ? <Loader2 className="animate-spin" /> : <Play />}
                {entrandoDemo ? "Entrando..." : "Entrar a la demo"}
              </Button>
              {!mostrarFormulario && (
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(true)}
                  className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  ¿Tenés usuario? Ingresá con tu email
                  <ChevronDown className="size-3.5" />
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {mostrarFormulario && (
        <Card className="gap-5 border-border/80 shadow-xl shadow-black/40 animate-in fade-in-0">
          <CardHeader>
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
            <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="h-11 pl-9"
                    placeholder="nombre@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={cargando}
                    aria-invalid={Boolean(error) && !email}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={verPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 pr-10 pl-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={cargando}
                    aria-invalid={Boolean(error) && !password}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {verPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-2 h-11 w-full font-semibold" disabled={cargando}>
                {cargando ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        )}
      </div>
    </main>
  );
}
