# Fase 2: Resumen operativo de ronda

**Creado**: 2026-04-28 00:06  
**Depende de**: Fase 1 (navegación sin duplicación, dashboard como bandeja de trabajo)  
**Archivos principales**: `app/(protected)/dashboard/rondas/[id]/page.tsx`, `lib/rondas.ts`, `convex/rondas.ts`

---

## Contexto y problema

La ruta `/dashboard/rondas/[id]` **no tiene `page.tsx`**. Actualmente el coordinador solo puede llegar a:

- `/dashboard/rondas/[id]/participantes` — gestión de cupos
- `/dashboard/rondas/[id]/configuracion-pt` — configuración PT
- `/dashboard/rondas/[id]/resultados` — resultados

No existe una vista que responda "¿qué falta para que esta ronda avance?". El coordinador debe recorrer tres páginas para entender el estado real de una ronda.

### Observaciones del código existente

**`convex/rondas.ts`**:
- `getRonda` devuelve ronda + contaminantes.
- `listParticipantesRondaResumen` devuelve por participante: `estado` (pendiente/reclamado), `ficha_estado` (no_iniciada/borrador/enviado), `envios_pt_count`.
- `listResultadosPTRonda` en `convex/pt.ts` devuelve por participante: `completados`, `total_esperado`, `enviados_at`.
- No existe ninguna query de métricas agregadas. Todo se puede computar en el servidor Next.js.

**`lib/rondas.ts`**:
- Tipos `ParticipanteRondaResumen` y `ResultadoParticipantePT` ya capturan los campos necesarios.
- No existe ninguna función `derivarEstadoOperativo()` ni tipo `EstadoOperativo`.

**Páginas hijas**:
- `configuracion-pt/page.tsx` ya usa un breadcrumb con enlace a `/dashboard/rondas/${rondaId}` — ese enlace hoy da 404. Planea la existencia de esta página.
- `participantes/page.tsx` usa un breadcrumb que salta directo a `/dashboard`, no pasa por la ronda.

---

## Objetivo

Crear `/dashboard/rondas/[id]/page.tsx` como la **cabina de control** de una ronda, con:

1. Estado operativo derivado (7 estados posibles).
2. Métricas de progreso (cupos, fichas, envíos, PT).
3. Alertas accionables por condición.
4. Navegación contextual a subpáginas (tabs).
5. Acciones de transición de estado (publicar, cerrar, reabrir).

---

## Propuesta de cambios

---

### 1. `lib/rondas.ts` — función de estado operativo + tipos

#### [MODIFY] [lib/rondas.ts](file:///home/w182/w421/calaire-app/lib/rondas.ts)

**Tipos nuevos a agregar**:

```typescript
export type EstadoOperativo =
  | 'preparar_ronda'
  | 'invitar_participantes'
  | 'esperando_fichas'
  | 'recibiendo_resultados'
  | 'revisar_incompletos'
  | 'lista_para_exportar'
  | 'cerrada'

export type RondaMetricas = {
  cupos_totales: number
  cupos_reclamados: number
  fichas_enviadas: number
  fichas_pendientes: number       // reclamados sin ficha enviada
  envios_finales: number          // participantes con enviados_at !== null
  envios_esperados: number        // = cupos_reclamados
  pt_configurado: boolean         // ptItems.length > 0 && sampleGroups.length > 0
  estado_operativo: EstadoOperativo
  accion_recomendada: string
}
```

**Función derivada (pura, sin I/O)**:

```typescript
export function derivarEstadoOperativo(
  ronda: Pick<Ronda, 'estado'>,
  datos: Omit<RondaMetricas, 'estado_operativo' | 'accion_recomendada'>
): Pick<RondaMetricas, 'estado_operativo' | 'accion_recomendada'>
```

**Lógica de derivación** (prioridad descendente):

| Condición | `estado_operativo` | `accion_recomendada` |
|---|---|---|
| `ronda.estado === 'cerrada'` | `cerrada` | "La ronda está cerrada." |
| `!pt_configurado` | `preparar_ronda` | "Configure los items PT y grupos de muestra." |
| `cupos_totales === 0` | `preparar_ronda` | "Agregue participantes antes de activar la ronda." |
| `cupos_reclamados === 0` | `invitar_participantes` | "Comparta los enlaces de invitación. Ningún cupo ha sido reclamado." |
| `fichas_pendientes > 0` | `esperando_fichas` | "Hay fichas pendientes antes de recibir resultados." |
| `envios_finales === 0` | `recibiendo_resultados` | "Esperando envíos finales de los participantes." |
| `envios_finales > 0 && envios_finales < envios_esperados` | `revisar_incompletos` | "Hay participantes que no han enviado resultados." |
| `envios_finales >= envios_esperados` | `lista_para_exportar` | "Todos los envíos están completos. Puede exportar el CSV PT." |

