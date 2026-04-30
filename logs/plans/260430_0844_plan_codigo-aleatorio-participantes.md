# Plan: Codigo aleatorio automatico por participante

**Created**: 2026-04-30 08:44 -05
**Updated**: 2026-04-30 09:17 -05
**Status**: in_progress
**Slug**: codigo-aleatorio-participantes

## Objetivo

Eliminar la configuracion manual obligatoria del codigo de participante. Cada cupo de una ronda debe recibir automaticamente un codigo aleatorio corto, estable y unico dentro de la ronda, incluyendo el cupo de referencia (`member_special`). Ese codigo debe quedar disponible como referencia operativa y como `participant_id` en exportaciones PT.

## Decision de contrato

- Campo destino existente: `rondaParticipantes.participantCode`.
- Longitud inicial: 6 caracteres.
- Formato: alfanumerico, mayusculas, sin caracteres ambiguos.
- Alfabeto propuesto: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Unicidad: no repetir `participantCode` dentro de una misma ronda.
- Estabilidad: reclamar un enlace o regenerarlo no debe cambiar el codigo.
- Alcance: aplica a participantes regulares y a la referencia.
- Edicion manual: conservar solo como respaldo administrativo, no como paso normal de configuracion.

## Fases

### Fase 0: Contrato funcional

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 0.1 | `logs/plans/260430_0844_plan_codigo-aleatorio-participantes.md` | Crear | Registrar formato, reglas de unicidad y estabilidad. |

### Fase 1: Generador y unicidad

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 1.1 | `convex/rondas.ts` | Modificar | Crear helper para generar codigo aleatorio de 6 caracteres. |
| 1.2 | `convex/rondas.ts` | Modificar | Crear helper para generar codigo unico por `rondaId`, consultando participantes existentes. |
| 1.3 | `convex/rondas.ts` | Modificar | Limitar reintentos y fallar con error claro si no se puede obtener codigo unico. |

**Dependencia**: ninguna, despues de aprobar contrato.

### Fase 2: Integracion en creacion de cupos

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 2.1 | `convex/rondas.ts` | Modificar | En `assignParticipante`, asignar `participantCode` automaticamente. |
| 2.2 | `convex/rondas.ts` | Modificar | En `addReferenceSlot`, asignar `participantCode` automaticamente a la referencia. |
| 2.3 | `convex/rondas.ts` | Revisar/Modificar | En `createConfiguredRonda`, generar codigos si crea cupos iniciales. |
| 2.4 | `lib/rondas.ts` | Revisar | Confirmar que los mapeos exponen `participant_code` sin cambios adicionales. |

**Dependencia**: Fase 1.

### Fase 3: Preservacion del codigo

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 3.1 | `convex/rondas.ts` | Revisar | Confirmar que `claimParticipanteToken` no cambia `participantCode`. |
| 3.2 | `convex/rondas.ts` | Revisar | Confirmar que `regenerateParticipanteSlot` conserva `participantCode`. |
| 3.3 | Tests o verificacion manual | Agregar/Revisar | Cubrir estabilidad del codigo al reclamar o regenerar enlace. |

**Dependencia**: Fase 2.
**Paralelizable con**: Fases 4, 5 y 6.

### Fase 4: UI y visibilidad

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 4.1 | `app/(protected)/dashboard/rondas/[id]/participantes/page.tsx` | Revisar/Modificar | La tabla ya muestra `participant_code`; ajustar etiqueta si hace falta para que sea claro como "Codigo". |
| 4.2 | `app/(protected)/dashboard/rondas/[id]/participantes/page.tsx` | Verificar | La referencia tambien debe mostrar codigo. |
| 4.3 | `app/(protected)/dashboard/rondas/[id]/configuracion-pt/page.tsx` | Revisar | Mantener edicion manual solo como respaldo, no como requisito operativo. |

**Dependencia**: Fase 2.
**Paralelizable con**: Fases 3, 5 y 6.

### Fase 5: Backfill de datos existentes

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 5.1 | `convex/migrations.ts` o nueva mutacion/script | Crear/Modificar | Recorrer participantes sin `participantCode`, agrupados por ronda. |
| 5.2 | `convex/migrations.ts` o nueva mutacion/script | Crear/Modificar | Generar codigo unico por ronda, incluyendo referencias. |
| 5.3 | `convex/migrations.ts` o nueva mutacion/script | Crear/Modificar | No tocar codigos existentes. |

**Dependencia**: Fase 1.
**Paralelizable con**: Fases 3, 4 y 6 despues de Fase 2 si se desea validar todo junto.

### Fase 6: Exportacion y referencia PT

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 6.1 | `lib/rondas.ts` | Revisar | Confirmar que `buildPTCsv` usa el identificador analitico esperado. |
| 6.2 | `convex/pt.ts` | Revisar/Modificar | Confirmar que las consultas PT entregan `participantCode` como `participant_id`. |
| 6.3 | `app/(protected)/dashboard/rondas/[id]/resultados/export-pt.csv/route.ts` | Revisar/Modificar | Si falta codigo, fallar con error claro antes de exportar datos incompletos. |

**Dependencia**: Fase 2.
**Paralelizable con**: Fases 3, 4 y 5.

### Fase 7: Pruebas finales

