# 🏍️ Moto Parts - Sistema de Inventario y Punto de Venta

¡Hola! Desarrollé este sistema full-stack como una solución a medida para ayudar a un cliente a administrar su negocio de repuestos de motos. Mi objetivo principal fue crear una herramienta que fuera robusta por detrás, pero extremadamente intuitiva y fácil de usar en el día a día, permitiéndole llevar el control del local sin fricciones tecnológicas.

## 🚀 Características Principales

- **📊 Dashboard Estadístico:** valor total del inventario, top 5 más vendidos, productos por proveedor y alertas automáticas cuando un repuesto se está quedando sin stock.
- **📦 Gestión de Inventario:** alta, baja y modificación de productos, búsqueda por SKU, nombre o proveedor, importación desde Excel (con traducción automática y conversión de dólares) y aumentos masivos de precios.
- **📥 Cargar Stock (pensado para el celular):** buscar el repuesto, tocarlo y poner cuántos llegaron (o cuántos hay en el estante); la app hace la cuenta. Alta rápida de productos nuevos con solo nombre, precio y cantidad.
- **🕘 Movimientos de stock:** cada cambio (cargas, conteos, ventas, importaciones, ediciones) queda registrado con quién y cuándo, y las cargas se pueden deshacer.
- **🛒 Punto de Venta (POS):** carrito con descuentos y métodos de pago; descuenta el stock de forma atómica y no deja vender productos agotados.
- **🧾 Historial de Ventas:** filtros por día/semana/mes/año, impresión de tickets y anulación de ventas con devolución de stock.
- **📄 Facturación de proveedores:** se sube la factura en PDF, el sistema lee número, proveedor, fechas y total para revisarlos, y se lleva el estado de pago (pendiente, pagada, vencida) con el PDF original guardado en Supabase Storage.
- **📱 PWA Instalable:** se instala como app en Windows o en el celular.

## 🛠️ Tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend y API | **Next.js 16** (App Router, Route Handlers, Proxy) + React 19 |
| Base de datos | **Supabase** (Postgres) con Row Level Security y funciones SQL para la lógica transaccional |
| Archivos | **Supabase Storage** (bucket privado para los PDFs de facturas) |
| Autenticación | **Supabase Auth** (email y contraseña, sesión en cookies con `@supabase/ssr`) |
| Crons | **GitHub Actions** programado → `/api/cron/keepalive` para que Supabase no pause el proyecto |
| CI/CD | **GitHub Actions** (lint, build y validación de migraciones) + deploy en **Vercel** |

## 📁 Estructura

```
src/
├── app/
│   ├── (panel)/            # Páginas protegidas: dashboard, inventario, cargar stock, pos, historial, facturación
│   ├── login/              # Pantalla de ingreso
│   ├── api/                # Route Handlers (reemplazan a la API .NET)
│   │   ├── productos/      # CRUD, importar, aumento-masivo, renombrar-proveedor, estadísticas
│   │   ├── ventas/         # registrar, listar, eliminar, limpiar
│   │   ├── facturas/       # CRUD, lectura del PDF (extraer) y link al archivo
│   │   ├── stock/          # ajustar (sumar/conteo), alta rápida, movimientos y deshacer
│   │   └── cron/keepalive/ # Endpoint del cron
│   ├── layout.js
│   └── manifest.js         # Manifest de la PWA
├── components/             # Componentes de la UI
├── lib/
│   ├── api.js              # Funciones que usan los componentes para llamar a la API
│   ├── http.js             # Helpers de los Route Handlers (auth, errores)
│   ├── facturas/           # Lector de PDFs de facturas (+ pruebas)
│   └── supabase/           # Clientes de Supabase (navegador y servidor)
└── proxy.js                # Refresca la sesión y protege las rutas
supabase/
├── config.toml             # Configuración para el entorno local (Supabase CLI)
└── migrations/             # Esquema, RLS y funciones SQL
.github/workflows/
├── ci.yml                  # Lint + build + validación de migraciones en cada push/PR
├── keepalive.yml           # Cron cada 2 días
└── supabase-migrations.yml # Aplica migraciones a producción al hacer push a main
```

## ⚙️ Desarrollo local

