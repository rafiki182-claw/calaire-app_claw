import { signOut } from '@workos-inc/authkit-nextjs'

import { buildAbsoluteAppUrl } from '@/lib/app-url'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { LogoUnal } from '@/app/components/LogoUnal'
import { ConfirmSubmitButton } from '@/app/(protected)/dashboard/components/ConfirmSubmitButton'
import {
  changeRondaStatusAction,
  createRondaAction,
  deleteRondaAction,
  reabrirRondaAction,
  updateRondaAction,
} from '@/app/(protected)/dashboard/actions'
import { isAdmin, requireAuth } from '@/lib/auth'
import { Alert } from './components/Alert'
import {
  CONTAMINANTES,
  listAllParticipantes,
  listParticipantesRondaResumen,
  listRondas,
  listRondasParticipante,
  type ParticipanteGlobal,
  type Ronda,
  type RondaParticipanteAsignada,
  type ParticipanteRondaResumen,
} from '@/lib/rondas'
import { derivarEstadoOperativo, buildAttentionItems, type EstadoOperativo, type AttentionItem } from '@/lib/operativo'

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type EditandoParam = string

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
      <form action={reabrirRondaAction}>
        <input type="hidden" name="ronda_id" value={round.id} />
        <button
          type="submit"
          className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
        >
          Reabrir
        </button>
      </form>
    )
  }

  const nextState = round.estado === 'borrador' ? 'activa' : 'cerrada'
  const label = round.estado === 'borrador' ? 'Publicar' : 'Cerrar'

  return (
    <form action={changeRondaStatusAction}>
      <input type="hidden" name="ronda_id" value={round.id} />
      <input type="hidden" name="next_state" value={nextState} />
      <button
        type="submit"
        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
      >
        {label}
      </button>
    </form>
  )
}

function RowActionLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
    >
      {children}
    </Link>
  )
}

/* ─── Rondas Table ───────────────────────────────────────────────────── */
function RondasTable({ rondas, editando }: { rondas: Ronda[]; editando: EditandoParam }) {
  if (rondas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
        No hay rondas creadas todavía. Use el botón «＋ Nueva ronda» para registrar la primera.
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem]">
          <thead>
            <tr className="border-b-2 border-[var(--pt-primary)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Código / Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Contaminantes</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Partic.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Creada</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rondas.map((round) => (
              <RondaRow key={round.id} round={round} editando={editando} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RondaRow({ round, editando }: { round: Ronda; editando: EditandoParam }) {
  const isEditing = editando === round.id
  const canEdit = round.estado !== 'cerrada'

  return (
    <>
      <tr className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-muted)]">
        <td className="px-4 py-4">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusClasses(round.estado)}`}
          >
            {round.estado}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="font-medium text-sm text-[var(--foreground)]">{round.nombre}</div>
          <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{round.codigo}</div>
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-wrap gap-1">
            {round.contaminantes.length === 0 ? (
              <span className="text-xs text-[var(--foreground-muted)]">—</span>
            ) : (
              round.contaminantes.map((c) => (
                <span
                  key={c.id}
                  className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--foreground-muted)]"
                >
                  {c.contaminante}
                </span>
              ))
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          <span className="numeric text-sm text-[var(--foreground)]">
            {round.participantes_asignados ?? 0}/{round.participantes_planeados ?? 0}
          </span>
        </td>
        <td className="px-4 py-4 text-xs text-[var(--foreground-muted)] whitespace-nowrap">
          {formatDate(round.created_at)}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard/rondas/${round.id}`}
              className="btn-primary px-3 py-1 text-xs"
            >
              Abrir
            </Link>
            {canEdit && (
              <Link
                href={`/dashboard?tab=rondas&editando=${round.id}`}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-muted)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)] hover:text-[var(--foreground)]"
              >
                Editar
              </Link>
            )}
            <StatusAction round={round} />
            <form action={deleteRondaAction}>
              <input type="hidden" name="ronda_id" value={round.id} />
              <ConfirmSubmitButton
                type="submit"
                message={`¿Borrar la ronda ${round.codigo}? Esta acción no se puede deshacer.`}
                className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800"
              >
                Borrar
              </ConfirmSubmitButton>
            </form>
          </div>
        </td>
      </tr>
      {isEditing && canEdit && (
        <tr className="border-b border-[var(--border-soft)]">
          <td colSpan={6} className="px-4 py-4 bg-[var(--surface-muted)]">
            <RondaForm
              action={updateRondaAction}
              title="Editar configuración"
              description="Ajuste el nombre, código y configuración analítica de la ronda."
              submitLabel="Guardar cambios"
              round={round}
            />
          </td>
        </tr>
      )}
    </>
  )
}