| # | Archivo | Accion | Notas |
|---|---------|--------|-------|
| 7.1 | Flujo manual admin | Probar | Crear participante regular nuevo y verificar codigo visible. |
| 7.2 | Flujo manual admin | Probar | Crear referencia y verificar codigo visible. |
| 7.3 | Flujo participante | Probar | Reclamar enlace y verificar que el codigo no cambia. |
| 7.4 | Flujo admin | Probar | Regenerar enlace y verificar que el codigo no cambia. |
| 7.5 | Exportacion PT | Probar | Exportar CSV y verificar `participant_id`. |
| 7.6 | Backfill | Probar | Ejecutar sobre datos con y sin codigos existentes; verificar no duplicados por ronda. |

**Dependencia**: Fases 3, 4, 5 y 6.

## Trabajo paralelizable

No paralelizar antes de cerrar Fase 1, porque las demas tareas dependen del contrato de generacion y unicidad.

Despues de Fase 2 pueden avanzar en paralelo:

- Fase 3: preservacion del codigo.
- Fase 4: UI y visibilidad.
- Fase 5: backfill de datos existentes.
- Fase 6: exportacion y referencia PT.

Fase 7 debe quedar al final como validacion integrada.

## Criterios de aceptacion

- Todo participante nuevo recibe un codigo de 6 caracteres.
- La referencia recibe codigo automatico.
- No hay codigos repetidos dentro de una ronda.
- Reclamar enlace no cambia el codigo.
- Regenerar enlace no cambia el codigo.
- La tabla de participantes muestra el codigo.
- El CSV PT usa el codigo automatico como `participant_id`.
- Los participantes existentes quedan migrados sin sobrescribir codigos ya definidos.

## Log de Ejecucion

- [x] Fase 0 definida como plan.
- [x] Fase 1 iniciada.
- [x] Fase 1 completada.
- [x] Fase 2 iniciada.
- [x] Fase 2 completada.
- [x] Fase 3 completada.
- [x] Fase 4 completada.
- [x] Fase 5 completada.
- [x] Fase 6 completada.
- [ ] Fase 7 completada.

## Notas de Fase 2

- `assignParticipante` ahora genera `participantCode` con `generateUniqueParticipantCode` antes de insertar el cupo.
- `addReferenceSlot` ahora genera `participantCode` automatico para la referencia (`member_special`).
- `createConfiguredRonda` ahora asigna `participantCode` a cada slot inicial; los inserts de participantes se hacen secuencialmente para que la verificacion de unicidad vea los codigos ya creados dentro de la misma ronda.
- `lib/rondas.ts` ya expone `participant_code` en `mapParticipanteRondaResumenDoc` y `mapParticipantePTDoc`; no requirio cambios para Fase 2.
- `pnpm lint` paso sin errores; quedan warnings no relacionados ya conocidos.

## Notas de Fase 3

- `claimParticipanteToken` conserva `participantCode`: el patch solo cambia `workosUserId`, `email`, `invitadoAt` y `claimedAt`.
- `regenerateParticipanteSlot` conserva `participantCode`: el patch solo cambia enlace/email/estado de reclamo y fecha de invitacion.
- Se dejaron comentarios breves en ambos patches para evitar regresiones accidentales.
- Verificacion ejecutada: `pnpm lint` paso sin errores; persisten 7 warnings no relacionados.

## Notas de Fase 4

- `app/(protected)/dashboard/rondas/[id]/participantes/page.tsx` ahora muestra el `participant_code` con etiqueta explicita `Codigo`, junto al badge de perfil; esto aplica tambien a la referencia (`member_special`).
- `app/(protected)/dashboard/rondas/[id]/configuracion-pt/page.tsx` aclara que el `participant_id` se genera automaticamente y que la edicion del codigo queda como respaldo administrativo.
- El formulario PT separa visualmente los campos `Codigo` y `Replica`, manteniendo la edicion manual disponible para administradores.
- Verificacion ejecutada: `pnpm lint` paso sin errores; persisten 7 warnings no relacionados.

## Notas de Fase 5

- `convex/migrations.ts` ahora expone `backfillParticipantCodes`.
- La mutacion recorre `rondaParticipantes`, agrupa por `rondaId`, detecta participantes sin `participantCode` y planea codigos unicos por ronda con el mismo alfabeto y longitud de la generacion normal.
- `dryRun` es `true` por defecto; con `dryRun: false` parchea solo participantes sin codigo.
- No sobrescribe codigos existentes.
- Si detecta codigos duplicados ya existentes dentro de una ronda, devuelve `ok: false` y no escribe cambios.
- Verificacion ejecutada: `pnpm lint` paso sin errores; persisten 7 warnings no relacionados.

## Notas de Fase 6

- `lib/rondas.ts` ya construye el CSV PT con columna `participant_id` desde `EnvioPTConMetadatos.participant_id`.
- `convex/pt.ts` ya mapea `rondaParticipantes.participantCode` a `participant_id`; ahora no descarta silenciosamente envios finalizados con `participant_id` faltante.
- `app/(protected)/dashboard/rondas/[id]/resultados/export-pt.csv/route.ts` bloquea la exportacion con `409 pt_export_incomplete` si algun envio finalizado no tiene `participant_id` o replica valida.
- Verificacion ejecutada: `pnpm lint` paso sin errores; persisten 7 warnings no relacionados.
