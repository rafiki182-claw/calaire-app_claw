import { signOut } from '@workos-inc/authkit-nextjs'

import { buildAbsoluteAppUrl } from '@/lib/app-url'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LogoUnal } from '@/app/components/LogoUnal'
import {
  changeRondaStatusAction,
  createRondaAction,
  deleteRondaAction,
  updateRondaAction,
} from '@/app/(protected)/dashboard/actions'
import { isAdmin, requireAuth } from '@/lib/auth'
import {
  CONTAMINANTES,
  listAllParticipantes,
  listRondas,
  listRondasParticipante,
  type ParticipanteGlobal,
  type Ronda,
  type RondaParticipanteAsignada,
} from '@/lib/rondas'

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusClasses(status: Ronda['estado']) {
  switch (status) {
    case 'activa':
      return 'bg-emerald-100 text-emerald-800'
    case 'cerrada':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-amber-100 text-amber-800'
  }
}

function Alert({
  tone,
  message,
}: {
  tone: 'error' | 'success'
  message?: string
}) {
  if (!message) return null

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {message}
    </div>
  )
}

function ContaminanteFields({
  round,
}: {
  round?: Ronda
}) {
  return (
    <div className="grid gap-3">
      {CONTAMINANTES.map((contaminante) => {
        const config = round?.contaminantes.find((item) => item.contaminante === contaminante)

        return (
          <div
            key={contaminante}
            className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-[1.2fr_1fr_1fr]"
          >
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]">
              <input
                type="checkbox"
                name={`enabled_${contaminante}`}
                defaultChecked={Boolean(config)}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              <span>{contaminante}</span>
            </label>

            <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
              <span>Niveles</span>
              <input
                type="number"
                min="1"
                name={`niveles_${contaminante}`}
                defaultValue={config?.niveles ?? 1}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none ring-0"
              />
            </label>

            <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
              <span>Réplicas</span>
              <select
                name={`replicas_${contaminante}`}
                defaultValue={String(config?.replicas ?? 2)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none ring-0"
              >
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
          </div>
        )
      })}
    </div>
  )
}

function RondaForm({
  action,
  title,
  description,
  submitLabel,
  round,
}: {
  action: (formData: FormData) => void | Promise<void>
  title: string
  description: string
  submitLabel: string
  round?: Ronda
}) {
  return (
    <form action={action} className="card grid gap-5 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="text-sm text-[var(--foreground-muted)]">{description}</p>
      </div>

      {round && <input type="hidden" name="ronda_id" value={round.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
          <span>Nombre</span>
          <input
            type="text"
            name="nombre"
            required
            defaultValue={round?.nombre ?? ''}
            placeholder="Ronda CO abril 2026"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none ring-0"
          />
        </label>

        <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
          <span>Código</span>
          <input
            type="text"
            name="codigo"
            required
            defaultValue={round?.codigo ?? ''}
            placeholder="RDA-CO-2026-01"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 uppercase text-[var(--foreground)] outline-none ring-0"
          />
        </label>
      </div>

      {!round && (
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
            <span>Número de participantes</span>
            <input
              type="number"
              name="participantes_planeados"
              min="1"
              required
              defaultValue="1"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none ring-0"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              name="include_reference"
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <span>Incluir referencia (member special) con enlace individual</span>
          </label>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
            Configuración por contaminante
          </h3>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Seleccione los contaminantes incluidos y defina niveles y número de réplicas.
          </p>
        </div>
        <ContaminanteFields round={round} />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function StatusAction({ round }: { round: Ronda }) {
  if (round.estado === 'cerrada') {
    return (
      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground-muted)]">
        Sin acciones
      </span>
    )
  }

  const nextState = round.estado === 'borrador' ? 'activa' : 'cerrada'
  const label = round.estado === 'borrador' ? 'Publicar ronda' : 'Cerrar ronda'

  return (
    <form action={changeRondaStatusAction}>
      <input type="hidden" name="ronda_id" value={round.id} />
      <input type="hidden" name="next_state" value={nextState} />
      <button
        type="submit"
        className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
      >
        {label}
      </button>
    </form>
  )
}

function DeleteRondaAction({ round }: { round: Ronda }) {
  return (
    <form action={deleteRondaAction}>
      <input type="hidden" name="ronda_id" value={round.id} />
      <button
        type="submit"
        className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
      >
        Borrar ronda
      </button>
    </form>
  )
}

/* ─── Collapsible Round Card (Opción B) ──────────────────────────────── */
function RoundCard({ round }: { round: Ronda }) {
  const canEdit = round.estado === 'borrador'

  return (
    <details className="collapsible">
      <summary>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <span className="font-semibold text-[var(--foreground)]">{round.nombre}</span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] ${statusClasses(round.estado)}`}
          >
            {round.estado}
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">
            {round.codigo}
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">
            · {round.participantes_asignados ?? 0}/{round.participantes_planeados ?? 0} participantes
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">
            · {round.contaminantes.map((c) => c.contaminante).join(', ')}
          </span>
        </div>
        <span className="chevron">▶</span>
      </summary>

      <article className="collapsible-body card grid gap-5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-[var(--foreground-muted)]">
              Creada {formatDate(round.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/rondas/${round.id}/participantes`}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
            >
              Participantes
            </Link>
            <Link
              href={`/dashboard/rondas/${round.id}/resultados`}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
            >
              Resultados
            </Link>
            <StatusAction round={round} />
            <DeleteRondaAction round={round} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {round.contaminantes.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]"
            >
              <div className="font-semibold text-[var(--foreground)]">{item.contaminante}</div>
              <div>{item.niveles} niveles</div>
              <div>{item.replicas} réplicas</div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <RondaForm
            action={updateRondaAction}
            title="Editar configuración"
            description="Mientras la ronda esté en borrador se puede ajustar nombre, código y configuración analítica."
            submitLabel="Guardar cambios"
            round={round}
          />
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            La configuración quedó bloqueada porque la ronda ya fue publicada o cerrada.
          </div>
        )}
      </article>
    </details>
  )
}

