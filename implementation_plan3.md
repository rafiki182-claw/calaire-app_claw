# Fase 3: Rediseño de participantes — orientado a pendientes

**Slug**: fase3-participantes-pendientes  
**Plan padre**: `260427_2355_plan_redisenio-uiux-coordinador.md`  
**Creado**: 2026-04-28 00:06  
**Status**: propuesta para revisión

---

## Objetivo

Transformar la gestión de participantes de una lista administrativa en una herramienta de seguimiento operativo. El coordinador debe poder identificar en segundos qué cupos requieren acción, sin leer tablas completas ni interpretar columnas ambiguas.

### Lo que resuelve esta fase

| Problema actual | Solución fase 3 |
|---|---|
| El enlace de invitación ocupa toda la columna y domina visualmente | El enlace se oculta detrás de un botón `Copiar enlace` |
| "Pendiente" puede significar enlace no reclamado o ficha no enviada | Columnas separadas y etiquetas unívocas por concepto |
| No hay forma de filtrar "solo fichas pendientes" sin recorrer la tabla | Barra de filtros operativos persistentes en URL |
| La página de participantes en `?tab=participantes` duplica la de `/rondas/[id]/participantes` | La vista global queda como índice; la acción es siempre en la vista de ronda |
| Las acciones destructivas (Eliminar) compiten visualmente con "Copiar enlace" | Acciones secundarias separadas en zona visual diferenciada |

---

## Diagnóstico del estado actual

### Datos disponibles (sin queries nuevas)

`ParticipanteRondaResumen` (en `lib/rondas.ts`) ya contiene:
- `estado: 'pendiente' | 'reclamado'` — estado del cupo (enlace)
- `ficha_estado: 'no_iniciada' | 'borrador' | 'enviado'`
- `envios_pt_count: number` — total de envíos PT guardados
- `slot_token: string | null` — para construir el enlace de invitación
- `claimed_at: string | null`

`RondaParticipante` (usado actualmente en la página) tiene solo `envios_count` y `estado: 'pendiente' | 'asignado'`.

**La página actual usa `listParticipantes()` + `listFichaResumenesByRonda()` por separado.** `ParticipanteRondaResumen` (via `listParticipantesRondaResumen()`) ya consolida ficha y envíos PT en una sola query y debe usarse como fuente única.

### Brechas detectadas

1. **`tiene_envio_final` no existe en el tipo resumen**: `final_submitted_at` vive en `EnvioPT`, no en `ParticipanteRondaResumen`. Hay que decidir si se agrega o se aproxima con `envios_pt_count > 0`.

2. **Botón "Copiar enlace" requiere Client Component**: `navigator.clipboard` solo existe en el browser.

3. **Sin filtros por URL en la vista de ronda**: la página actual no lee ningún `searchParam` de filtro.

4. **La sección agregar participante mezcla búsqueda, resultado y formulario**: debe separarse en sección colapsable.

---

## Cambios propuestos

### 1. Ampliar `ParticipanteRondaResumen` con estado de envío final

**Archivo**: `lib/rondas.ts`

> [!IMPORTANT]
> Leer `convex/_generated/ai/guidelines.md` antes de tocar cualquier archivo en `convex/`.

```ts
// Agregar al tipo
export type ParticipanteRondaResumen = {
  // ...campos existentes...
  envios_pt_count: number
  tiene_envio_final: boolean   // ← nuevo
}
```

Si la query Convex no retorna este campo, puede derivarse en el mapper como `envios_pt_count > 0` sin cambios Convex (solución conservadora; ajustar si se necesita semántica más estricta).

---

### 2. Tipo `FiltroParticipante` y función de filtrado pura

**Archivo**: `lib/rondas.ts`

```ts
export type FiltroParticipante =
  | 'todos'
  | 'enlace_pendiente'   // estado === 'pendiente'
  | 'ficha_pendiente'    // estado === 'reclamado' && ficha_estado !== 'enviado'
  | 'ficha_enviada'      // ficha_estado === 'enviado'
  | 'con_envios'         // envios_pt_count > 0
  | 'sin_envios'         // estado === 'reclamado' && envios_pt_count === 0

export function filtrarParticipantes(
  participantes: ParticipanteRondaResumen[],
  filtro: FiltroParticipante
): ParticipanteRondaResumen[] {
  switch (filtro) {
    case 'enlace_pendiente':
      return participantes.filter((p) => p.estado === 'pendiente')
    case 'ficha_pendiente':
      return participantes.filter(
        (p) => p.estado === 'reclamado' && p.ficha_estado !== 'enviado'
      )
    case 'ficha_enviada':
      return participantes.filter((p) => p.ficha_estado === 'enviado')
    case 'con_envios':
      return participantes.filter((p) => p.envios_pt_count > 0)
    case 'sin_envios':
      return participantes.filter(
        (p) => p.estado === 'reclamado' && p.envios_pt_count === 0
      )
    default:
      return participantes
  }
}
```

Esta función es pura y testeable sin infraestructura.