Requisitos: Node.js 20.9+ y (opcional, para la base local) Docker.

```bash
npm install
```

```bash
cp .env.example .env.local
```

### Opción A: Supabase local (recomendado para desarrollar)

```bash
npx supabase start
```

El comando aplica las migraciones y muestra la `API URL` y la `Publishable key`: copialas en `.env.local`. El registro público está deshabilitado, así que creá tu usuario desde Supabase Studio (http://127.0.0.1:54323 → Authentication → Add user).

### Opción B: Proyecto de Supabase en la nube

Usá la URL y la publishable key de tu proyecto (ver "Puesta en producción").

### Levantar la app

```bash
npm run dev
```

Visitá http://localhost:3000 e ingresá con tu email y contraseña.

Pruebas del lector de facturas:

```bash
npm test
```

## 🚢 Puesta en producción

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Aplicá el esquema con la CLI (`npx supabase link --project-ref <id>` y `npx supabase db push`), o pegá cada archivo de `supabase/migrations/` **en orden** en el **SQL Editor**. La migración de facturas también crea el bucket privado `facturas` en Storage.
3. En **Authentication → Sign In / Providers**, desactivá **Allow new users to sign up** (solo deben entrar los usuarios que vos crees).
4. En **Authentication → Users → Add user**, creá el usuario administrador.
5. En **Authentication → URL Configuration**, poné la URL de Vercel como *Site URL*.

### 2. Vercel

1. Importá el repositorio de GitHub en [vercel.com](https://vercel.com) (detecta Next.js automáticamente).
2. Cargá las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `CRON_SECRET` (generalo con `openssl rand -hex 32`)
3. Cada push a `main` despliega a producción y cada PR genera una preview.

### 3. GitHub (Settings → Secrets and variables → Actions)

| Secret | Para qué |
| --- | --- |
| `APP_URL` | URL de producción en Vercel (ej. `https://motoparts.vercel.app`) |
| `CRON_SECRET` | El mismo valor que en Vercel |
| `SUPABASE_ACCESS_TOKEN` | Token personal de Supabase (Account → Access Tokens) |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base del proyecto |
| `SUPABASE_PROJECT_ID` | Reference ID del proyecto |

Los tres últimos solo hacen falta si querés que las migraciones nuevas se apliquen solas al hacer push a `main`.

## 🤝 Trabajo a distancia

El sistema está en la nube, así que se puede usar y administrar desde distintas ciudades:

- **Listas de precios:** el proveedor manda el Excel, se reenvía a quien administra y se importa desde **Inventario → Importar Excel** (si la lista no trae stock, el stock no se toca).
- **Cantidades:** en el local se cargan desde el celular en **Cargar Stock** (*Llegó mercadería* suma, *Conteo* fija lo que hay en el estante).
- **Supervisión:** en **Cargar Stock → Movimientos** se ve cada cambio con su usuario; las cargas equivocadas se corrigen con **Deshacer**.
- Conviene crear un usuario por persona (Supabase → Authentication → Users) para saber quién hizo cada cambio.

## ⏰ Crons

`keepalive.yml` corre cada 2 días y llama a `GET /api/cron/keepalive` con el header `Authorization: Bearer <CRON_SECRET>`. Ese endpoint ejecuta una consulta en la base para que Supabase no pause el proyecto gratuito por inactividad (lo hace a los 7 días). Se puede ejecutar a mano desde la pestaña **Actions → Keepalive Supabase → Run workflow**.

> GitHub solo ejecuta los workflows programados que están en la rama por defecto del repositorio.

## 🔐 Seguridad

- Todas las tablas tienen **Row Level Security**: solo usuarios autenticados pueden leer o escribir; el rol anónimo no tiene acceso.
- Las operaciones críticas (registrar/anular ventas, importar, aumentos masivos) son **funciones de Postgres** que corren en una sola transacción y bloquean las filas de stock para evitar ventas simultáneas sobre el mismo producto.
- El SKU es único sin distinguir mayúsculas y minúsculas.
- Las ventas guardan el nombre y SKU del producto: si después se borra el producto, el historial se conserva.

---
*Desarrollado con dedicación para simplificar el trabajo de todos los días.*
