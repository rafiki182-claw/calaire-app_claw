# Plan: Integración CALAIRE-EA -> CSV compatible con pt_app

**Created**: 2026-04-21 19:46
**Updated**: 2026-04-21 20:32
**Status**: approved
**Slug**: integracion-pt-app-csv

## Objetivo

Permitir que `calaire-app` genere un CSV compatible con `pt_app`, tomando como contrato de salida la estructura de `summary_n13.csv` y rediseñando el flujo de captura para producir datos con granularidad PT real.

## Contrato objetivo

Columnas obligatorias de salida:

- `pollutant`
- `run`
- `level`
- `participant_id`
- `replicate`
- `sample_group`
- `mean_value`
- `sd_value`

Decisiones ya cerradas:

- `mean_value` se calcula en la app.
- `sd_value` se usará como placeholder de incertidumbre.
- `level` será textual.
- `participant_id` será un codigo analitico estable por ronda.

## Dependencias globales

1. No paralelizar antes de cerrar esquema SQL y contrato.
2. No implementar exportacion final sin modelo PT persistente.
3. No redefinir la UI participante hasta fijar la unidad minima de captura.

## Fase 0: Diseño base (serie obligatoria)

### Objetivo

Cerrar el contrato tecnico que desbloquea todo lo demas.

| # | Area | Accion | Entregable |
|---|------|--------|------------|
| 0.1 | Contrato de datos | Congelar semantica de `run`, `level`, `participant_id`, `replicate`, `sample_group`, `mean_value`, `sd_value` | Diccionario de datos |
| 0.2 | Modelo relacional | Diseñar tablas PT nuevas y cambios a participantes | Esquema SQL propuesto |
| 0.3 | Reglas de integridad | Definir unicidad, nullability y validaciones | Constraints y reglas de negocio |
| 0.4 | Reglas operativas | Redefinir completitud y envio final sobre la nueva unidad de captura | Documento de reglas |

### Criterio de cierre

- Existe diseño SQL estable.
- Existe unidad minima de captura definida.
- No quedan decisiones abiertas que afecten la estructura de tablas.

## Fase 1: Base implementable (paralelo real)

Esta fase se puede ejecutar en paralelo solo despues de cerrar Fase 0.

### Carril A: Capa de datos

**Responsabilidad**: persistencia y lectura del nuevo modelo PT.

| # | Archivo / Area | Accion | Notas |
|---|----------------|--------|-------|
| A.1 | `db/schema.sql` | Modificar | Agregar tablas PT y campos faltantes en participantes |
| A.2 | `lib/rondas.ts` | Modificar | Agregar tipos PT y queries de lectura/escritura |
| A.3 | `lib/*` helpers | Modificar | Helpers para listar estructura PT y envios PT |

**Salida**:

- Modelo PT persistente
- Tipos TypeScript nuevos
- Funciones de acceso a datos para admin, participante y exportacion

### Carril B: Configuracion admin

**Responsabilidad**: dejar una ronda PT completamente parametrizada.

| # | Archivo / Area | Accion | Notas |
|---|----------------|--------|-------|
| B.1 | dashboard/admin | Modificar | UI para definir `participant_code` por ronda |
| B.2 | dashboard/admin | Modificar | UI para definir `run`, `level`, `replicate` |
| B.3 | dashboard/admin | Modificar | UI para definir `sample_group` |
| B.4 | server actions admin | Modificar | Guardado y validacion de configuracion PT |

**Salida**:

- Ronda PT configurable desde admin
- Participantes con codigo analitico exportable

### Carril C: Exportador PT

**Responsabilidad**: producir CSV compatible con `pt_app`.

| # | Archivo / Area | Accion | Notas |
|---|----------------|--------|-------|
| C.1 | `lib/rondas.ts` o modulo nuevo | Crear | Builder CSV especifico PT |
| C.2 | `app/(protected)/dashboard/rondas/[id]/resultados/...` | Crear | Ruta separada de exportacion PT |
| C.3 | validacion estructural | Implementar | Orden exacto de columnas y quoting correcto |

**Salida**:

- Exportador dedicado para `pt_app`

**Restriccion**:

- Puede desarrollarse en paralelo, pero solo se considera terminado cuando haya datos PT reales para validar.

## Fase 2: Captura y operacion PT (paralelo real)

Esta fase depende de que el Carril A este estable.

