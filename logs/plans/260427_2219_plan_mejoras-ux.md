# Plan: Mejoras UX — Flujo participante y dashboard coordinador

**Created**: 2026-04-27 22:19
**Updated**: 2026-04-27 23:30
**Status**: approved — Fase 2 reescrita (rediseño completo), Fase 4 absorbida en Fase 2
**Slug**: mejoras-ux

## Objetivo

Corregir el flujo de onboarding del participante (orden ficha → datos) y rediseñar la navegación del dashboard del coordinador para acceder a rondas, participantes y configuración PT con menos fricción, manteniendo las acciones destructivas fuera del camino principal.

---

## Evaluación y ajustes de alcance

- **Prioridad crítica:** Fase 1. ✅ Completada.
- **Fase 2 (reescrita):** El plan original de Fase 2 era insuficiente — mover botones al `<summary>` de un acordeón no es un dashboard de control. Se reescribe como rediseño completo: tabla plana de rondas con acciones siempre visibles, barra de KPIs, y se absorbe Fase 4 (filtro participantes) dentro del mismo bloque.
- **Fase 3 completada:** El contrato de datos (`ParticipanteRondaResumen`, `ficha_estado`, `envios_pt_count`) ya existe en Convex y `lib/rondas.ts`. Fase 2 nueva puede consumirlo directamente.
- **Fase 4 absorbida:** La funcionalidad de filtro por ronda en el tab Participantes es parte estructural del nuevo dashboard coordinador. No tiene sentido implementarla por separado.
- **Paralelización:** solo queda Fase 2. No hay dependencias externas pendientes.

---

## Estrategia de ejecución paralela

| Carril | Fases | Estado | Dependencias |
|--------|-------|--------|--------------|
| A — Flujo participante | Fase 1 | ✅ Completa | — |
| B — Datos backend | Fase 3 | ✅ Completa | — |
| C — Dashboard coordinador completo | Fase 2 (nueva) | ⏳ Pendiente | Ninguna — Fase 3 ya entregó los datos |

**Único archivo afectado en Fase 2:** `app/(protected)/dashboard/page.tsx` (reescritura de la sección admin completa).

---

## Propuesta de dashboard resultante

### Vista coordinador — layout final

```
┌─ Header ──────────────────────────────────────────────────────┐
│  Logo UNAL · CALAIRE-EA · [Cerrar sesión]                     │
└───────────────────────────────────────────────────────────────┘

┌─ KPIs (4 cards con borde izquierdo dorado) ───────────────────┐
│  Rondas activas · En borrador · Participantes totales          │
│  Fichas pendientes (total sin enviar en rondas activas)        │
└───────────────────────────────────────────────────────────────┘

┌─ Enlace PT App ────────────────────────────────────────────────┐
│  Card de acceso rápido a la herramienta R/Shiny                │
└───────────────────────────────────────────────────────────────┘

┌─ Tab: Rondas ─────────────────── [+ Nueva ronda ▼] ───────────┐
│  Tabla plana (una fila por ronda):                             │
│                                                                │
│  Estado · Código · Nombre · Contaminantes · X/Y partic.        │
│  Creada · [Participantes] [PT] [Resultados]                    │
│           [Publicar / Cerrar / Reabrir] [Editar] [🗑]          │
│                                                                │
│  [Editar] abre formulario inline en la fila (solo borradores)  │
│  [🗑] ícono papelera en rojo, separado del resto               │
│  [+ Nueva ronda] expande formulario inline bajo el header      │
└───────────────────────────────────────────────────────────────┘

┌─ Tab: Participantes ──────────────────────────────────────────┐
│  Sin filtro de ronda:                                          │
│    Email · Rondas (badges de estado) · Total envíos            │
│    [Gestionar →] por participante                              │
│                                                                │
│  Con filtro (select de rondas → actualiza URL):                │
│    Perfil · Estado cupo · Ficha · Envíos PT · Enlace formal    │
│    [Gestionar →] → /dashboard/rondas/[id]/participantes        │
└───────────────────────────────────────────────────────────────┘
```

