# Fase 1 — Reestructurar navegación y dashboard inicial

**Origen**: [plan_redisenio-uiux-coordinador.md](file:///home/w182/w421/calaire-app/logs/plans/260427_2355_plan_redisenio-uiux-coordinador.md)  
**Creado**: 2026-04-28 00:05  
**Estado**: propuesta para revisión  
**Alcance**: `layout.tsx` + `page.tsx` del coordinador · sin tocar Convex ni rutas de ronda

---

## Contexto del estado actual

El dashboard del coordinador (`/dashboard`) tiene dos problemas estructurales que esta fase resuelve:

### 1. Duplicación de navegación
- `layout.tsx` renderiza un **sidebar** con enlaces a Rondas, Participantes, Resultados (rutas con `?tab=`).
- `page.tsx` renderiza internamente un componente `<TabNav>` con los mismos tres destinos.
- Resultado: en pantallas grandes hay dos navegaciones idénticas en paralelo. Los tabs globales sobran si el sidebar existe.

### 2. Dashboard como índice, no como bandeja
- La primera pantalla del coordinador muestra KPIs básicos (rondas activas, en borrador, participantes totales, fichas pendientes) y luego una tabla de rondas completa.
- No hay una sección de "qué requiere atención ahora".
- Las filas de la tabla tienen hasta 6 acciones simultáneas: `Config. PT`, `Resultados`, `Publicar/Cerrar`, `Editar`, `Borrar`.

---

## Objetivo de la fase

1. **Eliminar `<TabNav>`** de `page.tsx` — la navegación global queda solo en el sidebar.
2. **Expandir el sidebar** con los 5 destinos del modelo propuesto (Inicio, Rondas, Participantes, Resultados, Herramienta PT).
3. **Convertir `page.tsx` en una bandeja de trabajo** con tres secciones:
   - KPIs compactos expandidos (5 métricas accionables).
   - Sección "Requiere atención" (alertas con pendientes clicables).
   - Sección "Rondas en curso" (tabla simplificada, CTA único por fila).
4. **Simplificar la tabla de rondas** — reducir acciones por fila a máximo 2 visibles + menú contextual.

> **Límite de alcance**: Esta fase NO toca rutas de ronda (`/dashboard/rondas/[id]/*`), ni Convex, ni la vista de participante (non-admin). Todo el trabajo es presentacional usando los datos ya disponibles.

---

## Análisis de datos disponibles

El `page.tsx` actual ya carga:

| Variable | Qué contiene |
|---|---|
| `rondas` | Lista completa con `estado`, `participantes_planeados`, `participantes_asignados`, `contaminantes` |
| `allParticipantes` | Participantes globales con conteo de envíos |
| `participantesRondasActivas` | `ParticipanteRondaResumen[]` para cada ronda activa |
| `fichasPendientesCount` | Participantes de rondas activas con ficha ≠ `enviado` |

Con estos datos se puede calcular **sin nuevas queries**:

- `enlacesSinReclamar`: participantes con `estado === 'pendiente'` en rondas activas.
- `rondasSinConfigPT`: rondas activas sin contaminantes configurados (`contaminantes.length === 0`).
- `rondasListasParaExportar`: rondas con al menos un participante con `envios_pt_count > 0`.
- `estadoOperativo(ronda)`: función pura derivada de los campos existentes.

> **Decisión**: Calcular `enlacesSinReclamar` y `rondasSinConfigPT` en el servidor usando los datos ya cargados. No se añaden nuevas llamadas a Convex en esta fase.

---

## Preguntas abiertas

> [!IMPORTANT]
> **Pregunta 1 — Comportamiento de `/dashboard` sin parámetro**: El tab default actual es `'rondas'` — entrando a `/dashboard` sin param, el coordinador ve la lista de rondas. El plan propone cambiar para que `/dashboard` muestre la bandeja de trabajo y `/dashboard?tab=rondas` muestre la lista. ¿Se acepta este cambio de comportamiento?

> [!IMPORTANT]
> **Pregunta 2 — Herramienta PT en sidebar**: ¿El sidebar debe incluir una entrada "Herramienta PT" que abra el Shiny app en nueva pestaña, o ese acceso queda solo en el cuerpo de la página de inicio?

> [!NOTE]
> **Menú contextual**: Se propone usar `<details>` HTML nativo como menú de acciones secundarias (Editar, Borrar). No requiere JS ni estado. Si se prefiere algo más pulido, puede reemplazarse en Fase 5. ¿Aceptable por ahora?

---

## Cambios propuestos

---

### Capa 1: Navegación global

#### [MODIFY] [layout.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/layout.tsx)

**Problema**: Sidebar solo tiene 3 ítems sin ítem activo resaltado. No hay "Inicio" ni navegación móvil.

**Cambios**:

1. Convertir `Sidebar` a Client Component (`"use client"`) para poder usar `usePathname()` y `useSearchParams()` y resaltar el ítem activo.
2. Agregar "Inicio" como primer ítem → `/dashboard` (sin tab).
3. Conservar Rondas, Participantes, Resultados con sus `?tab=` actuales.
4. Agregar "Herramienta PT" al final con `target="_blank"` e ícono externo ↗.
5. Agregar **navegación móvil superior** (`flex lg:hidden`) — barra horizontal compacta con los mismos ítems.

**Estructura sidebar resultante**:
```
CALAIRE-EA
──────────
● Inicio           /dashboard
  Rondas           /dashboard?tab=rondas
  Participantes    /dashboard?tab=participantes
  Resultados       /dashboard?tab=resultados
  Herramienta PT ↗ (externo)
──────────
[＋ Nueva ronda]
```

**Lógica de ítem activo**: Un ítem está activo si `pathname === '/dashboard'` (para Inicio) o si `searchParams.get('tab') === tabKey` para los demás. El ítem Inicio está activo cuando `pathname === '/dashboard'` y no hay `?tab`.

---

### Capa 2: Datos derivados (servidor)

#### [NEW] [lib/operativo.ts](file:///home/w182/w421/calaire-app/lib/operativo.ts)

Módulo de funciones puras de presentación. No hace I/O. Reutilizable en Fases 2, 3 y 4.

```ts
import type { Ronda, ParticipanteRondaResumen } from '@/lib/rondas'

export type EstadoOperativo = {
  label: string
  color: 'amber' | 'blue' | 'emerald' | 'slate' | 'violet'
  accion: string
  accionHref: string
}

export type KpiMetrica = {
  label: string
  value: number
  href: string
  highlight: boolean   // true cuando value > 0 y es "negativo" (algo falta)
  positive: boolean    // true cuando value > 0 y es "positivo" (listo para exportar)
}

export type AttentionItem = {
  message: string
  href: string
  count: number
  severity: 'warning' | 'info'
}

export function derivarEstadoOperativo(
  ronda: Ronda,
  participantes: ParticipanteRondaResumen[]
): EstadoOperativo

export function buildKpiMetrics(
  rondas: Ronda[],
  participantesRondasActivas: ParticipanteRondaResumen[][],
  fichasPendientesCount: number
): KpiMetrica[]

export function buildAttentionItems(
  rondas: Ronda[],
  participantesRondasActivas: ParticipanteRondaResumen[][]
): AttentionItem[]
```

**`derivarEstadoOperativo`** — lógica en cascada:

| Condición (en orden) | Label | Color |
|---|---|---|
| `ronda.estado === 'borrador'` | Preparar ronda | amber |
| `ronda.estado === 'cerrada'` | Cerrada | slate |
| `contaminantes.length === 0` | Falta config. PT | amber |
| `sinReclamar > 0` | Invitar participantes | blue |
| `fichasPendientes > 0` | Esperando fichas | violet |
| `hayEnviosPT === true` | Lista para exportar | emerald |
| default | Recibiendo resultados | blue |

---

### Capa 3: Vista del coordinador

#### [MODIFY] [page.tsx](file:///home/w182/w421/calaire-app/app/(protected)/dashboard/page.tsx)

##### 3a. Eliminar `<TabNav>`
- Borrar componente `TabNav` (líneas 422–455).
- Borrar su uso en el render (líneas 1009–1013).
- La lógica `activeTab` se conserva para seguir renderizando el contenido correcto según `?tab`.

##### 3b. Derivar métricas adicionales en el servidor

Dentro del handler de la DashboardPage agregar:

```ts
const enlacesSinReclamar = participantesRondasActivas
  .flat()
  .filter((p) => p.estado === 'pendiente').length

const rondasSinConfigPT = rondasActivas.filter(
  (r) => r.contaminantes.length === 0
).length

const rondasListasParaExportar = rondasActivas.filter((r, i) =>
  participantesRondasActivas[i]?.some((p) => p.envios_pt_count > 0)
).length
```

##### 3c. Reemplazar `<KpiBar>` → `<CoordinatorKpiBar>`

Nuevas 5 métricas como `<Link>` cards:

```tsx
function CoordinatorKpiBar({
  rondasActivas, rondasBorrador,
  fichasPendientes, enlacesSinReclamar,
  rondasListasParaExportar
}: CoordinatorKpiBarProps) {
  const kpis = [
    { label: 'Rondas activas', value: rondasActivas, href: '/dashboard?tab=rondas', negative: false },
    { label: 'Fichas pendientes', value: fichasPendientes, href: '/dashboard?tab=participantes', negative: true },
    { label: 'Cupos sin reclamar', value: enlacesSinReclamar, href: '/dashboard?tab=participantes', negative: true },
    { label: 'Listas para exportar', value: rondasListasParaExportar, href: '/dashboard?tab=resultados', negative: false },
    { label: 'En borrador', value: rondasBorrador, href: '/dashboard?tab=rondas', negative: false },
  ]
  // cada item es <Link> con clase distinta si value > 0 y negative
}
```

##### 3d. Agregar `<AttentionList>`

```tsx
function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-semibold ...">Requiere atención</h2>
      <ul className="grid gap-1">
        {items.map((item) => (
          <li key={item.message}>
            <Link href={item.href} className="...">
              <span>{item.message}</span>
              <span className="badge">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

##### 3e. Agregar `<RondasEnCurso>` (vista de inicio)

Tabla de solo rondas activas. Muestra estado operativo, progreso de cupos (mini progress bar inline), fichas, envíos PT, y CTA único `Abrir →`.

```tsx
function RondasEnCurso({
  rondasActivas,
  participantesPorRonda
}: {
  rondasActivas: Ronda[]
  participantesPorRonda: ParticipanteRondaResumen[][]
}) {
  if (rondasActivas.length === 0) {
    return <EmptyRondasActivas />
  }
  return (
    <section>
      <h2>Rondas en curso</h2>
      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Ronda</th>
              <th>Cupos</th>
              <th>Fichas</th>
              <th>Envíos PT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rondasActivas.map((ronda, i) => {
              const participantes = participantesPorRonda[i] ?? []
              const estado = derivarEstadoOperativo(ronda, participantes)
              return (
                <tr key={ronda.id}>
                  <td><EstadoOperativoBadge estado={estado} /></td>
                  <td>{ronda.nombre} / {ronda.codigo}</td>
                  <td>
                    {ronda.participantes_asignados}/{ronda.participantes_planeados}
                    <MiniProgressBar ... />
                  </td>
                  <td>{fichas enviadas}/{total}</td>
                  <td>{total envíos PT}</td>
                  <td>
                    <Link href={`/dashboard/rondas/${ronda.id}`}>Abrir →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
```

##### 3f. Simplificar `<RondasTable>` y `<RondaRow>`

En el tab `?tab=rondas` (lista completa), la tabla se simplifica:

**Columnas**: Estado técnico, Estado operativo, Código/Nombre, Contaminantes, Participantes, Creada, Acciones.

**Acciones por fila** (máximo 3 elementos):
1. `Abrir →` (link primario a `/dashboard/rondas/[id]`)
2. `<StatusAction>` (Publicar / Cerrar / Reabrir — un solo botón)
3. `<RondaActionsMenu>` (menú `···` con Editar y Borrar)

```tsx
function RondaActionsMenu({ round }: { round: Ronda }) {
  const canEdit = round.estado !== 'cerrada'
  return (
    <details className="relative inline-block">
      <summary className="cursor-pointer list-none ...">···</summary>
      <div className="absolute right-0 z-10 rounded-xl border bg-[var(--surface)] shadow-lg p-1 min-w-[9rem]">
        {canEdit && (
          <Link href={`/dashboard?tab=rondas&editando=${round.id}`} className="...">
            Editar
          </Link>
        )}
        <form action={deleteRondaAction}>
          <input type="hidden" name="ronda_id" value={round.id} />
          <button className="text-rose-700 ...">Borrar</button>
        </form>
      </div>
    </details>
  )
}
```

##### 3g. Render principal actualizado

```tsx
// coordinador view
<div className="grid gap-6">
  <CoordinatorKpiBar ... />

  {/* Vista de inicio: bandeja de trabajo */}
  {activeTab === 'inicio' && (
    <>
      <AttentionList items={attentionItems} />
      <RondasEnCurso rondasActivas={rondasActivas} participantesPorRonda={participantesRondasActivas} />
      {/* PT App link al final */}
      <a href="https://w421.shinyapps.io/pt_app/" ...>Herramienta PT App</a>
    </>
  )}

  {/* Tab rondas: lista completa */}
  {activeTab === 'rondas' && (
    <div className="grid gap-4">
      <details className="collapsible">...</details>
      <RondasTable rondas={rondas} editando={editando} />
    </div>
  )}

  {activeTab === 'participantes' && <ParticipantesGlobalView ... />}
  {activeTab === 'resultados' && <ResultadosGlobalView ... />}
</div>
```

---

## Orden de ejecución

```
1. Crear lib/operativo.ts
   - derivarEstadoOperativo
   - buildKpiMetrics
   - buildAttentionItems
   - tipos: EstadoOperativo, KpiMetrica, AttentionItem

2. Modificar layout.tsx
   - "use client" en Sidebar
   - usePathname + useSearchParams para ítem activo
   - Agregar Inicio, Herramienta PT
   - Agregar nav móvil (flex lg:hidden)

3. Modificar page.tsx
   3a. Eliminar TabNav (componente + uso)
   3b. Derivar métricas adicionales en servidor
   3c. Reemplazar KpiBar por CoordinatorKpiBar
   3d. Agregar AttentionList
   3e. Agregar RondasEnCurso (para activeTab === 'inicio')
   3f. Simplificar RondasTable / RondaRow (menú contextual)
   3g. Ajustar activeTab default de 'rondas' a 'inicio'

4. Verificar: npm run build (sin errores TS)
```

---

## Criterios de aceptación

- [ ] El sidebar no duplica la navegación que ofrecen los tabs internos.
- [ ] `/dashboard` (sin tab) muestra bandeja de trabajo: KPIs + alertas + rondas activas.
- [ ] Cada KPI card es clicable y lleva a contexto relevante.
- [ ] `<AttentionList>` solo aparece cuando hay pendientes reales.
- [ ] Cada alerta tiene conteo concreto y destino claro.
- [ ] La tabla del tab `?tab=rondas` tiene máximo 2 acciones visibles + menú `···`.
- [ ] Editar y Borrar están en el menú contextual, separados del flujo principal.
- [ ] En mobile (< lg) hay navegación compacta; el sidebar se oculta.
- [ ] `npm run build` completa sin errores TypeScript.
- [ ] La vista de participante (non-admin) no se ve afectada.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `Sidebar` como Client Component puede romper expectativas de SSR | Solo `Sidebar` se convierte; `DashboardLayout` permanece Server Component. El Client Component solo lee la URL para clases CSS. |
| Latencia de `participantesRondasActivas` (N queries por ronda activa) | Comportamiento idéntico al actual. No se agregan queries. Documentar como deuda para Fase 2 si hay regresión. |
| Menú `<details>` puede cerrarse al re-render en Server Actions | Comportamiento esperado (es HTML nativo). Fase 5 puede refinar con `<ActionMenu>` client-side. |
| Cambio de `activeTab` default rompe bookmarks con `/dashboard` | Aceptable: el coordinador accede desde el sidebar, no desde bookmarks. |