function ResultadosGlobalView({ rondas }: { rondas: Ronda[] }) {
  if (rondas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
        No hay rondas creadas todavía.
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem]">
          <thead>
            <tr className="border-b-2 border-[var(--pt-primary)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Ronda</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Contaminantes</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Participantes</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rondas.map((round) => (
              <tr key={round.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusClasses(round.estado)}`}>
                    {round.estado}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-sm text-[var(--foreground)]">{round.nombre}</div>
                  <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{round.codigo}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {round.contaminantes.length === 0 ? (
                      <span className="text-xs text-[var(--foreground-muted)]">—</span>
                    ) : (
                      round.contaminantes.map((c) => (
                        <span key={c.id} className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--foreground-muted)]">
                          {c.contaminante}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="numeric text-sm text-[var(--foreground)]">
                    {round.participantes_asignados ?? 0}/{round.participantes_planeados ?? 0}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <RowActionLink href={`/dashboard/rondas/${round.id}/resultados`}>
                    Ver resultados →
                  </RowActionLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Global Participants View (lab index) ───────────────────────────── */
function ParticipantesGlobalView({
  participantes,
}: {
  participantes: ParticipanteGlobal[]
}) {
  if (participantes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
        No hay participantes registrados en ninguna ronda todavía.
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--border-soft)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Índice de laboratorios</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          {participantes.length} laboratorio{participantes.length !== 1 ? 's' : ''} registrado{participantes.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem]">
          <thead>
            <tr className="border-b-2 border-[var(--pt-primary)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Rondas activas
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Envíos PT totales
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {participantes.map((p) => {
              const rondasActivas = p.rondas.filter((r) => r.estado === 'activa')
              const rondaMasReciente = rondasActivas[rondasActivas.length - 1] ?? p.rondas[p.rondas.length - 1]

              return (
                <tr key={p.workos_user_id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-[var(--foreground)]">{p.email}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {p.rondas.map((r) => (
                        <span
                          key={r.id}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClasses(r.estado)}`}
                        >
                          {r.codigo}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="numeric rounded-full bg-[var(--pt-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                      {rondasActivas.length}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="numeric text-sm text-[var(--foreground)]">
                      {p.total_envios}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {rondaMasReciente ? (
                      <Link
                        href={`/dashboard/rondas/${rondaMasReciente.id}/participantes`}
                        className="inline-flex items-center rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
                      >
                        Abrir ronda →
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--foreground-muted)]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
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

function FichaBadge({ estado }: { estado: RondaParticipanteAsignada['ficha_estado'] }) {
  if (estado === 'enviado') {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Ficha enviada ✓
      </span>
    )
  }
  if (estado === 'borrador') {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Ficha en borrador
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Ficha no iniciada
    </span>
  )
}