La gestión completa (invitar, eliminar, regenerar enlaces) sigue en `/dashboard/rondas/[id]/participantes`. El dashboard es operativo e informativo; no reemplaza las subpáginas.

### Vista participante (sin cambios estructurales — Fase 1 completada)

- Rondas asignadas en cards individuales.
- CTA condicional según `ficha_estado`: "Iniciar/Continuar ficha →" si no enviada, "Ingresar datos →" si enviada.
- No puede acceder a `/ronda/[codigo]` sin ficha enviada.

---

## Fases

### Fase 1: Flujo participante — bloqueo ficha antes de datos

**Carril:** A — puede ejecutarse en paralelo con Fase 2 y Fase 3.

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 1.1 | `app/(protected)/ronda/[codigo]/page.tsx` | Modificar | Tras `claimParticipanteToken()`, redirigir a `/dashboard?success=Invitación aceptada. Complete la ficha antes de ingresar datos.` en vez de `/ronda/${codigo}` (líneas 45-47) |
| 1.2 | `app/(protected)/ronda/[codigo]/page.tsx` | Modificar | Agregar guardia: para participantes no admin, cargar `getRondaParticipantePT(ronda.id, auth.user.id)` y, si no existe, redirigir/mostrar "Sin asignación"; si existe pero la ficha NO está en estado `enviado`, redirigir a `/ronda/${codigo}/registro` antes de cargar formularios PT. Importar `getFichaByRondaParticipante` |
| 1.3 | `app/(protected)/dashboard/page.tsx` | Modificar | En `RondaParticipanteCard`: si `ficha_estado !== 'enviado'`, ocultar "Ingresar datos →" y mostrar solo "Iniciar / Continuar ficha →" como CTA primario. Si `ficha_estado === 'enviado'`, mostrar "Ingresar datos →" como primario |
| 1.4 | `app/(protected)/dashboard/page.tsx` | Modificar | Ajustar microcopy del participante: cuando la ficha esté pendiente, mostrar una nota breve "Complete la ficha para habilitar el ingreso de resultados" |

**Criterio de éxito Fase 1:**
- El participante que llega por primera vez (link de invitación) aterriza en `/dashboard`, ve su ronda asignada y el botón "Iniciar ficha →".
- No puede llegar a `/ronda/[codigo]` sin ficha enviada (la ruta lo redirige a `/registro`).
- El CTA "Ingresar datos →" solo aparece con `ficha_estado === 'enviado'`.

---

### Fase 2 (reescrita): Rediseño completo del dashboard coordinador

**Absorbe Fase 4.** Los datos de Fase 3 ya están disponibles — no hay dependencias pendientes.

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 2.1 | `app/(protected)/dashboard/page.tsx` | Reemplazar | Eliminar `RoundCard` con `<details>/<summary>`. Crear `RondasTable` — tabla plana con una fila por ronda. Eliminar también `RondasView` viejo y `SummaryActions` (ya inútil) |
| 2.2 | `app/(protected)/dashboard/page.tsx` | Agregar | `KpiBar` — 4 stats cards con `.card-accent`: rondas activas, en borrador, participantes totales, fichas pendientes. Calcular desde `listRondas()` + `listAllParticipantes()` ya cargados |
| 2.3 | `app/(protected)/dashboard/page.tsx` | Reemplazar | Sección Rondas: `KpiBar` + `RondasTable` + formulario "Nueva ronda" colapsable al inicio de la sección (reemplaza el `<details>` global) |
| 2.4 | `app/(protected)/dashboard/page.tsx` | Implementar | Acciones por fila en `RondasTable`: `[Participantes]` `[PT]` `[Resultados]` siempre visibles; `[Publicar / Cerrar / Reabrir]` según estado; `[Editar]` solo en borradores (inline o URL); `[🗑]` separado al final en rojo |
| 2.5 | `app/(protected)/dashboard/page.tsx` | Reemplazar | `ParticipantesGlobalView` — modo sin filtro: tabla email + rondas (badges) + total envíos + Gestionar →. Modo con filtro (`?ronda_id=...` vía select): tabla por cupo con perfil, estado, ficha, envíos PT, enlace formal, Gestionar → |
| 2.6 | `app/(protected)/dashboard/page.tsx` | Modificar | Cargar `listAllParticipantes()` siempre (no condicionado al tab activo) para alimentar KPIs. Si el costo es alto, considerar query liviana de conteo en Convex |
| 2.7 | `app/(protected)/dashboard/SummaryActions.tsx` | Eliminar | Componente obsoleto — las acciones van directas en cada fila de `RondasTable` |