### Carril D: Formulario participante PT

**Responsabilidad**: captura de datos en la granularidad requerida.

| # | Archivo / Area | Accion | Notas |
|---|----------------|--------|-------|
| D.1 | `app/(protected)/ronda/[codigo]/FormularioRonda.tsx` | Rediseñar | Cambiar de `contaminante + nivel` a matriz PT |
| D.2 | `app/(protected)/ronda/[codigo]/page.tsx` | Modificar | Cargar estructura PT nueva |
| D.3 | UX participante | Modificar | Mostrar `run`, `level`, `replicate`, `sample_group` |

**Salida**:

- Formulario PT funcional

### Carril E: Logica de guardado, completitud y envio final

**Responsabilidad**: reglas del flujo operativo sobre el modelo PT.

| # | Archivo / Area | Accion | Notas |
|---|----------------|--------|-------|
| E.1 | `app/(protected)/ronda/[codigo]/actions.ts` | Reescribir | Guardado PT por combinacion completa |
| E.2 | `lib/rondas.ts` | Modificar | Nueva logica de completitud por unidad PT |
| E.3 | flujo final | Modificar | Mantener separacion entre envio final y cierre de ronda |

**Salida**:

- Guardado correcto
- Completitud correcta
- Envio final correcto

### Carril F: Revision admin de resultados PT

**Responsabilidad**: inspeccion operativa antes de exportar.

| # | Archivo / Area | Accion | Notas |
|---|----------------|--------|-------|
| F.1 | `app/(protected)/dashboard/rondas/[id]/resultados/page.tsx` | Rediseñar | Mostrar matriz PT en vez del agregado actual |
| F.2 | dashboard resultados | Modificar | Facilitar revision por participante y combinacion PT |

**Salida**:

- Vista admin coherente con el CSV exportado

## Fase 3: Integracion y validacion final (serie obligatoria)

| # | Area | Accion | Entregable |
|---|------|--------|------------|
| 3.1 | Integracion | Probar flujo completo admin -> participante -> admin -> exportacion | Flujo PT operativo |
| 3.2 | Compatibilidad | Comparar salida con `summary_n13.csv` | CSV estructuralmente compatible |
| 3.3 | Calidad | Ejecutar `npm run lint` y `npm run build` | Validacion tecnica final |
| 3.4 | Ajustes | Corregir UX, textos y validaciones finas | Cierre listo para uso |

## Paralelismo literal recomendado

### Serie obligatoria

- Fase 0 completa

### Paralelo real 1

- Carril A: capa de datos
- Carril B: configuracion admin
- Carril C: exportador PT

### Paralelo real 2

- Carril D: formulario participante PT
- Carril E: logica de completitud y envio final
- Carril F: revision admin de resultados PT

### Serie final

- Fase 3 completa

## Orden recomendado de merge

1. Merge de Fase 0
2. Merge de Carril A
3. Merge coordinado de Carriles B y C
4. Merge coordinado de Carriles D, E y F
5. Merge de validacion final

## Riesgos a vigilar

- Intentar reutilizar `envios` como si el cambio fuera solo de exportacion
- Mantener `level` como entero cuando el contrato requiere texto
- Usar `workos_user_id` como `participant_id` exportable
- Cerrar exportacion PT antes de validar cardinalidad y columnas reales

## Log de Ejecucion

- [x] Contrato objetivo definido
- [x] Paralelismo de alto nivel definido
- [x] Plan operativo aprobado
- [x] Fase 0 iniciada
- [x] Fase 0 cerrada con contrato tecnico, reglas operativas y SQL propuesto (`docs/pt-fase0-diseno.md`, `db/phase0_pt_model.sql`)
- [x] Fase 1A iniciada
- [x] Fase 1A completada: migracion del modelo PT en `db/schema.sql`
- [x] Fase 1A completada: tipos PT y funciones en `lib/rondas.ts`
- [x] Fase 1B iniciada: Configuracion admin para PT
- [x] Fase 1B completada: pagina `/configuracion-pt` y server actions
- [x] Fase 1C iniciada: Exportador PT
- [x] Fase 1C completada y validada: ruta `/export-pt.csv` y UI
- [x] Fase 2 iniciada
- [x] Fase 2 completada: Carriles D/E/F implementados en captura, guardado PT y revisión admin
- [ ] Fase 3 completada