function RondaParticipanteCard({ ronda }: { ronda: RondaParticipanteAsignada }) {
  const esActiva = ronda.estado === 'activa'
  const fichaEnviada = ronda.ficha_estado === 'enviado'
  const fichaLabel =
    ronda.ficha_estado === 'enviado'
      ? 'Ver ficha'
      : ronda.ficha_estado === 'borrador'
        ? 'Continuar ficha'
        : 'Diligenciar ficha'
  const puedeCargarDatos = esActiva && fichaEnviada

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
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <FichaBadge estado={ronda.ficha_estado} />
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
            <Link href={`/ronda/${ronda.codigo}/registro`} className="btn-primary self-start">
              {fichaLabel} →
            </Link>

            {puedeCargarDatos ? (
              <Link href={`/ronda/${ronda.codigo}`} className="btn-outline self-start">
                Cargar datos
              </Link>
            ) : (
              <span className="self-start rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
                Cargar datos
              </span>
            )}
          </div>

          {!puedeCargarDatos && (
            <p className="max-w-64 text-left text-xs leading-5 text-[var(--foreground-muted)] sm:text-right">
              {ronda.estado === 'borrador'
                ? 'Diligencie la ficha ahora. La carga de datos se habilita cuando el coordinador active la ronda.'
                : fichaEnviada
                  ? 'La carga de datos no está disponible para esta ronda.'
                  : 'Complete la ficha para habilitar el ingreso de resultados.'}
            </p>
          )}
        </div>
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

/* ─── Coordinator KPI Bar ─────────────────────────────────────────────── */
type CoordinatorKpiBarProps = {
  rondasActivas: number
  rondasBorrador: number
  fichasPendientes: number
  enlacesSinReclamar: number
  rondasListasParaExportar: number
}

function CoordinatorKpiBar({
  rondasActivas,
  rondasBorrador,
  fichasPendientes,
  enlacesSinReclamar,
  rondasListasParaExportar,
}: CoordinatorKpiBarProps) {
  const kpis = [
    { label: 'Rondas activas', value: rondasActivas, href: '/dashboard?tab=rondas', negative: false },
    { label: 'Fichas pendientes', value: fichasPendientes, href: '/dashboard?tab=participantes', negative: true },
    { label: 'Cupos sin reclamar', value: enlacesSinReclamar, href: '/dashboard?tab=participantes', negative: true },
    { label: 'Listas para exportar', value: rondasListasParaExportar, href: '/dashboard?tab=resultados', negative: false },
    { label: 'En borrador', value: rondasBorrador, href: '/dashboard?tab=rondas', negative: false },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map(({ label, value, href, negative }) => (
        <Link
          key={label}
          href={href}
          className={`card-accent flex flex-col gap-1 px-5 py-4 transition hover:border-[var(--pt-primary)] ${
            value > 0 && negative ? 'border-amber-300 bg-amber-50/50' : ''
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
            {label}
          </span>
          <span className={`numeric text-3xl font-semibold ${
            value > 0 && negative ? 'text-amber-700' : 'text-[var(--foreground)]'
          }`}>
            {value}
          </span>
        </Link>
      ))}
    </div>
  )
}

/* ─── Attention List ─────────────────────────────────────────────────── */
function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
        Requiere atención
      </h2>
      <ul className="grid gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition hover:border-[var(--pt-primary)] ${
                item.severity === 'warning'
                  ? 'border-amber-200 bg-amber-50/60 text-amber-800'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'
              }`}
            >
              <span>{item.message}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                item.severity === 'warning'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-[var(--pt-primary-subtle)] text-[var(--foreground)]'
              }`}>
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ─── Estado Operativo Badge ─────────────────────────────────────────── */
const estadoColorClasses: Record<EstadoOperativo['color'], string> = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  slate: 'bg-slate-200 text-slate-700',
  violet: 'bg-violet-100 text-violet-800',
}

function EstadoOperativoBadge({ estado }: { estado: EstadoOperativo }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap ${estadoColorClasses[estado.color]}`}>
      {estado.label}
    </span>
  )
}

/* ─── Mini Progress Bar ──────────────────────────────────────────────── */
function MiniProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="mt-1 h-1.5 w-full max-w-[5rem] rounded-full bg-[var(--border)]" title={`${pct}%`}>
      <div
        className="h-full rounded-full bg-[var(--pt-primary)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ─── Rondas en Curso (inicio view) ──────────────────────────────────── */
function RondasEnCurso({
  rondasActivas,
  participantesPorRonda,
}: {
  rondasActivas: Ronda[]
  participantesPorRonda: ParticipanteRondaResumen[][]
}) {
  if (rondasActivas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
        No hay rondas activas en este momento.
      </div>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
        Rondas en curso
      </h2>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem]">
            <thead>
              <tr className="border-b-2 border-[var(--pt-primary)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Ronda</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Cupos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Fichas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Envíos PT</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]"></th>
              </tr>
            </thead>
            <tbody>
              {rondasActivas.map((ronda, i) => {
                const participantes = participantesPorRonda[i] ?? []
                const estado = derivarEstadoOperativo(ronda, participantes)
                const fichasEnviadas = participantes.filter((p) => p.ficha_estado === 'enviado').length
                const totalEnviosPT = participantes.reduce((sum, p) => sum + p.envios_pt_count, 0)
                return (
                  <tr key={ronda.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-muted)]">
                    <td className="px-4 py-4">
                      <EstadoOperativoBadge estado={estado} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-sm text-[var(--foreground)]">{ronda.nombre}</div>
                      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{ronda.codigo}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="numeric text-sm text-[var(--foreground)]">
                        {ronda.participantes_asignados ?? 0}/{ronda.participantes_planeados ?? 0}
                      </span>
                      <MiniProgressBar current={ronda.participantes_asignados ?? 0} total={ronda.participantes_planeados ?? 0} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="numeric text-sm text-[var(--foreground)]">
                        {fichasEnviadas}/{participantes.length}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="numeric text-sm text-[var(--foreground)]">{totalEnviosPT}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/dashboard/rondas/${ronda.id}`}
                        className="inline-flex items-center rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
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
  const activeTab = getParamValue(params.tab) ?? 'inicio'
  const editando = getParamValue(params.editando) ?? ''

  const rondas = admin ? await listRondas() : []
  const allParticipantes = admin ? await listAllParticipantes() : []
  const rondasParticipante = !admin ? await listRondasParticipante(auth.user.id) : []

  const rondasActivas = rondas.filter((r) => r.estado === 'activa')
  const participantesRondasActivas = admin
    ? await Promise.all(rondasActivas.map((r) => listParticipantesRondaResumen(r.id)))
    : []
  const fichasPendientesCount = participantesRondasActivas
    .flat()
    .filter((p) => p.ficha_estado !== 'enviado').length

  // Derived metrics for the coordinator work tray
  const enlacesSinReclamar = participantesRondasActivas
    .flat()
    .filter((p) => p.estado === 'pendiente').length
  const rondasListasParaExportar = rondasActivas.filter((_, i) =>
    participantesRondasActivas[i]?.some((p) => p.envios_pt_count > 0)
  ).length
  const attentionItems = admin
    ? buildAttentionItems(rondas, participantesRondasActivas)
    : []

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <LogoUnal height={32} />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                  CALAIRE APP
                </p>
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  Dashboard de rondas de ensayo
                </h1>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {auth.user.email} · {admin ? 'Coordinador' : 'Participante'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {admin && (
                <Link
                  href="/dashboard/rondas/nueva"
                  className="btn-primary"
                >
                  ＋ Nueva ronda
                </Link>
              )}
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
          </div>
        </header>

        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        {!admin ? (
          <ParticipanteView rondas={rondasParticipante} />
        ) : (
          <div className="grid gap-6">
            {/* ── KPI bar ───────────────────────────────────────── */}
            <CoordinatorKpiBar
              rondasActivas={rondasActivas.length}
              rondasBorrador={rondas.filter((r) => r.estado === 'borrador').length}
              fichasPendientes={fichasPendientesCount}
              enlacesSinReclamar={enlacesSinReclamar}
              rondasListasParaExportar={rondasListasParaExportar}
            />

            {/* ── Vista de inicio: bandeja de trabajo ─────────── */}
            {activeTab === 'inicio' && (
              <>
                <AttentionList items={attentionItems} />
                <RondasEnCurso
                  rondasActivas={rondasActivas}
                  participantesPorRonda={participantesRondasActivas}
                />
                {/* PT App link at the bottom of work tray */}
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
              </>
            )}

            {/* ── Tab rondas: lista completa ──────────────────── */}
            {activeTab === 'rondas' && (
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {rondas.length} ronda{rondas.length !== 1 ? 's' : ''} registrada{rondas.length !== 1 ? 's' : ''}
                  </p>
                  <Link href="/dashboard/rondas/nueva" className="btn-primary">
                    ＋ Nueva ronda
                  </Link>
                </div>
                <RondasTable rondas={rondas} editando={editando} />
              </div>
            )}

            {activeTab === 'participantes' && (
              <ParticipantesGlobalView
                participantes={allParticipantes}
              />
            )}

            {activeTab === 'resultados' && <ResultadosGlobalView rondas={rondas} />}
          </div>
        )}
      </div>
    </div>
  )
}
