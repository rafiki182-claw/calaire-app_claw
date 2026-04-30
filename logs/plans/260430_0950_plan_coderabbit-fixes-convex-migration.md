# Plan: CodeRabbit Fixes Convex Migration

**Created**: 2026-04-30 09:50 -05
**Updated**: 2026-04-30 09:50 -05
**Status**: completed
**Slug**: coderabbit-fixes-convex-migration

## Objetivo

Implementar los findings de CodeRabbit en la rama `feat/convex-migration` en un orden que reduzca riesgo: primero invariantes de datos y transacciones, luego semantica de valores Convex, despues formularios/acciones PT, rendimiento, y al final ajustes UI/accesibilidad.

## Fases

### Bloque 1: Invariantes Criticas Convex

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 1.1 | `convex/rondas.ts` | Validar transiciones de estado | `updateRondaEstado` debe respetar la maquina de estados de `transitionRondaEstado`. |
| 1.2 | `convex/rondas.ts` | Evitar duplicados de participantes | `addParticipante` debe revisar `by_ronda_user` antes de insertar. |
| 1.3 | `convex/rondas.ts` | Preservar `invitadoAt` | Reclamar un slot no debe pisar la fecha original de invitacion. |
| 1.4 | `convex/rondas.ts` | Proteger configuracion con envios existentes | No borrar/reinsertar contaminantes si ya hay `envios`. |

### Bloque 2: Semantica Convex y Wrappers

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 2.1 | `convex/fichas.ts` | Robustecer `getOrCreateFicha` | Reconsultar despues de insertar para reducir riesgo de carreras. |
| 2.2 | `convex/fichas.ts` | Preservar `null` en patch | No convertir clears explicitos a `undefined`. |
| 2.3 | `convex/pt.ts` | Preservar `null` en `updateParticipantePT` | Construir patch solo con argumentos provistos. |
| 2.4 | `convex/schema.ts` | Permitir campos clearables con `null` | Alinear schema con los clears que se envian desde mutations. |
| 2.5 | `lib/fichas.ts` | Defaults booleanos explicitos | Evitar `undefined` en `FichaRegistro`. |
| 2.6 | `lib/rondas.ts` | Usar timestamps del servidor | `createPTItem`/`createPTSampleGroup` deben mapear `createdAt` devuelto por Convex. |

### Bloque 3: Configuracion PT Bulk

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 3.1 | `PTLevelsBulkForm.tsx` | Reemplazar `nextId` state por ref | Evitar ids duplicados por closures stale. |
| 3.2 | `configuracion-pt/page.tsx` | Fallback para contaminantes nulos | Pasar siempre array a `PTLevelsBulkForm`. |
| 3.3 | `configuracion-pt/actions.ts` | Validar duplicados por contaminante | Detectar `runCode` y `levelLabel` repetidos dentro del batch. |
| 3.4 | `convex/pt.ts` y `lib/rondas.ts` | Crear items PT en bulk | Evitar creacion parcial por loops de mutations separadas. |

### Bloque 4: Wrappers, Exportacion y Rendimiento

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 4.1 | `convex/pt.ts` | Agregar query `listAllEnviosPT` | Leer envios, items, grupos y participantes en una sola query por ronda. |
| 4.2 | `lib/rondas.ts` | Eliminar N+1 en `listAllEnviosPT` | Usar la query nueva y mapear relaciones en memoria. |
| 4.3 | `export-pt.csv/route.ts` | Filtros null-safe | Validar `participant_id` y `replicate` sin asumir strings/numeros presentes. |

### Bloque 5: UI, Accesibilidad y Keys Estables

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 5.1 | `Alert.tsx` | Agregar roles ARIA | `alert` para error, `status` para success. |
| 5.2 | `dashboard/layout.tsx` | Quitar import no usado | Remover `MobileNav` si no se renderiza. |
| 5.3 | `rondas/[id]/page.tsx` | Aplicar variantes de `MetricaCard` | Usar clases por `default/success/warning/danger`. |
| 5.4 | `RondaContextNav.tsx` | Semantica consistente del tab | Mantener link navegable hacia configuracion PT cuando esta deshabilitado funcionalmente. |
| 5.5 | `lib/operativo.ts` y `dashboard/page.tsx` | Keys estables | Agregar `id` a `AttentionItem` y usarlo como React key. |

## Log de Ejecucion

- [x] Bloque 1 implementado y verificado.
- [x] Bloque 2 implementado y verificado.
- [x] Bloque 3 implementado y verificado.
- [x] Bloque 4 implementado y verificado.
- [x] Bloque 5 implementado y verificado.
- [x] Verificacion final: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.

## Resultado

Los bloques 1 a 5 quedaron implementados. `pnpm lint` conserva warnings preexistentes/no bloqueantes, pero no errores. `pnpm build` pasa.