> [!NOTE]
> Esta función es **pura**. Se reutiliza en Fase 1 (dashboard global) y en la tabla de rondas sin duplicar lógica.

**Función de carga de métricas (async)**:

```typescript
export async function getRondaMetricasCompletas(
  rondaId: string,
  ronda: Pick<Ronda, 'estado'>
): Promise<RondaMetricas>
```

Internamente hace **4 queries en paralelo** usando funciones ya existentes:

```typescript
const [participantes, resultadosPT, ptItems, sampleGroups] = await Promise.all([
  listParticipantesRondaResumen(rondaId),   // ya existe
  listResultadosPTRonda(rondaId),            // ya existe en lib/rondas.ts
  listPTItems(rondaId),                      // ya existe
  listPTSampleGroups(rondaId),               // ya existe
])
```

Agrega en memoria:
- `cupos_totales` = `participantes.length`
- `cupos_reclamados` = participantes con `estado === 'reclamado'`
- `fichas_enviadas` = participantes con `ficha_estado === 'enviado'`
- `fichas_pendientes` = `cupos_reclamados - fichas_enviadas`
- `envios_esperados` = `cupos_reclamados`
- `envios_finales` = resultados con `enviados_at !== null`
- `pt_configurado` = `ptItems.length > 0 && sampleGroups.length > 0`

---

### 2. `convex/rondas.ts` — sin cambios en el MVP

> [!NOTE]
> **Decisión deliberada**: No se agrega ninguna query nueva a Convex para el MVP. Se usan las 4 queries existentes compuestas en servidor Next.js. Si hay latencia visible en producción, se crea una query `getRondaResumenOperativo` en Convex en iteración posterior.

---

### 3. `app/(protected)/dashboard/rondas/[id]/RondaContextNav.tsx` — **[NUEVO]**

Componente **cliente** de navegación horizontal para las subpáginas de una ronda.

```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type Props = { rondaId: string; rondaCodigo: string }

const TABS = [
  { label: 'Resumen',          href: (id: string) => `/dashboard/rondas/${id}` },
  { label: 'Participantes',    href: (id: string) => `/dashboard/rondas/${id}/participantes` },
  { label: 'Configuración PT', href: (id: string) => `/dashboard/rondas/${id}/configuracion-pt` },
  { label: 'Resultados',       href: (id: string) => `/dashboard/rondas/${id}/resultados` },
]

export function RondaContextNav({ rondaId, rondaCodigo }: Props) {
  const pathname = usePathname()
  // Lógica de tab activo: match exacto para Resumen, startsWith para los demás
  ...
}
```

> [!NOTE]
> Usar `'use client'` solo para este componente evita convertir toda la página en Client Component.

---

### 4. `app/(protected)/dashboard/rondas/[id]/actions.ts` — **[NUEVO]**

Server Actions para las transiciones de estado:

```typescript
'use server'
import { redirect } from 'next/navigation'
import { requireAuth, isAdmin } from '@/lib/auth'
import { transitionRondaEstado, reabrirRonda } from '@/lib/rondas'

export async function activarRondaAction(formData: FormData): Promise<void>
export async function cerrarRondaAction(formData: FormData): Promise<void>
export async function reabrirRondaAction(formData: FormData): Promise<void>
```

Estas usan `transitionRondaEstado` y `reabrirRonda` ya definidos en `lib/rondas.ts`.

---

### 5. `app/(protected)/dashboard/rondas/[id]/page.tsx` — **[NUEVO]**

**Estructura de la página** (Server Component async):

```
RondaResumenPage
├── Breadcrumb: Dashboard > Rondas > {codigo}
├── RondaContextNav (client, activo en "Resumen")
├── EncabezadoRonda
│   ├── h1: {ronda.nombre}
│   ├── EstadoBadge técnico: borrador | activa | cerrada
│   ├── EstadoOperativoBadge: estado_operativo
│   └── p: accion_recomendada
├── ProgresoBand (4 métricas)
│   ├── Cupos: cupos_reclamados / cupos_totales
│   ├── Fichas: fichas_enviadas / cupos_reclamados
│   ├── Envíos PT: envios_finales / envios_esperados
│   └── Config PT: ✓ configurado | ✗ pendiente
├── AlertasOperativas (lista condicional)
│   ├── [si cupos_totales - cupos_reclamados > 0] → enlace a Participantes
│   ├── [si fichas_pendientes > 0] → enlace a Participantes
│   ├── [si !pt_configurado] → enlace a Configuración PT
│   └── [si envios_finales > 0] → enlace a Resultados
└── AccionesDeEstado (formularios con Server Actions)
    ├── [borrador] Activar ronda →
    ├── [activa]   Cerrar ronda →
    └── [cerrada]  Reabrir ronda →
```

**Paleta por estado operativo**:

| Estado | Color principal |
|---|---|
| `preparar_ronda` | amber (⚠️) |
| `invitar_participantes` | sky (📨) |
| `esperando_fichas` | violet (📋) |
| `recibiendo_resultados` | blue (📥) |
| `revisar_incompletos` | orange (⚡) |
| `lista_para_exportar` | emerald (✓) |
| `cerrada` | slate (🔒) |

---

### 6. Actualización de páginas hijas

#### [MODIFY] [participantes/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/participantes/page.tsx)

Reemplazar el breadcrumb actual (`CALAIRE-EA / Participantes`) por `<RondaContextNav>`. Mantener el `<h1>` y demás contenido intactos.

#### [MODIFY] [configuracion-pt/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/configuracion-pt/page.tsx)

Reemplazar el breadcrumb actual por `<RondaContextNav>`. El enlace a `/dashboard/rondas/${rondaId}` que ya existe deja de ser necesario en el breadcrumb (queda en el nav).

#### [MODIFY] [resultados/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/resultados/page.tsx)

Misma integración de `<RondaContextNav>`.

---

## Orden de implementación

```
1. lib/rondas.ts          — tipos + derivarEstadoOperativo() + getRondaMetricasCompletas()
2. RondaContextNav.tsx    — componente cliente de tabs
3. actions.ts (ronda/id) — activar / cerrar / reabrir
4. page.tsx (ronda/id)   — ensamblaje de la cabina de control
5. participantes/page.tsx — integrar RondaContextNav
6. configuracion-pt/page.tsx — integrar RondaContextNav
7. resultados/page.tsx   — integrar RondaContextNav
```

---

## Archivos modificados / creados

| Archivo | Tipo | Descripción |
|---|---|---|
| [lib/rondas.ts](file:///home/w182/w421/calaire-app/lib/rondas.ts) | MODIFY | Tipos `EstadoOperativo`, `RondaMetricas`; funciones `derivarEstadoOperativo`, `getRondaMetricasCompletas` |
| `app/(protected)/dashboard/rondas/[id]/page.tsx` | NEW | Página de resumen operativo de ronda |
| `app/(protected)/dashboard/rondas/[id]/RondaContextNav.tsx` | NEW | Nav horizontal por tabs (Client Component) |
| `app/(protected)/dashboard/rondas/[id]/actions.ts` | NEW | Server Actions de transición de estado |
| [participantes/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/participantes/page.tsx) | MODIFY | Integrar `RondaContextNav` |
| [configuracion-pt/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/configuracion-pt/page.tsx) | MODIFY | Integrar `RondaContextNav` |
| [resultados/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/resultados/page.tsx) | MODIFY | Integrar `RondaContextNav` |

---

## Criterios de aceptación

- [ ] `/dashboard/rondas/[id]` no da 404 — la ruta existe y carga datos reales.
- [ ] Estado técnico y estado operativo son visualmente distinguibles.
- [ ] La `accion_recomendada` cambia según los datos reales de la ronda.
- [ ] Las 4 métricas (cupos, fichas, envíos, PT) son visibles sin scroll en escritorio.
- [ ] Cada alerta tiene un CTA que lleva a la subpágina correspondiente.
- [ ] La navegación por tabs está presente en la página resumen y en las 3 subpáginas.
- [ ] El tab activo se resalta correctamente en cada ruta.
- [ ] Las acciones de estado están protegidas (solo admin) y visualmente separadas del nav.
- [ ] `derivarEstadoOperativo` es exportable e importable en Fase 1 sin duplicar lógica.
- [ ] No hay queries nuevas en `convex/rondas.ts`.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| 4 queries paralelas añaden latencia visible en SSR | Baja | Acceptable para MVP. Si >500ms, crear query agregada en Convex. |
| `derivarEstadoOperativo` produce estado incorrecto con datos inconsistentes | Media | Preferir estado más conservador (`preparar_ronda`) ante datos ambiguos. Documentar casos borde. |
| Integrar `RondaContextNav` en páginas hijas rompe layouts existentes | Baja | La integración es aditiva. Las páginas son funcionales sin el nav. |
| Acciones de estado sin confirmación pueden cerrar rondas accidentalmente | Media | Mostrar formulario de confirmación en dos pasos (searchParam `?confirm=1`). |

---

## Verificación

### Automatizada
```bash
npm run build    # sin errores TypeScript ni rutas rotas
npm run lint
```

### Manual (5 escenarios)

1. **Ronda en borrador sin PT**: estado operativo = "Preparar ronda", alerta "Falta configuración PT" visible.
2. **Ronda activa con cupos sin reclamar**: alerta "Hay N cupos sin reclamar", CTA → Participantes.
3. **Ronda con fichas pendientes**: estado = "Esperando fichas", alerta visible con CTA.
4. **Ronda con envíos finales**: estado = "Lista para exportar", alerta de exportación visible.
5. **Navegación por tabs**: abrir Participantes, verificar tab activo; abrir Configuración PT, verificar tab activo.