**Criterio de éxito Fase 2:**
- El coordinador llega y ve de inmediato: cuántas rondas hay, en qué estado, y cuántas fichas están pendientes en el programa.
- Todas las rondas son visibles sin expandir nada. Participantes, PT y Resultados de cada ronda están en su fila, con un clic.
- Desde el tab Participantes puede elegir una ronda y ver el estado de cada cupo (ficha, envíos) sin salir del dashboard.
- Borrar ronda no está en la misma línea visual que las acciones de navegación.
- El formulario "Nueva ronda" abre inline sin colapsar todo el layout.

---

### Fase 3: Datos para tab "Participantes" — ✅ COMPLETADA

`ParticipanteRondaResumen` con `ficha_estado`, `envios_pt_count`, `participant_profile`, `slot_token`, `estado` ya existe en `convex/rondas.ts` y `lib/rondas.ts`. Fase 2 lo consume directamente.

---

### Fase 4: Filtro por ronda en tab Participantes — ✅ ABSORBIDA EN FASE 2

Ver tarea 2.5.

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `app/(protected)/ronda/[codigo]/page.tsx` | Entry point participante — guardia ficha + redirect post-claim |
| `app/(protected)/dashboard/page.tsx` | Dashboard unificado — toda la UI del coordinador y del participante |
| `lib/fichas.ts` | `getFichaByRondaParticipante` — ya importado en registro/page.tsx, agregar import en ronda/page.tsx |
| `lib/rondas.ts` | `listRondasParticipante`, `listRondas`, `listAllParticipantes` — existentes; agregar/ajustar tipos para resumen por ronda |
| `convex/rondas.ts` | Queries de rondas/participantes — ampliar contrato para tab Participantes filtrado |

---

## Dependencias y restricciones

- Fase 2 solo toca `app/(protected)/dashboard/page.tsx` y elimina `SummaryActions.tsx`. No requiere cambios en Convex ni en `lib/rondas.ts`.
- Los tokens CSS (`.card`, `.card-accent`, `.btn-primary`, `.btn-outline`, `.numeric`) del sistema de diseño se mantienen — no romper.
- `listAllParticipantes()` y `listRondas()` ya existen y devuelven los datos necesarios para KPIs y ambas vistas de Participantes.
- Si cargar `listAllParticipantes()` incondicionalmente genera latencia notable, fallback: query liviana de conteo en Convex (leer `convex/_generated/ai/guidelines.md` antes de agregar queries).
- Este proyecto usa Next.js 16.2.4 — antes de introducir APIs no verificadas, revisar `node_modules/next/dist/docs/`.

---

## Log de Ejecución

- [x] Fase 1.1 — Redirect post-claim a `/dashboard`
- [x] Fase 1.2 — Guardia ficha en `/ronda/[codigo]/page.tsx`
- [x] Fase 1.3 — CTA condicional en `RondaParticipanteCard`
- [x] Fase 1.4 — Microcopy de ficha pendiente en dashboard participante
- [x] Fase 3 — Contrato de datos `ParticipanteRondaResumen` en Convex y lib
- [ ] Fase 2.1 — Tabla plana `RondasTable`, eliminar `RoundCard` / `SummaryActions`
- [x] Fase 2.2 — `KpiBar` con 4 métricas del programa
- [ ] Fase 2.3 — Sección Rondas: verificar orden visual en navegador
- [x] Fase 2.4 — Acciones por fila en `RondasTable`
- [x] Fase 2.5 — `ParticipantesGlobalView` con filtro por ronda (absorbe Fase 4)
- [x] Fase 2.6 — Carga de `listAllParticipantes()` para KPIs
- [ ] Fase 2.7 — Eliminar `SummaryActions.tsx`
