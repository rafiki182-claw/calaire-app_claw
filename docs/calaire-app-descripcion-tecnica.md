# calaire-app — Descripción técnica y evaluación documental

**Fecha:** 2026-04-27  
**Repositorio:** `/home/w182/w421/calaire-app`  
**Rama activa:** `feat/convex-migration`

---

## 1. Rol de calaire-app en el programa CALAIRE-EA

calaire-app es el **portal web** del ecosistema de software CALAIRE-EA. Su función dentro del programa es digitalizar los flujos operativos que en papel corresponden a los formatos F-PSEA-05 a F-PSEA-14: invitación de participantes, captura de datos de equipos, ingreso de resultados de medición y exportación de los datos hacia el motor estadístico pt_app.

El otro componente del ecosistema — **pt_app** (R/Shiny + ptcalc) — consume el archivo `summary_n13.csv` que calaire-app genera y ejecuta la cadena de cálculo ISO 13528:2022 (valor asignado → puntajes z/z'/ζ/En). Las dos aplicaciones se integran exclusivamente a través de ese contrato CSV de 7 columnas.

```
Participante → calaire-app (formulario web)
                  ↓ exportación CSV
              summary_n13.csv
                  ↓
              pt_app (R/Shiny)
                  ↓
              Puntajes z / F-PSEA-14
```

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework web | Next.js 16.2.4 (App Router, React 19) |
| Estilos | Tailwind CSS 4 |
| Autenticación | WorkOS AuthKit — Email OTP / Magic Link |
| Base de datos | Convex (migración desde Supabase completada en rama actual) |
| Despliegue | Vercel (pendiente; operativo en local) |
| Lenguaje | TypeScript 5 |

La autenticación por OTP/Magic Link fue elegida para garantizar compatibilidad con laboratorios cuyo correo corporativo está detrás de Azure AD sin MFA externo habilitado (caso habitual en redes de monitoreo colombianas).

---

## 3. Módulos funcionales

### 3.1 Autenticación y control de acceso (`/login`, `/auth/callback`, `/denied`)

WorkOS gestiona el ciclo completo: inicio de sesión → OTP → callback → sesión. La ruta `/denied` muestra un mensaje cuando el usuario autenticado no tiene permiso sobre el recurso solicitado.

Dos perfiles de usuario determinan la experiencia dentro de cada ronda:

| Perfil | Descripción | Equivalente SGC |
|--------|-------------|-----------------|
| `member` | Participante estándar | Laboratorio P1 o P2 |
| `member_special` | Laboratorio de referencia | UNAL — recibe badge violeta y vista diferenciada |

### 3.2 Dashboard coordinador (`/dashboard`)

Vista exclusiva del administrador (coordinador EA). Muestra todas las rondas con sus estados y permite:

- **Crear rondas** (código, nombre, estado inicial `borrador`).
- **Gestionar el ciclo de vida**: `borrador → activa → cerrada` (y reapertura `cerrada → activa`).
- **Configurar contaminantes por ronda**: gas (CO/SO₂/O₃/NO/NO₂), número de niveles y réplicas (2 ó 3).

### 3.3 Gestión de participantes (`/dashboard/rondas/[id]/participantes`)

El coordinador invita laboratorios mediante **tokens manuales** (sin necesidad de conocer el correo a priori). El flujo es:

1. Coordinador crea un slot con prefijo `pendiente:<token>` en `rondaParticipantes`.
2. El participante se autentica con WorkOS y canjea el token en `/ronda/[codigo]`.
3. El slot se actualiza con el `workosUserId` real (`claimParticipanteToken`).

La vista del coordinador muestra el conteo de envíos por participante y su estado (`pendiente` / `asignado`).

### 3.4 Ficha de registro del participante — F-PSEA-05A digital

Dos interfaces acceden a la misma ficha:

| Ruta | Quién la usa | Modo |
|------|-------------|------|
| `/ronda/[codigo]/registro` | Participante | Edición con auto-guardado campo a campo |
| `/dashboard/rondas/[id]/participantes/[pid]/ficha` | Coordinador | Vista/edición administrativa (`FichaAdminEditor`) |

**Campos que captura:**

| Sección | Datos |
|---------|-------|
| Datos del participante | Laboratorio, responsable, cargo, ciudad, departamento, teléfono |
| Acompañantes (0-N) | Nombre completo, documento de identidad, rol |
| Analizadores (0-N) | Analito, fabricante, modelo, N° serie, método EPA, última calibración, tipo verificación, incertidumbre declarada, unidad de salida |
| Instrumentos auxiliares (0-N) | Equipo, marca/modelo, N° serie, cantidad |
| Logística | Medio de transporte, hora de llegada, estacionamiento, observaciones |
| Declaraciones | 4 checkboxes de conformidad + nombre de firma |

El auto-guardado actúa campo a campo (cada cambio lanza un `guardarCampoFichaAction` o `guardarListasAction`). La ficha pasa de `borrador` a `enviado` con `enviarFichaFinalAction`, tras lo cual queda en modo solo lectura.

### 3.5 Configuración PT (`/dashboard/rondas/[id]/configuracion-pt`)

Permite al coordinador definir la estructura de medición PT de la ronda:

- **PT Items** (`rondaPtItems`): combinación contaminante + `runCode` + `levelLabel`. Representan las celdas de medición del formulario del participante.
- **Sample Groups** (`rondaPtSampleGroups`): grupos de réplicas dentro de cada run.

### 3.6 Formulario de resultados del participante (`/ronda/[codigo]`)

Formulario principal de captura de datos de medición. Dos variantes según el perfil:

- **`FormularioRonda`** — participante estándar: grilla de celdas PT (una por ptItem × sampleGroup). Cada celda registra d1, d2, d3 (lecturas individuales), promedio, desviación estándar, u(x) e u(x)_expandida.
- **`FormularioReferencia`** — UNAL: interfaz diferenciada con badge violeta.

**Auto-guardado:** cada modificación de celda activa `guardarEnvioAction` con debounce. El envío final (`enviarInformeFinalAction`) cierra el formulario con `finalSubmittedAt` y activa el modo solo lectura.

### 3.7 Panel de resultados y exportación CSV (`/dashboard/rondas/[id]/resultados`)

Vista administrativa con los resultados agregados de todos los participantes. Dos endpoints de exportación:

| Ruta | Archivo generado | Destino |
|------|-----------------|---------|
| `/resultados/export.csv` | `<codigo>-resultados.csv` | Uso interno / revisión |
| `/resultados/export-pt.csv` | `<codigo>-pt.csv` | **`summary_n13.csv`** para pt_app |

El CSV exportado para pt_app sigue el contrato de 7 columnas definido en el SGC: `lab_code, pollutant, level, run, rep, result, unit`.

---

## 4. Modelo de datos (Convex)

```
rondas
  ├── rondaContaminantes        (gas, niveles, réplicas)
  ├── rondaParticipantes        (WorkOS user, token, perfil, código)
  │     └── fichasRegistro      (F-PSEA-05A: 1:1 con rondaParticipantes)
  │           ├── fichasAcompanantes   (0-N)
  │           ├── fichasAnalizadores   (0-N)
  │           └── fichasInstrumentos   (0-N)
  ├── rondaPtItems              (contaminante × run × nivel)
  ├── rondaPtSampleGroups       (grupos de réplicas)
  └── enviosPt                  (d1/d2/d3, mean, sd, ux, ux_exp)
envios                          (resultados regulares no-PT)
```

Los índices compuestos en Convex replican las restricciones UNIQUE que tenía el esquema Supabase anterior (p. ej. `by_ronda_user_cont_nivel` en `envios`, `by_participante_item_group` en `enviosPt`).

---

## 5. Evaluación documental — calaire-app vs. `indice_documentos.md`

El índice (`indice_documentos.md`) describe cuatro categorías de documentos con rutas base en `docs/prueba_piloto/`. A continuación se contrasta lo declarado con lo que efectivamente existe en el repositorio.

### 5.1 Procedimientos técnicos (P-PSEA) — nivel 2

| Código | Título | Ubicación declarada | ¿Existe en repo? |
|--------|--------|---------------------|:---:|
| P-PSEA-01 | Protocolo General EA | `docs/docs_sgc/` | ✗ |
| P-PSEA-04 | Procedimiento EA para O₃ | `docs/docs_sgc/` | ✗ |
| P-PSEA-09 | Planificación de Ronda EA | `docs/docs_sgc/` | ✗ |
| P-PSEA-10 | Manejo de Ítems PT | `prueba_piloto/` | ✗ |
| P-PSEA-20 | Comunicación PT | `prueba_piloto/` | ✗ |
| P-PSEA-22 | Reportes PT | `prueba_piloto/` | ✗ |

Ningún procedimiento P-PSEA existe en el repositorio. Las carpetas `docs/docs_sgc/` y `docs/prueba_piloto/` tampoco existen; el único subdirectorio en `docs/` es `ronda_simple/`.

### 5.2 Instructivos técnicos (I-PSEA) — nivel 3

| Código | Título | ¿Existe en repo? |
|--------|--------|:---:|
| I-PSEA-02 | Producción de Ítems PT | ✗ |
| I-PSEA-03 | Control Ambiental | ✗ |
| I-PSEA-04 | Validación de Métodos | ✗ |
| I-PSEA-05 | Estimación de Incertidumbre | ✗ |
| I-PSEA-06 | Control de Calidad de Datos | ✗ |
| I-PSEA-07 | Diseño Estadístico | ✗ |
| I-PSEA-08 | Valor Asignado | ✗ |
| I-PSEA-09 | Instrucciones a Participantes | ✗ |
| I-PSEA-10 | Homogeneidad y Estabilidad | ✗ |
| I-PSEA-11 | Análisis de Datos | ✗ |
| I-PSEA-12 | Evaluación de Desempeño | ✗ |
| I-PSEA-13 | Validación de Software y Sistemas | ✗ |
| I-PSEA-14 | Visualización de Datos y Gráficos | ✗ |
| I-PSEA-15 | Caracterización | ✗ |

Ningún instructivo existe en el repositorio.

### 5.3 Formatos de ejecución por ronda (F-PSEA-05 a F-PSEA-14)

El índice especifica tres subcarpetas; la ruta base declarada (`docs/prueba_piloto/`) difiere de la ruta real (`docs/`).

| Código | Título | `ronda_simple/` | `ronda_compleja_fase1/` | `ronda_compleja_fase2/` |
|--------|--------|:---:|:---:|:---:|
| F-PSEA-05 | Confirmación de Participación | ✓ | ✗ | ✗ |
| F-PSEA-06 | Plan de Ronda EA | ✓ | ✗ | ✗ |
| F-PSEA-07 | Lista Maestra de Participantes | ✓ | ✗ | ✗ |
| F-PSEA-08 | Registro de Preparación del Ítem | ✓ | ✗ | ✗ |
| F-PSEA-09 | Registro de Homogeneidad | ✓ | ✗ | ✗ |
| F-PSEA-10 | Registro de Estabilidad | ✓ | ✗ | ✗ |
| F-PSEA-11 | Registro de Envío y Recepción | ✓ | ✗ | ✗ |
| F-PSEA-12 | Formato de Reporte del Participante | ✓ | ✗ | ✗ |
| F-PSEA-13 | Hoja de Revisión de Datos | ✓ | ✗ | ✗ |
| F-PSEA-14 | Hoja de Cálculo y Aprobación Estadística | ✓ | ✗ | ✗ |

**Observación de ruta:** los 10 formatos de `ronda_simple` existen en `docs/ronda_simple/`, no en `docs/prueba_piloto/ronda_simple/` como indica el índice. Las subcarpetas `ronda_compleja_fase1/` y `ronda_compleja_fase2/` no han sido creadas.

### 5.4 Formatos de soporte y cierre (F-PSEA-05A y F-PSEA-15 a F-PSEA-23)

| Código | Título | ¿Existe en repo? | Nota |
|--------|--------|:---:|------|
| F-PSEA-05A | Hoja de Registro del Participante | ⚠ | Existe como `F-PSEA-05A-P1_DIL.md` y `.xlsx` en la raíz del repo (no en `docs/`) |
| F-PSEA-15 | Registro de No Conformidad / CAPA | ✗ | |
| F-PSEA-16 | Registro de Quejas | ✗ | |
| F-PSEA-17 | Registro de Apelaciones | ✗ | |
| F-PSEA-18 | Acta de Revisión por la Dirección | ✗ | |
| F-PSEA-19 | Lista de Verificación Auditoría Interna | ✗ | |
| F-PSEA-20 | Protocolo de Validación de Software | ✗ | |
| F-PSEA-21 | Matriz de Competencia y Autorización | ✗ | |
| F-PSEA-22 | Matriz de Riesgos de Imparcialidad | ✗ | |
| F-PSEA-23 | Evaluación de Proveedores Externos | ✗ | |

### 5.5 Procedimientos de gestión/SGC (P-PSEA-11 a P-PSEA-28)

Ninguno de los 15 procedimientos de gestión existe en el repositorio. Su ausencia no bloquea la ejecución técnica de rondas.

### 5.6 Documentos presentes en repo pero no declarados en el índice

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `pt-fase0-diseno.md` | `docs/` | Diseño técnico del módulo PT (fase 0) |
| `F-PSEA-05A-P1_DIL.md` | raíz | Instancia completada de F-PSEA-05A para P1 (SIATA) |
| `F-PSEA-05A-P1_DIL.xlsx` | raíz | Versión Excel de la misma ficha |
| `descripcion_programa_ea.md` | raíz | Descripción general del programa (este doc es su referencia) |
| `indice_documentos.md` | raíz | Índice de la prueba piloto |
| `datos_ronda.csv`, `homogeneity.csv`, `stability.csv`, `summary_n13.csv` | raíz | Datos de prueba / validación |

---

## 6. Resumen de brechas documentales

| Categoría | Declarados | Presentes | Faltantes | Estado |
|-----------|:---:|:---:|:---:|--------|
| Procedimientos P-PSEA (operativos) | 6 | 0 | 6 | No creados en repo |
| Instructivos I-PSEA | 14 | 0 | 14 | No creados en repo |
| Formatos ronda_simple | 10 | 10 | 0 | ✓ Completo (ruta difiere del índice) |
| Formatos ronda_compleja_fase1 | 10 | 0 | 10 | Subcarpeta inexistente |
| Formatos ronda_compleja_fase2 | 10 | 0 | 10 | Subcarpeta inexistente |
| Formatos soporte (F-PSEA-05A, 15–23) | 10 | 1* | 9 | *F-PSEA-05A en raíz, fuera de `docs/` |
| Procedimientos gestión P-PSEA (11–28) | 15 | 0 | 15 | No bloquean ejecución técnica |

**Acciones concretas para cerrar las brechas operativas:**

1. Crear `docs/prueba_piloto/` y mover `docs/ronda_simple/` a `docs/prueba_piloto/ronda_simple/` (alinear ruta con el índice).
2. Crear `docs/prueba_piloto/ronda_compleja_fase1/` y `docs/prueba_piloto/ronda_compleja_fase2/` con las copias de los 10 formatos adaptadas por ronda.
3. Mover `F-PSEA-05A-P1_DIL.md` a `docs/prueba_piloto/` (o una subcarpeta de soporte).
4. Crear plantillas para F-PSEA-15 a F-PSEA-23 en `docs/prueba_piloto/`.
5. Los P-PSEA e I-PSEA son documentos SGC que normalmente viven fuera del repositorio de la app (Logseq/`docs_sgc/`); su inclusión en este repo es opcional según la política documental del proyecto.