---

### 3. Refactorizar `/rondas/[id]/participantes/page.tsx`

#### 3a. Cambiar fuente de datos

```ts
// Antes (dos queries + join manual)
const [participantes, fichasMap] = await Promise.all([
  listParticipantes(rondaId),
  listFichaResumenesByRonda(rondaId),
])

// Después (una sola query consolidada)
const participantes = await listParticipantesRondaResumen(rondaId)
```

#### 3b. Leer filtro activo desde `searchParams`

```ts
const filtroActivo = (getParam(sp.filtro) ?? 'todos') as FiltroParticipante
const participantesFiltrados = filtrarParticipantes(participantes, filtroActivo)
```

#### 3c. Métricas de resumen

```ts
const totalCupos = participantes.length
const enlacesPendientes = participantes.filter((p) => p.estado === 'pendiente').length
const cuposReclamados = participantes.filter((p) => p.estado === 'reclamado').length
const fichasPendientes = participantes.filter(
  (p) => p.estado === 'reclamado' && p.ficha_estado !== 'enviado'
).length
const fichasEnviadas = participantes.filter((p) => p.ficha_estado === 'enviado').length
const conEnvios = participantes.filter((p) => p.envios_pt_count > 0).length
```

#### 3d. Estructura de la página refactorizada

```
ParticipantesPage
├── Header (breadcrumb + nombre ronda + estado técnico + estado operativo)
├── ResumenStrip (métricas como cards pequeñas, clicables como accesos directos a filtros)
├── FiltroBar (links de filtro con count por estado, activo en URL)
├── TablaParticipantes (5 columnas vs las 7 actuales)
│   └── ParticipanteRow (ver §6)
└── <details> Agregar participante (colapsable)
```

---

### 4. Componente `CopyInvitationLinkButton`

**Ruta nueva**: `app/(protected)/dashboard/components/CopyInvitationLinkButton.tsx`  
**Tipo**: `'use client'`

```tsx
'use client'
import { useState } from 'react'

export function CopyInvitationLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
      title={url}
    >
      {copied ? 'Copiado ✓' : 'Copiar enlace'}
    </button>
  )
}
```

El enlace completo se expone solo en el `title` (tooltip nativo), no en la celda.

---

### 5. Componente `FiltroBar` (Server Component)

Implementado como función dentro de `page.tsx` o archivo separado. Usa `<Link>` puros — sin Client Component.

```tsx
// Tipos de filtro con conteo
const filtros = [
  { valor: 'todos', label: 'Todos', count: totalCupos },
  { valor: 'enlace_pendiente', label: 'Enlace pendiente', count: enlacesPendientes },
  { valor: 'ficha_pendiente', label: 'Ficha pendiente', count: fichasPendientes },
  { valor: 'ficha_enviada', label: 'Ficha enviada', count: fichasEnviadas },
  { valor: 'con_envios', label: 'Con envíos PT', count: conEnvios },
]
```

Los filtros con count `0` se muestran de todas formas (pero desactivados visualmente si count === 0).

---

### 6. Columnas refactorizadas de `ParticipanteRow`

| # | Columna | Contenido | Antes |
|---|---|---|---|
| 1 | **Cupo** | email + participant_code + badge perfil (Participante / Referencia) | Columna "Participante / correo" + columna "Estado" separada |
| 2 | **Enlace** | `CopyInvitationLinkButton` si hay token, badge "Reclamado" si ya fue reclamado | Columna con URL cruda visible |
| 3 | **Ficha** | Badge con estado (`No iniciada` / `Borrador` / `Enviada ✓`), clicable si existe ficha | ✓ igual |
| 4 | **Envíos PT** | count numérico + badge de color si > 0 | Columna "Envíos" genérica |
| 5 | **Acciones** | `Regenerar enlace` + `Eliminar` en zona gris diferenciada | Botones inline sin separación visual |

Se eliminan: columna "Invitado" (fecha), columna "Perfil" standalone.

---

### 7. Sección "Agregar participante" colapsable

```tsx
<details open={participantes.length === 0} className="card p-0 overflow-hidden">
  <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
    ＋ Agregar participante
  </summary>
  <div className="border-t border-[var(--border-soft)] p-6 grid gap-4">
    {/* SearchForm → FoundUserCard / CreateAndInviteForm */}
    {/* addReferenceSlotAction si no hay referencia */}
  </div>
</details>
```

---

### 8. Simplificar vista global en `dashboard/page.tsx`

**Cambio**: `ParticipantesGlobalView` elimina el `RondaParticipantesSelector` con tabla de cupos.  
**Reemplaza por**: tabla de laboratorios.

| Columna nueva | Fuente |
|---|---|
| Email | `ParticipanteGlobal.email` |
| Rondas activas | filtrar `rondas` por `estado === 'activa'` |
| Fichas enviadas | _(requiere dato nuevo o es suficiente con count de rondas)_ |
| Envíos PT totales | `ParticipanteGlobal.total_envios` |
| Acción | Link `Abrir ronda →` para la ronda más reciente activa |

