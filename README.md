# CALAIRE-EA — Portal de Ensayos de Aptitud

App web para gestión de rondas EA con autenticación WorkOS y base de datos Supabase.

## Setup inicial

### Cuentas requeridas

**WorkOS** (`workos.com`, tier Free):
1. Crear cuenta y una Application
2. En *Redirects* agregar `http://localhost:3000/auth/callback`
3. En *Roles & Permissions* crear roles: `admin` y `member`
4. Crear usuario admin en *Users* y asignarle rol `admin`
5. Copiar `API Key` y `Client ID`

**Supabase** (`supabase.com`, tier Free):
1. Crear cuenta y un Project
2. Ir a *SQL Editor* y ejecutar `db/schema.sql`
3. Copiar URL, anon key y service role key desde *Project Settings → API*

### Variables de entorno

```bash
cp .env.example .env.local
# Llenar con las credenciales de WorkOS y Supabase
```

Defina `NEXT_PUBLIC_APP_URL` con la URL pública de la app, por ejemplo `http://localhost:3000`.
Se usa para construir los enlaces formales de acceso por participante.

### Correr en desarrollo

```bash
npm run dev
```

### Validacion previa

```bash
npm run build
```

La compilacion valida las rutas protegidas, formularios y handlers antes del despliegue.

## Deploy rapido

### Vercel

1. Importar el repositorio en Vercel.
2. Definir las mismas variables de `.env.local` en `Project Settings -> Environment Variables`.
3. En WorkOS agregar la URL de produccion en *Redirects*, por ejemplo `https://portal-ea.vercel.app/auth/callback`.
4. Confirmar que Supabase permita conexiones con las credenciales del proyecto cloud activo.
5. Ejecutar un smoke test completo: login, creacion de ronda, invitacion, carga de resultados y exportacion CSV.

## Flujo de participantes

Al crear una ronda, el coordinador define también el número de participantes esperados.
La app genera ese número de enlaces individuales en la vista de participantes de la ronda.
Cada enlace puede enviarse manualmente por correo u oficio; el primer usuario autenticado que
entre con ese enlace reclama ese cupo y queda habilitado para cargar resultados.

---

## Migrar a otra cuenta

Todo el acoplamiento a las cuentas vive solo en `.env.local`.

**WorkOS:**
1. Crear nueva cuenta/Application
2. Agregar Redirect URI: `http://localhost:3000/auth/callback` (o la URL de producción)
3. Recrear roles `admin` / `member`
4. Actualizar `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` en `.env.local`

**Supabase:**
1. Crear nuevo Project
2. Ejecutar `db/schema.sql` en el SQL Editor del nuevo proyecto
3. Actualizar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`
4. Si hay datos en producción: exportar desde el proyecto viejo (*Table Editor → Export*) e importar en el nuevo

Reiniciar el servidor después de cambiar `.env.local`.

---

## Stack

| Componente | Tecnología |
|---|---|
| Frontend + API | Next.js 16.2.4 (App Router, TypeScript) |
| Auth | WorkOS AuthKit (magic link) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| UI | Tailwind CSS |
| Deploy | Vercel + Supabase cloud |
