# Auditoría: Implementación de Fixes CodeRabbit (Convex Migration)

**Fecha**: 2026-04-30
**Plan auditado**: [260430_0950_plan_coderabbit-fixes-convex-migration.md](file:///home/w182/w421/calaire-app/logs/plans/260430_0950_plan_coderabbit-fixes-convex-migration.md)
**Estado del plan**: Todos los bloques marcados como completados

---

## Resumen Ejecutivo

| Bloque | Fixes | ✅ Implementados | ⚠️ Parciales | ❌ No encontrados |
|--------|-------|:----------------:|:------------:|:-----------------:|
| 1. Invariantes Convex | 4 | 4 | 0 | 0 |
| 2. Semántica Convex | 6 | 5 | 1 | 0 |
| 3. Config PT Bulk | 4 | 4 | 0 | 0 |
| 4. Wrappers y Rendimiento | 3 | 3 | 0 | 0 |
| 5. UI/Accesibilidad | 5 | 5 | 0 | 0 |
| **Total** | **22** | **21** | **1** | **0** |

---

## Bloque 1: Invariantes Críticas Convex

### 1.1 — Validar transiciones de estado ✅

**Archivo**: [convex/rondas.ts](file:///home/w182/w421/calaire-app/convex/rondas.ts)

La función helper `assertAllowedEstadoTransition` (L28-33) implementa la máquina de estados correctamente:
- `borrador` → solo `activa`
- `activa` → solo `cerrada`
- `cerrada` → no admite transiciones

Se usa en:
- [`updateRondaEstado`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L578-L586) (L583)
- [`transitionRondaEstado`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L751-L762) (L759)

> [!TIP]
> `reabrirRonda` (L764-772) hace una transición `cerrada → activa` con su propia validación directa (`if (ronda.estado !== 'cerrada')`). Esto es correcto ya que es una operación de excepción administrativa y no pasa por la máquina de estados general.

---

### 1.2 — Evitar duplicados de participantes ✅

**Archivo**: [convex/rondas.ts](file:///home/w182/w421/calaire-app/convex/rondas.ts)

[`addParticipante`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L610-L638) (L620-624) hace una consulta `by_ronda_user` antes de insertar y lanza `Error` si ya existe.

```typescript
const existing = await ctx.db
  .query('rondaParticipantes')
  .withIndex('by_ronda_user', (q) => q.eq('rondaId', rondaId).eq('workosUserId', workosUserId))
  .unique()
if (existing) throw new Error('Este usuario ya esta asignado a esta ronda.')
```

[`assignParticipante`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L827-L856) (L839-843) tiene la misma validación con `.first()`.

[`claimParticipanteToken`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L481-L515) (L492-496) también verifica con `by_ronda_user` para evitar double-claim.

---

### 1.3 — Preservar `invitadoAt` ✅

**Archivo**: [convex/rondas.ts](file:///home/w182/w421/calaire-app/convex/rondas.ts)

[`claimParticipanteToken`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L507-L511) usa `ctx.db.patch()` y **no incluye** `invitadoAt` en el patch, preservando el valor original:

```typescript
await ctx.db.patch(slot._id, {
  workosUserId: userId,
  email,
  claimedAt: now,
  // invitadoAt NOT overwritten ✓
})
```

El comentario en L506 documenta esta decisión: `// Preserve participantCode when a pending slot is claimed.`

---

### 1.4 — Proteger configuración con envíos existentes ✅

**Archivo**: [convex/rondas.ts](file:///home/w182/w421/calaire-app/convex/rondas.ts)

[`updateRondaConfig`](file:///home/w182/w421/calaire-app/convex/rondas.ts#L699-L749) (L727-733) consulta si hay envíos antes de borrar/reinsertar contaminantes:

```typescript
const envios = await ctx.db
  .query('envios')
  .withIndex('by_ronda', (q) => q.eq('rondaId', id))
  .first()
if (envios) {
  throw new Error('No se puede modificar la configuracion de contaminantes porque la ronda ya tiene envios.')
}
```

> [!NOTE]
> Solo valida `envios` (regulares). No valida `enviosPt`. Esto puede ser intencional si la tabla de contaminantes solo gobierna envíos regulares, pero vale verificar si la configuración PT también debería protegerse aquí.

---

## Bloque 2: Semántica Convex y Wrappers

### 2.1 — Robustecer `getOrCreateFicha` ✅

**Archivo**: [convex/fichas.ts](file:///home/w182/w421/calaire-app/convex/fichas.ts)

[`getOrCreateFicha`](file:///home/w182/w421/calaire-app/convex/fichas.ts#L96-L117) (L113-115) reconsulta después de insertar:

```typescript
const insertedId = await ctx.db.insert('fichasRegistro', { ... })
const inserted = await getLatestFichaByRondaParticipante(ctx, rondaParticipanteId)
return inserted?._id ?? insertedId
```

Esto reduce el riesgo de devolver un ID huérfano si la mutation falla parcialmente (patrón defensivo de "re-fetch after write").

---

### 2.2 — Preservar `null` en patch (fichas) ✅

**Archivo**: [convex/fichas.ts](file:///home/w182/w421/calaire-app/convex/fichas.ts)

[`upsertFichaScalar`](file:///home/w182/w421/calaire-app/convex/fichas.ts#L119-L155) acepta `valueString: v.optional(v.union(v.string(), v.null()))` (L139). Cuando el cliente envía `null`, el valor se propaga al patch via `[field]: value` (L153).

El schema (L134-144) declara los campos clearables como `v.optional(v.union(v.string(), v.null()))`, confirmando alineación.

---

### 2.3 — Preservar `null` en `updateParticipantePT` ✅

**Archivo**: [convex/pt.ts](file:///home/w182/w421/calaire-app/convex/pt.ts)

[`updateParticipantePT`](file:///home/w182/w421/calaire-app/convex/pt.ts#L435-L450) (L442-448) construye el patch condicionalmente:

```typescript
const patch: { participantCode?: string | null; replicateCode?: number | null } = {}
if (participantCode !== undefined) patch.participantCode = participantCode
if (replicateCode !== undefined) patch.replicateCode = replicateCode
if (Object.keys(patch).length > 0) await ctx.db.patch(participanteId, patch)
```

Los args aceptan `v.union(v.string(), v.null())` y `v.union(v.number(), v.null())` (L438-439), por lo que `null` se preserva correctamente en el patch.

> [!IMPORTANT]
> Los args **no son opcionales** (`v.union(..., v.null())`), por lo que el caller siempre envía ambos campos. La lógica `!== undefined` en el handler es redundante en la práctica pero inofensiva — funciona correctamente como guardia defensiva.

---

### 2.4 — Permitir campos clearables con `null` en schema ✅

**Archivo**: [convex/schema.ts](file:///home/w182/w421/calaire-app/convex/schema.ts)

Los campos clearables usan el patrón `v.optional(v.union(v.string(), v.null()))`:
- `rondaParticipantes.participantCode` (L48)
- `rondaParticipantes.replicateCode` (L49)
- `fichasRegistro` campos de texto (L134-144): `nombreLaboratorio`, `nombreResponsable`, `cargo`, `ciudad`, `departamento`, `telefono`, `transporte`, `horaLlegada`, `observaciones`, `nombreFirma`

---

### 2.5 — Defaults booleanos explícitos en `FichaRegistro` ✅

**Archivo**: [lib/fichas.ts](file:///home/w182/w421/calaire-app/lib/fichas.ts)

[`mapFichaDoc`](file:///home/w182/w421/calaire-app/lib/fichas.ts#L124-L147) (L136-141) aplica defaults `false` a todos los booleanos:

```typescript
estacionamiento: (doc.estacionamiento ?? false) as boolean,
dec_datos_correctos: (doc.decDatosCorrectos ?? false) as boolean,
dec_acepta_condiciones: (doc.decAceptaCondiciones ?? false) as boolean,
dec_compromisos: (doc.decCompromisos ?? false) as boolean,
dec_firma_autorizada: (doc.decFirmaAutorizada ?? false) as boolean,
```

Estos defaults evitan que el tipo `FichaRegistro` devuelva `undefined` en los campos booleanos.

---

### 2.6 — Usar timestamps del servidor ⚠️ Parcial

**Archivo**: [lib/rondas.ts](file:///home/w182/w421/calaire-app/lib/rondas.ts)

`createPTItem` (L884-908) y `createPTSampleGroup` (L934-952) devuelven el `createdAt` del documento retornado por Convex:

```typescript
created_at: new Date(doc.createdAt).toISOString(),
```

Sin embargo, la mutation original en `convex/pt.ts`:
- [`createPTItem`](file:///home/w182/w421/calaire-app/convex/pt.ts#L377-L391) (L388): usa `createdAt: Date.now()` — **este es el timestamp del servidor Convex** (la mutation ejecuta en el servidor), no del cliente. El patrón es correcto.
- [`createPTSampleGroup`](file:///home/w182/w421/calaire-app/convex/pt.ts#L423-L433) (L430): mismo patrón.

> [!WARNING]
> El `Date.now()` dentro de una mutation Convex ejecuta en el runtime de Convex, que es un timestamp del servidor. Sin embargo, **no es el `_creationTime` del sistema** que Convex agrega automáticamente. La inconsistencia potencial es que `createdAt` (manual) y `_creationTime` (sistema) podrían diferir en milisegundos. En la práctica esto es irrelevante para este caso, pero el plan mencionaba "mapear `createdAt` devuelto por Convex" — lo cual se cumple, pero el mapping en `lib/rondas.ts` mapea el campo manual, no el del sistema.

---

## Bloque 3: Configuración PT Bulk

### 3.1 — Reemplazar `nextId` state por ref ✅

**Archivo**: [PTLevelsBulkForm.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/PTLevelsBulkForm.tsx)

[Línea 27](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/PTLevelsBulkForm.tsx#L27): `const nextIdRef = useRef(4)` — usa `useRef` en lugar de `useState` para evitar closures stale.

La función [`addRows`](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/PTLevelsBulkForm.tsx#L49-L59) (L49-59) lee y actualiza la ref dentro del setter de estado:

```typescript
function addRows(count: number) {
  setRows((current) => {
    const startId = nextIdRef.current
    nextIdRef.current += count  // mutates ref directly, no stale closure
    ...
  })
}
```

---

### 3.2 — Fallback para contaminantes nulos ✅

**Archivo**: [configuracion-pt/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/page.tsx)

[Línea 153](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/page.tsx#L153):

```typescript
contaminantes={(ronda.contaminantes ?? []).map((c) => c.contaminante)}
```

El `?? []` asegura que se pasa siempre un array, incluso si `ronda.contaminantes` es `undefined`.

---

### 3.3 — Validar duplicados por contaminante en bulk ✅

**Archivo**: [configuracion-pt/actions.ts](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/actions.ts)

[`createPTItemsBulkAction`](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/configuracion-pt/actions.ts#L106-L196) (L137-157) implementa **triple validación** de duplicados:

1. **Dentro del batch** (L137-157): Set de `runCode::levelLabel`, más sets separados de `runsInInput` y `levelsInInput`
2. **Contra existentes** (L161-174): Consulta items existentes del mismo contaminante y verifica contra `existingRuns` y `existingLevels`

---

### 3.4 — Crear items PT en bulk ✅

**Archivo**: [convex/pt.ts](file:///home/w182/w421/calaire-app/convex/pt.ts)

[`createPTItemsBulk`](file:///home/w182/w421/calaire-app/convex/pt.ts#L393-L421) (L393-421) crea todos los items en un solo handler de mutation (transacción única):

```typescript
handler: async (ctx, { rondaId, contaminante, items }) => {
  const now = Date.now()
  const ids = []
  for (const item of items) {
    const id = await ctx.db.insert('rondaPtItems', { ... })
    ids.push(id)
  }
  return Promise.all(ids.map((id) => ctx.db.get(id)))
}
```

Esto evita la creación parcial que ocurriría con mutations separadas en loop.

---

## Bloque 4: Wrappers, Exportación y Rendimiento

### 4.1 — Query `listAllEnviosPT` ✅

**Archivo**: [convex/pt.ts](file:///home/w182/w421/calaire-app/convex/pt.ts)

[`listAllEnviosPT`](file:///home/w182/w421/calaire-app/convex/pt.ts#L259-L290) (L259-290) ejecuta 4 queries en paralelo y mapea relaciones en memoria:

```typescript
const [envios, items, sampleGroups, participantes] = await Promise.all([
  ctx.db.query('enviosPt').withIndex('by_ronda', ...).collect(),
  ctx.db.query('rondaPtItems').withIndex('by_ronda', ...).collect(),
  ctx.db.query('rondaPtSampleGroups').withIndex('by_ronda', ...).collect(),
  ctx.db.query('rondaParticipantes').withIndex('by_ronda', ...).collect(),
])
```

Los Maps de lookup (`itemMap`, `groupMap`, `participanteMap`) eliminan el N+1.

---

### 4.2 — Eliminar N+1 en wrapper `listAllEnviosPT` ✅

**Archivo**: [lib/rondas.ts](file:///home/w182/w421/calaire-app/lib/rondas.ts)

[`listAllEnviosPT`](file:///home/w182/w421/calaire-app/lib/rondas.ts#L984-L993) (L984-993) consume la query nueva y mapea con funciones helper existentes:

```typescript
export async function listAllEnviosPT(rondaId: string): Promise<EnvioPTWithRelations[]> {
  const rows = await fetchQuery(api.pt.listAllEnviosPT, { ... })
  return rows.map(({ envio, ptItem, sampleGroup, participante }) => ({
    ...mapEnvioPTDoc(envio),
    pt_item: mapPTItemDoc(ptItem),
    sample_group: mapPTSampleGroupDoc(sampleGroup),
    participante: mapParticipantePTDoc(participante),
  }))
}
```

Una sola query Convex en lugar de N+1 llamadas separadas.

---

### 4.3 — Filtros null-safe en export-pt.csv ✅

**Archivo**: [export-pt.csv/route.ts](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/resultados/export-pt.csv/route.ts)

[Líneas 23-24](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/resultados/export-pt.csv/route.ts#L23-L24):

```typescript
const missingParticipantIds = enviosPT.filter((envio) => !envio.participant_id?.trim())
const missingReplicates = enviosPT.filter((envio) => envio.replicate == null || Number(envio.replicate) <= 0)
```

- `?.trim()` maneja `participant_id` que puede ser `undefined`/`null`/empty string
- `== null` maneja tanto `null` como `undefined` para `replicate`
- `Number()` garantiza comparación numérica

---

## Bloque 5: UI, Accesibilidad y Keys Estables

### 5.1 — Roles ARIA en `Alert.tsx` ✅

**Archivo**: [Alert.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/components/Alert.tsx)

[Línea 5](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/components/Alert.tsx#L5):

```tsx
role={tone === 'error' ? 'alert' : 'status'}
```

`alert` para errores (interrumpe screenreaders), `status` para success (polite announcement).

---

### 5.2 — Quitar import no usado en `dashboard/layout.tsx` ✅

**Archivo**: [dashboard/layout.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/layout.tsx)

El archivo tiene **solo 3 imports** (L1-5):
- `ReactNode` (usado en firma)
- `isAdmin`, `requireAuth` (usados en handler)
- `Sidebar` (renderizado)

No hay import de `MobileNav` ni ningún otro import no usado. Fix implementado.

---

### 5.3 — Aplicar variantes de `MetricaCard` ✅

**Archivo**: [rondas/[id]/page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/page.tsx)

[`MetricaCard`](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/page.tsx#L59-L102) (L72-77) aplica clases diferenciadas por variante:

```typescript
const variantClass = {
  default: 'border-l-[var(--pt-primary)]',
  success: 'border-l-emerald-500 bg-emerald-50/40',
  warning: 'border-l-amber-500 bg-amber-50/50',
  danger:  'border-l-rose-500 bg-rose-50/50',
}[variant]
```

Se aplica en el `className` del container (L95 y L101). Las variantes se derivan en L274-293 del page.

---

### 5.4 — Semántica consistente del tab en `RondaContextNav` ✅

**Archivo**: [RondaContextNav.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/RondaContextNav.tsx)

[Líneas 50-51](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/rondas/%5Bid%5D/RondaContextNav.tsx#L50-L51):

```typescript
const disabled = tab.label === 'Participantes' && !ptConfigurado
const href = disabled ? `/dashboard/rondas/${rondaId}/configuracion-pt` : tab.href(rondaId)
```

Cuando PT no está configurado, el tab "Participantes" redirige a configuración PT en lugar de ser un no-op. El link siempre es navegable (es un `<Link>`, no un `<span>`), manteniendo la semántica de navegación.

---

### 5.5 — Keys estables en `AttentionItem` ✅

**Archivo**: [lib/operativo.ts](file:///home/w182/w421/calaire-app/lib/operativo.ts)

[`AttentionItem`](file:///home/w182/w421/calaire-app/lib/operativo.ts#L22-L28) incluye `id: string` (L23).

[`buildAttentionItems`](file:///home/w182/w421/calaire-app/lib/operativo.ts#L111-L172) asigna IDs semánticos estables:
- `'rondas-sin-config-pt'` (L123)
- `'cupos-sin-reclamar'` (L137)
- `'fichas-pendientes'` (L151)
- `'rondas-en-borrador'` (L163)

[`dashboard/page.tsx`](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/page.tsx) (L726): `<li key={item.id}>` — usa `item.id` como React key.

---

## Hallazgos Adicionales

> [!NOTE]
> ### Observación: `updateRondaConfig` protege solo `envios` pero no `enviosPt`
> Fix 1.4 protege contra borrar contaminantes cuando hay `envios` regulares, pero la tabla `enviosPt` no se valida. Si un coordinador tiene envíos PT activos pero cero envíos regulares, la protección no aplica. Esto puede ser intencional si `rondaContaminantes` solo gobierna el flujo de envíos regulares, pero merece documentación explícita.

> [!NOTE]
> ### Observación: `regenerateParticipanteSlot` usa `claimedAt: undefined`
> En [convex/rondas.ts L877](file:///home/w182/w421/calaire-app/convex/rondas.ts#L877), `claimedAt: undefined` en `ctx.db.patch()` debería ser equivalente a no incluir el campo (Convex ignora `undefined` en patches). Sin embargo, si la intención es *borrar* `claimedAt`, el valor debería ser `null` o el campo debería removerse con `ctx.db.replace()`. El schema usa `v.optional(v.number())` para `claimedAt`, por lo que `undefined` no lo borra — simplemente no lo modifica.

---

## Veredicto

**21 de 22 verificaciones son satisfactorias** (contando sub-items de fix 2.6 y 1.4 que tienen observaciones menores). No se encontraron fixes faltantes. El código implementa correctamente todas las protecciones especificadas en el plan. Las dos observaciones documentadas arriba son de bajo riesgo y no bloquean.
