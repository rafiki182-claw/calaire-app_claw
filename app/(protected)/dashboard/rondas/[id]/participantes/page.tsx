import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { buildAbsoluteAppUrl } from '@/lib/app-url'
import { requireAuth, isAdmin } from '@/lib/auth'
import { getRonda, listParticipantes, type RondaParticipante, type Ronda } from '@/lib/rondas'
import {
  addReferenceSlotAction,
  inviteParticipanteAction,
  lookupUserAction,
  removeParticipanteAction,
  regenerateSlotAction,
  createAndInviteAction,
} from './actions'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
}

function Alert({ tone, message }: { tone: 'error' | 'success'; message?: string }) {
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

function estadoBadge(ronda: Ronda) {
  const classes =
    ronda.estado === 'activa'
      ? 'bg-emerald-100 text-emerald-800'
      : ronda.estado === 'cerrada'
        ? 'bg-slate-200 text-slate-700'
        : 'bg-amber-100 text-amber-800'
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] ${classes}`}
    >
      {ronda.estado}
    </span>
  )
}

function participanteBadge(participante: RondaParticipante) {
  if (participante.estado === 'asignado') {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Reclamado
      </span>
    )
  }

  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      Pendiente
    </span>
  )
}

function participantProfileBadge(participante: RondaParticipante) {
  if (participante.participant_profile === 'member_special') {
    return (
      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
        Referencia
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      Participante
    </span>
  )
}

function SearchForm({
  rondaId,
  currentEmail,
}: {
  rondaId: string
  currentEmail?: string
}) {
  return (
    <form action={lookupUserAction} className="flex gap-2">
      <input type="hidden" name="ronda_id" value={rondaId} />
      <input
        type="email"
        name="email"
        required
        defaultValue={currentEmail ?? ''}
        placeholder="correo@laboratorio.com"
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-0"
      />
      <button type="submit" className="btn-outline">
        Buscar
      </button>
    </form>
  )
}

function FoundUserCard({
  rondaId,
  foundId,
  foundEmail,
  foundName,
  canInvite,
}: {
  rondaId: string
  foundId: string
  foundEmail: string
  foundName: string
  canInvite: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-semibold text-[var(--foreground)]">{foundName}</div>
        <div className="text-[var(--foreground-muted)]">{foundEmail}</div>
        <div className="numeric mt-0.5 text-xs text-[var(--foreground-muted)]">{foundId}</div>
      </div>
      {canInvite ? (
        <form action={inviteParticipanteAction}>
          <input type="hidden" name="ronda_id" value={rondaId} />
          <input type="hidden" name="workos_user_id" value={foundId} />
          <input type="hidden" name="email" value={foundEmail} />
          <button type="submit" className="btn-primary">
            Agregar a la ronda
          </button>
        </form>
      ) : (
        <span className="text-xs text-[var(--foreground-muted)]">Ronda cerrada — no se admiten cambios.</span>
      )}
    </div>
  )
}

function ParticipanteRow({
  participante,
  canEdit,
  rondaCodigo,
}: {
  participante: RondaParticipante
  canEdit: boolean
  rondaCodigo: string
}) {
  const tieneEnvios = participante.envios_count > 0
  const enlace =
    participante.slot_token != null
      ? buildAbsoluteAppUrl(`/ronda/${rondaCodigo}?token=${participante.slot_token}`)
      : null

  return (
    <tr className="border-b border-[var(--border-soft)] last:border-0">
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{participante.email}</td>
      <td className="py-3 pr-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {participantProfileBadge(participante)}
          {participanteBadge(participante)}
        </div>
      </td>
      <td className="py-3 pr-4 text-sm">
        {tieneEnvios ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {participante.envios_count} envío{participante.envios_count !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground-muted)]">
            Pendiente
          </span>
        )}
      </td>
      <td className="py-3 pr-4 text-xs text-[var(--foreground-muted)]">
        {enlace ? (
          <a href={enlace} className="numeric text-[11px] text-[var(--foreground)] hover:text-[var(--pt-primary-dark)]">
            {enlace}
          </a>
        ) : (
          <span>Ya reclamado</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground-muted)]">{formatDate(participante.invitado_at)}</td>
      <td className="py-3 text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-3">
            <form action={regenerateSlotAction} className="inline">
              <input type="hidden" name="ronda_id" value={participante.ronda_id} />
              <input type="hidden" name="participante_id" value={participante.id} />
              <button
                type="submit"
                className="text-xs text-amber-600 transition hover:text-amber-800"
              >
                Regenerar
              </button>
            </form>
            <form action={removeParticipanteAction} className="inline">
              <input type="hidden" name="ronda_id" value={participante.ronda_id} />
              <input type="hidden" name="participante_id" value={participante.id} />
              <button
                type="submit"
                className="text-xs text-rose-600 transition hover:text-rose-800"
              >
                Eliminar
              </button>
            </form>
          </div>
        )}
      </td>
    </tr>
  )
}

export default async function ParticipantesPage({ params, searchParams }: PageProps) {
  const auth = await requireAuth()
  if (!auth.user) redirect('/login')
  if (!isAdmin(auth)) redirect('/denied?reason=role')

  const { id: rondaId } = await params
  const ronda = await getRonda(rondaId)
  if (!ronda) notFound()

  const participantes = await listParticipantes(rondaId)

  const sp = searchParams ? await searchParams : {}
  const success = getParam(sp.success)
  const error = getParam(sp.error)
  const busquedaEmail = getParam(sp.busqueda_email)
  const notFound_ = getParam(sp.not_found) === '1'
  const foundId = getParam(sp.found_id)
  const foundEmail = getParam(sp.found_email)
  const foundName = getParam(sp.found_name)

  const canEdit = ronda.estado !== 'cerrada'
  const cuposPendientes = participantes.filter((item) => item.estado === 'pendiente').length
  const cuposAsignados = participantes.length - cuposPendientes
  const referencias = participantes.filter((item) => item.participant_profile === 'member_special')
  const participantesNormales = participantes.length - referencias.length

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
              >
                CALAIRE-EA
              </Link>
              <span className="text-[var(--border)]">/</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                Participantes
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">{ronda.nombre}</h1>
              {estadoBadge(ronda)}
            </div>
            <p className="text-sm text-[var(--foreground-muted)]">
              Código <span className="font-medium text-[var(--foreground)]">{ronda.codigo}</span> ·{' '}
              {participantes.length} participante{participantes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="mt-4">
            <Link
              href={`/dashboard/rondas/${rondaId}/resultados`}
              className="btn-outline"
            >
              Ver resultados →
            </Link>
          </div>
        </header>

        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        <section className="card grid gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Enlaces formales por participante</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              La ronda quedó con enlaces individuales listos para compartir. El primer ingreso con
              cada enlace reclamará el cupo correspondiente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
              <div className="text-[var(--foreground-muted)]">Cupos totales</div>
              <div className="mt-1 text-xl font-semibold text-[var(--foreground)]">{participantes.length}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <div className="text-amber-700">Pendientes</div>
              <div className="mt-1 text-xl font-semibold text-amber-900">{cuposPendientes}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <div className="text-emerald-700">Reclamados</div>
              <div className="mt-1 text-xl font-semibold text-emerald-900">{cuposAsignados}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div className="text-slate-700">Participantes</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{participantesNormales}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
              <div className="text-sky-700">Referencias</div>
              <div className="mt-1 text-xl font-semibold text-sky-900">{referencias.length}</div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            Si necesita agregar un caso extraordinario fuera de los cupos planeados, puede seguir
            usando la búsqueda manual por correo.
          </div>

          {canEdit && referencias.length === 0 && (
            <form action={addReferenceSlotAction}>
              <input type="hidden" name="ronda_id" value={rondaId} />
              <button type="submit" className="btn-outline">
                Agregar referencia (member special)
              </button>
            </form>
          )}

          {referencias.length > 0 && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Esta ronda ya tiene referencia configurada.
            </div>
          )}

          <SearchForm rondaId={rondaId} currentEmail={busquedaEmail} />

          {busquedaEmail && notFound_ && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                No se encontró ningún usuario con el correo <strong>{busquedaEmail}</strong> en
                WorkOS. Puede crearlo e invitarlo directamente:
              </p>
              <form action={createAndInviteAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="ronda_id" value={rondaId} />
                <input type="hidden" name="email" value={busquedaEmail} />
                <input
                  type="text"
                  name="first_name"
                  placeholder="Nombre (opcional)"
                  className="rounded-lg border border-amber-300 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-0"
                />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Apellido (opcional)"
                  className="rounded-lg border border-amber-300 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-0"
                />
                <button type="submit" className="btn-primary">
                  Crear e invitar
                </button>
              </form>
            </div>
          )}

          {foundId && foundEmail && (
            <FoundUserCard
              rondaId={rondaId}
              foundId={foundId}
              foundEmail={foundEmail}
              foundName={foundName ?? foundEmail}
              canInvite={canEdit}
            />
          )}
        </section>

        <section className="card p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Participantes asignados</h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                Estado de envíos por laboratorio en esta ronda.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--pt-primary-subtle)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              {participantes.length}
            </div>
          </div>

          {participantes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center text-sm text-[var(--foreground-muted)]">
              No hay participantes asignados. Use el buscador para agregar laboratorios.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem]">
                <thead>
                  <tr className="border-b-2 border-[var(--pt-primary)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Participante / correo
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Estado
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Envíos
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Enlace
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Invitado
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participantes.map((p) => (
                    <ParticipanteRow
                      key={p.id}
                      participante={p}
                      canEdit={canEdit}
                      rondaCodigo={ronda.codigo}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!canEdit && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            La ronda está cerrada. La lista de participantes es de solo lectura.
          </div>
        )}
      </div>
    </div>
  )
}
