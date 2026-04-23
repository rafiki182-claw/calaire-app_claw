# Fase 0 PT: contrato tecnico y modelo base

Fecha: 2026-04-21
Estado: cerrado

## Objetivo

Cerrar las decisiones de diseno que desbloquean la implementacion del modelo PT en `calaire-app`, tomando como contrato externo el CSV `summary_n13.csv`.

## Contrato objetivo

Columnas obligatorias de salida:

| Columna | Semantica cerrada |
|---|---|
| `pollutant` | Contaminante exportado en minusculas (`co`, `so2`, `o3`, `no`, `no2`). |
| `run` | Codigo textual de corrida definido por administracion para un contaminante dentro de una ronda. |
| `level` | Etiqueta textual del nivel PT asociada a una corrida. No se modela como entero. |
| `participant_id` | Codigo analitico estable por participante dentro de la ronda. Nunca debe derivarse de `workos_user_id`. |
| `replicate` | Codigo entero estable por participante dentro de la ronda. No representa el numero de valores capturados en pantalla. |
| `sample_group` | Grupo de muestra textual definido por administracion y reutilizado en todas las corridas de la ronda. |
| `mean_value` | Resultado numerico principal reportado por el participante para una combinacion PT completa. |
| `sd_value` | Incertidumbre o dispersion reportada por el participante para la misma combinacion PT. En la primera implementacion se reutiliza el valor de incertidumbre de la app. |

## Unidad minima de captura

La unidad minima de captura y persistencia queda definida como:

`participante + contaminante + run + level + sample_group`

Consecuencias:

- El modelo actual por `contaminante + nivel` deja de ser suficiente.
- La columna `replicate` del CSV sale del participante, no del formulario.
- La completitud de una ronda PT se calcula sobre todas las combinaciones configuradas de esa unidad minima.

## Decision sobre identidades

Se separan tres conceptos que hoy estan mezclados:

| Concepto | Fuente | Uso |
|---|---|---|
| `workos_user_id` | WorkOS | Autenticacion y autorizacion. |
| `participant_code` | Admin por ronda | Exportacion en `participant_id`. |
| `replicate_code` | Admin por ronda | Exportacion en `replicate`. |

Reglas cerradas:

- `participant_code` debe ser unico por ronda.
- `replicate_code` debe ser unico por ronda.
- Reclamar un cupo no cambia `participant_code` ni `replicate_code`; solo enlaza el cupo con el `workos_user_id` real.

## Modelo relacional propuesto

### 1. `ronda_participantes`

Se conserva como tabla de asignacion por ronda, pero se amplia con metadatos PT:

- `participant_code text`
- `replicate_code integer`
- `claimed_at timestamptz`

Rol de cada campo:

- `participant_code`: codigo exportable.
- `replicate_code`: entero exportable en la columna `replicate`.
- `claimed_at`: trazabilidad de cuando un enlace pendiente fue reclamado.

### 2. `ronda_pt_items`

Nueva tabla de configuracion PT. Representa una corrida concreta de un contaminante.

Campos base:

- `id`
- `ronda_id`
- `contaminante`
- `run_code`
- `level_label`
- `sort_order`
- `created_at`

Semantica:

- Cada fila define una pareja `run + level` para un contaminante dentro de una ronda.
- El orden visual y de exportacion sale de `sort_order` y luego de `sample_group`.

### 3. `ronda_pt_sample_groups`

Nueva tabla para los grupos de muestra configurables por ronda.

Campos base:

- `id`
- `ronda_id`
- `sample_group`
- `sort_order`
- `created_at`

Semantica:

- Los grupos de muestra son reutilizables por todas las corridas PT de la ronda.
- El contrato de salida se construye cruzando `ronda_pt_items` x `ronda_pt_sample_groups` por participante.

### 4. `envios_pt`

Nueva tabla transaccional. Reemplaza `envios` para el flujo PT.

Campos base:

- `id`
- `ronda_id`
- `ronda_participante_id`
- `pt_item_id`
- `sample_group_id`
- `mean_value`
- `sd_value`
- `draft_saved_at`
- `final_submitted_at`
- `updated_at`

Semantica:

- Una fila representa exactamente una combinacion PT capturada por un participante.
- `draft_saved_at` registra el guardado incremental.
- `final_submitted_at` registra el envio oficial y debe quedar alineado en todas las filas del participante cuando el informe final se confirma.

## Constraints y reglas de integridad

### `ronda_participantes`

- `unique (ronda_id, workos_user_id)` se mantiene.
- `unique (ronda_id, participant_code)` para codigos no nulos.
- `unique (ronda_id, replicate_code)` para codigos no nulos.
- `replicate_code >= 1`.
- Si un participante esta operativo para PT, `participant_code` y `replicate_code` deben existir antes de activar la ronda.

### `ronda_pt_items`

- `unique (ronda_id, contaminante, run_code)`.
- `unique (ronda_id, contaminante, level_label)`.
- `unique (ronda_id, contaminante, sort_order)`.
- `run_code` y `level_label` no pueden ser vacios.

Nota:

La unicidad separada de `run_code` y `level_label` refleja el patron observado en `summary_n13.csv`, donde cada corrida corresponde a un unico nivel por contaminante.

### `ronda_pt_sample_groups`

- `unique (ronda_id, sample_group)`.
- `unique (ronda_id, sort_order)`.
- `sample_group` no puede ser vacio.

### `envios_pt`

- `unique (ronda_participante_id, pt_item_id, sample_group_id)`.
- `mean_value` obligatorio y numerico finito.
- `sd_value` obligatorio y numerico finito mayor o igual a cero.
- `ronda_id` debe coincidir logicamente con la ronda del participante, del item PT y del grupo de muestra.

Regla operativa recomendada:

- Validar consistencia de `ronda_id` en la capa de aplicacion y reforzarla con un trigger SQL si la complejidad operativa lo justifica en Fase 1.

## Reglas operativas cerradas

### Completitud

Para un participante:

`total_esperado = cantidad(ronda_pt_items) * cantidad(ronda_pt_sample_groups)`

La ronda PT esta completa para ese participante cuando existe un `envios_pt` por cada combinacion esperada.

### Guardado incremental

- Cada celda PT puede guardarse de forma independiente.
- Un guardado incremental solo afecta una fila de `envios_pt`.
- El formulario debe seguir mostrando el ultimo `updated_at` por celda.

### Envio final

- El envio final no crea filas nuevas; solo sella con la misma marca de tiempo todas las filas PT del participante.
- Si falta alguna combinacion PT, el envio final se rechaza.
- Si ya existe `final_submitted_at`, la ronda queda en solo lectura para ese participante.

### Exportacion

- El CSV PT sale exclusivamente desde `envios_pt` unido con `ronda_participantes`, `ronda_pt_items` y `ronda_pt_sample_groups`.
- `participant_id` sale de `participant_code`.
- `replicate` sale de `replicate_code`.
- El orden de exportacion debe ser:
  `pollutant`, `run`, `level`, `participant_id`, `replicate`, `sample_group`.

## Impacto directo en Fase 1

Esto desbloquea:

- migracion real de `db/schema.sql`
- tipos PT en `lib/rondas.ts`
- UI admin para codigos de participante, corridas, niveles y grupos
- exportador CSV compatible con `pt_app`

## Decisiones descartadas

- Reutilizar `envios` con columnas extra: descartado porque mantiene una granularidad equivocada.
- Usar `workos_user_id` como `participant_id`: descartado por mezclar identidad de autenticacion con identidad analitica.
- Mantener `level` como entero: descartado porque el contrato externo lo exige textual.
- Interpretar `replicate` como numero de replicas medidas: descartado porque el CSV real muestra un codigo estable por participante.