/* ─── Tab Navigation ─────────────────────────────────────────────────── */
function TabNav({
  activeTab,
  rondasCount,
  participantesCount,
}: {
  activeTab: string
  rondasCount: number
  participantesCount: number
}) {
  return (
    <nav className="tab-nav">
      <Link
        href="/dashboard?tab=rondas"
        className={activeTab === 'rondas' ? 'tab-active' : ''}
      >
        Rondas
        <span className="tab-count">{rondasCount}</span>
      </Link>
      <Link
        href="/dashboard?tab=participantes"
        className={activeTab === 'participantes' ? 'tab-active' : ''}
      >
        Participantes
        <span className="tab-count">{participantesCount}</span>
      </Link>
    </nav>
  )
}

/* ─── Rondas List View ───────────────────────────────────────────────── */
function RondasView({ rondas }: { rondas: Ronda[] }) {
  if (rondas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
        No hay rondas creadas todavía. Use el botón «＋ Nueva ronda» para registrar la primera.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {rondas.map((round) => (
        <RoundCard key={round.id} round={round} />
      ))}
    </div>
  )
}

/* ─── Global Participants View ───────────────────────────────────────── */
function ParticipantesGlobalView({ participantes }: { participantes: ParticipanteGlobal[] }) {
  if (participantes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
        No hay participantes registrados en ninguna ronda todavía.
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem]">
          <thead>
            <tr className="border-b-2 border-[var(--pt-primary)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Participante
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Rondas
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Envíos totales
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Detalle por ronda
              </th>
            </tr>
          </thead>
          <tbody>
            {participantes.map((p) => (
              <tr key={p.workos_user_id} className="border-b border-[var(--border-soft)] last:border-0">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-[var(--foreground)]">{p.email}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="numeric rounded-full bg-[var(--pt-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                    {p.rondas.length}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="numeric text-sm text-[var(--foreground)]">
                    {p.total_envios}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {p.rondas.map((r) => (
                      <Link
                        key={r.id}
                        href={`/dashboard/rondas/${r.id}/participantes`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
                      >
                        <span className="font-medium text-[var(--foreground)]">{r.codigo}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusClasses(r.estado)}`}
                        >
                          {r.estado}
                        </span>
                        {r.envios_count > 0 && (
                          <span className="numeric text-[var(--foreground-muted)]">
                            ({r.envios_count})
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Participante View (non-admin) ──────────────────────────────────── */
function estadoParticipanteBadge(estado: Ronda['estado']) {
  if (estado === 'activa') return 'bg-emerald-100 text-emerald-800'
  if (estado === 'cerrada') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-800'
}

function RondaParticipanteCard({ ronda }: { ronda: RondaParticipanteAsignada }) {
  const esActiva = ronda.estado === 'activa'
  const esBorrador = ronda.estado === 'borrador'

  return (
    <article className="card grid gap-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{ronda.nombre}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${estadoParticipanteBadge(ronda.estado)}`}
            >
              {ronda.estado}
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-muted)]">
            Código <span className="font-medium text-[var(--foreground)]">{ronda.codigo}</span>
          </p>
        </div>

        {esActiva && (
          <Link href={`/ronda/${ronda.codigo}`} className="btn-primary self-start">
            Ingresar datos →
          </Link>
        )}
        {ronda.estado === 'cerrada' && (
          <Link href={`/ronda/${ronda.codigo}`} className="btn-outline self-start">
            Ver mis envíos
          </Link>
        )}
        {esBorrador && (
          <span className="self-start rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
            Próximamente
          </span>
        )}
      </div>

      {ronda.contaminantes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ronda.contaminantes.map((c) => (
            <span
              key={c.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--foreground-muted)]"
            >
              {c.contaminante} · {c.niveles}N · {c.replicas}R
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function ParticipanteView({ rondas }: { rondas: RondaParticipanteAsignada[] }) {
  return (
    <section className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Mis rondas asignadas</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Rondas en las que está habilitado para cargar resultados.
        </p>
      </div>

      {rondas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
          No tiene rondas asignadas todavía. Contacte al coordinador para que lo agregue.
        </div>
      ) : (
        rondas.map((r) => <RondaParticipanteCard key={r.id} ronda={r} />)
      )}
    </section>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const auth = await requireAuth()
  if (!auth.user) redirect('/login')

  const params = searchParams ? await searchParams : {}
  const success = getParamValue(params.success)
  const error = getParamValue(params.error)
  const admin = isAdmin(auth)
  const activeTab = getParamValue(params.tab) ?? 'rondas'

  const rondas = admin ? await listRondas() : []
  const allParticipantes = admin && activeTab === 'participantes' ? await listAllParticipantes() : []
  const rondasParticipante = !admin ? await listRondasParticipante(auth.user.id) : []

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <LogoUnal height={32} />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                  CALAIRE-EA
                </p>
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  Dashboard de rondas de ensayo
                </h1>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {auth.user.email} · {admin ? 'Coordinador' : 'Participante'}
                </p>
              </div>
            </div>

            <form
              action={async () => {
                'use server'
                await signOut({ returnTo: buildAbsoluteAppUrl('/login') })
              }}
            >
              <button type="submit" className="btn-outline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        {!admin ? (
          <ParticipanteView rondas={rondasParticipante} />
        ) : (
          <div className="grid gap-6">
            {/* ── PT App link ───────────────────────────────────── */}
            <a
              href="https://w421.shinyapps.io/pt_app/"
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center justify-between gap-4 p-5 transition hover:border-[var(--pt-primary)]"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[var(--foreground)]">Herramienta de análisis PT App</p>
                <p className="text-xs text-[var(--foreground-muted)]">Aplicativo R/Shiny para el procesamiento estadístico de resultados</p>
              </div>
              <span className="btn-primary shrink-0">Abrir →</span>
            </a>

            {/* ── Collapsible "Nueva ronda" ─────────────────────── */}
            <details className="collapsible">
              <summary>
                <span>＋ Nueva ronda</span>
                <span className="chevron">▶</span>
              </summary>
              <div className="collapsible-body">
                <RondaForm
                  action={createRondaAction}
                  title="Nueva ronda"
                  description="Cree una ronda en borrador, defina la estructura analítica y deje listos los enlaces formales de acceso por participante."
                  submitLabel="Crear ronda"
                />
              </div>
            </details>

            {/* ── Tab navigation ────────────────────────────────── */}
            <TabNav
              activeTab={activeTab}
              rondasCount={rondas.length}
              participantesCount={allParticipantes.length}
            />

            {/* ── Tab content ───────────────────────────────────── */}
            {activeTab === 'rondas' ? (
              <RondasView rondas={rondas} />
            ) : (
              <ParticipantesGlobalView participantes={allParticipantes} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