> [!NOTE]
> Si no hay dato de fichas enviadas en `ParticipanteGlobal`, la columna puede omitirse en la primera iteración. Este tipo solo tiene `total_envios` y `rondas[]` con `envios_count`.

---

## Archivos afectados

### Modificar

#### [MODIFY] [participantes/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/[id]/participantes/page.tsx)
- Cambiar fuente de datos a `listParticipantesRondaResumen`
- Agregar lectura de `searchParam` `filtro`
- Integrar `FiltroBar` y métricas de resumen
- Refactorizar `ParticipanteRow` (5 columnas + `CopyInvitationLinkButton`)
- Mover sección agregar a `<details>` colapsable

#### [MODIFY] [lib/rondas.ts](file:///home/w182/w421/calaire-app/lib/rondas.ts)
- Agregar `tiene_envio_final` a `ParticipanteRondaResumen`
- Agregar tipo `FiltroParticipante`
- Agregar función `filtrarParticipantes()`

#### [MODIFY] [dashboard/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/page.tsx)
- Simplificar `ParticipantesGlobalView`: eliminar tabla de cupos, reemplazar por índice de laboratorios

### Crear

#### [NEW] CopyInvitationLinkButton.tsx
Ruta: `app/(protected)/dashboard/components/CopyInvitationLinkButton.tsx`

---

## Dependencias entre fases

| Dependencia | Tipo | Notas |
|---|---|---|
| Fase 1 (navegación) | Preferible antes | Si la Fase 1 no se completó, esta fase funciona igual; la `FiltroBar` no depende de la navegación global. |
| Fase 2 (resumen de ronda) | Independiente | Puede implementarse antes o después. |
| Convex `listParticipantesRondaResumen` | Existente | Ya existe; solo validar que retorna `envios_pt_count`. |

---

## Preguntas abiertas

> [!IMPORTANT]
> **¿Qué significa "envío final" en el contexto de seguimiento de participantes?**
>
> El campo `final_submitted_at` en `EnvioPT` indica que se confirmó una celda. ¿El coordinador necesita saber si *todas* las celdas tienen envío final, o basta con `envios_pt_count > 0`? Esto determina si se agrega `tiene_envio_final` al tipo o si el filtro `con_envios` es suficiente para fase 3.

> [!IMPORTANT]
> **¿Se elimina completamente la URL cruda de la columna Enlace?**
>
> La propuesta la oculta detrás de `Copiar enlace`. Si el coordinador necesita ver y verificar el enlace antes de compartirlo, se puede agregar un botón secundario `Ver URL` que lo expanda.

> [!NOTE]
> **`RondaParticipantesSelector` en dashboard global**
>
> Este componente navega a `?tab=participantes&ronda_id=X`. Si la Fase 1 elimina los tabs del dashboard global, el selector queda obsoleto. Confirmar antes de simplificar la vista global.

---

## Plan de ejecución

```
[x] 1. Leer convex/_generated/ai/guidelines.md
[x] 2. Agregar FiltroParticipante + filtrarParticipantes a lib/rondas.ts
[x] 3. Verificar si tiene_envio_final requiere cambio Convex o es derivable en mapper
[x] 4. Agregar tiene_envio_final a ParticipanteRondaResumen (tipo + mapper)
[x] 5. Crear CopyInvitationLinkButton.tsx
[x] 6. Refactorizar ParticipantesPage:
[x] 6a. Cambiar fuente a listParticipantesRondaResumen
[x] 6b. Leer searchParam 'filtro'
[x] 6c. Integrar FiltroBar (Server Component con links puros)
[x] 6d. Calcular métricas de resumen
[x] 6e. Refactorizar ParticipanteRow (5 columnas + CopyInvitationLinkButton)
[x] 6f. Mover sección agregar a <details> colapsable
[x] 7. Aplicar terminología unificada (microcopy)
[x] 8. Simplificar ParticipantesGlobalView en dashboard/page.tsx
[x] 9. Verificar que actions.ts sigue funcionando (no cambia su interface)
[ ] 10. Test manual: filtros, copiar enlace, agregar, eliminar
```

---

## Criterios de aceptación

- [ ] Filtro "Enlace pendiente" muestra solo cupos sin reclamar.
- [ ] Filtro "Ficha pendiente" muestra solo reclamados sin ficha enviada.
- [ ] La URL refleja el filtro activo (recargable y compartible).
- [ ] La columna de enlace no muestra URLs crudas; el enlace se copia con un clic.
- [ ] "Cupo", "Ficha" y "Envíos PT" son columnas o etiquetas claramente distintas.
- [ ] La sección "Agregar participante" está colapsada si ya hay participantes.
- [ ] Las acciones destructivas (Eliminar) están visualmente separadas de "Copiar enlace".
- [ ] La página funciona sin `searchParam` de filtro (muestra "Todos" por defecto).
- [ ] El tipo `RondaParticipante` antiguo coexiste sin romper otras páginas.
