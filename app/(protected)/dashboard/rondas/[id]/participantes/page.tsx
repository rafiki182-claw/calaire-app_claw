import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { buildAbsoluteAppUrl } from '@/lib/app-url'
import { requireAuth, isAdmin } from '@/lib/auth'
import {
  getRonda,
  listPTItems,
  listParticipantesRondaResumen,
  filtrarParticipantes,
  type ParticipanteRondaResumen,
  type FiltroParticipante,
} from '@/lib/rondas'
import { RondaContextNav } from '../RondaContextNav'
import { Alert } from '@/app/(protected)/dashboard/components/Alert'
import { EstadoBadge } from '@/app/(protected)/dashboard/components/EstadoBadge'
import { CopyInvitationLinkButton } from '@/app/(protected)/dashboard/components/CopyInvitationLinkButton'
import { ConfirmSubmitButton } from '@/app/(protected)/dashboard/components/ConfirmSubmitButton'
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


function perfilBadge(p: ParticipanteRondaResumen) {
  if (p.participant_profile === 'member_special') {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
        Referencia
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
      Participante
    </span>
  )
}

function fichaEstadoBadge(p: ParticipanteRondaResumen, rondaId: string) {
  if (p.ficha_estado === 'enviado') {
    return (
      <Link
        href={`/dashboard/rondas/${rondaId}/participantes/${p.ronda_participante_id}/ficha`}
        className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 transition hover:opacity-80"
      >
        Enviada ✓
      </Link>
    )
  }
  if (p.ficha_estado === 'borrador') {
    return (
      <Link
        href={`/dashboard/rondas/${rondaId}/participantes/${p.ronda_participante_id}/ficha`}
        className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 transition hover:opacity-80"
      >
        Borrador
      </Link>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      No iniciada
    </span>
  )
}

/* ─── Filtro Bar ─────────────────────────────────────────────────────── */

type FiltroItem = {
  valor: FiltroParticipante
  label: string
  count: number
}

function FiltroBar({
  filtros,
  filtroActivo,
  rondaId,
}: {
  filtros: FiltroItem[]
  filtroActivo: FiltroParticipante
  rondaId: string
}) {
  return (
    <nav className="flex flex-wrap gap-1.5">
      {filtros.map(({ valor, label, count }) => {
        const isActive = filtroActivo === valor
        const isDisabled = count === 0 && valor !== 'todos'
        const href =
          valor === 'todos'
            ? `/dashboard/rondas/${rondaId}/participantes`
            : `/dashboard/rondas/${rondaId}/participantes?filtro=${valor}`

        if (isDisabled) {
          return (
            <span
              key={valor}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground-muted)] opacity-40"
            >
              {label} <span className="numeric">{count}</span>
            </span>
          )
        }

        return (
          <Link
            key={valor}
            href={href}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? 'border-[var(--pt-primary)] bg-[var(--pt-primary-subtle)] text-[var(--foreground)]'
                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--pt-primary)] hover:bg-[var(--pt-primary-subtle)]'
            }`}
          >
            {label} <span className="numeric">{count}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/* ─── Resumen Strip ──────────────────────────────────────────────────── */

function ResumenStrip({
  totalCupos,
  enlacesPendientes,
  cuposReclamados,
  fichasPendientes,
  fichasEnviadas,
  conEnvios,
  rondaId,
}: {
  totalCupos: number
  enlacesPendientes: number
  cuposReclamados: number
  fichasPendientes: number
  fichasEnviadas: number
  conEnvios: number
  rondaId: string
}) {
  const cards = [
    { label: 'Total cupos', value: totalCupos, filtro: 'todos' as const, color: '' },
    { label: 'Enlace pendiente', value: enlacesPendientes, filtro: 'enlace_pendiente' as const, color: enlacesPendientes > 0 ? 'border-amber-200 bg-amber-50' : '' },
    { label: 'Reclamados', value: cuposReclamados, filtro: 'todos' as const, color: cuposReclamados > 0 ? 'border-emerald-200 bg-emerald-50' : '' },
    { label: 'Ficha pendiente', value: fichasPendientes, filtro: 'ficha_pendiente' as const, color: fichasPendientes > 0 ? 'border-amber-200 bg-amber-50' : '' },
    { label: 'Ficha enviada', value: fichasEnviadas, filtro: 'ficha_enviada' as const, color: fichasEnviadas > 0 ? 'border-emerald-200 bg-emerald-50' : '' },
    { label: 'Con envíos PT', value: conEnvios, filtro: 'con_envios' as const, color: conEnvios > 0 ? 'border-blue-200 bg-blue-50' : '' },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map(({ label, value, filtro, color }) => {
        const href =
          filtro === 'todos'
            ? `/dashboard/rondas/${rondaId}/participantes`
            : `/dashboard/rondas/${rondaId}/participantes?filtro=${filtro}`
        return (
          <Link
            key={label}
            href={href}
            className={`rounded-xl border px-4 py-3 text-sm transition hover:border-[var(--pt-primary)] ${
              color || 'border-[var(--border)] bg-[var(--surface-muted)]'
            }`}
          >
            <div className="text-[11px] font-medium text-[var(--foreground-muted)]">{label}</div>
            <div className="numeric mt-0.5 text-xl font-semibold text-[var(--foreground)]">
              {value}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

/* ─── Participante Row ───────────────────────────────────────────────── */

function ParticipanteRow({
  p,
  canEdit,
  rondaCodigo,
  rondaId,
}: {
  p: ParticipanteRondaResumen
  canEdit: boolean
  rondaCodigo: string
  rondaId: string
}) {
  const enlace =
    p.slot_token != null
      ? buildAbsoluteAppUrl(`/ronda/${rondaCodigo}?token=${p.slot_token}`)
      : null

  return (
    <tr className="border-b border-[var(--border-soft)] last:border-0">
      {/* Col 1: Cupo */}
      <td className="py-3 pr-4">
        <div className="text-sm font-medium text-[var(--foreground)]">{p.email}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground-muted)]">
            Código{' '}
            <span className="numeric font-semibold text-[var(--foreground)]">
              {p.participant_code ?? 'pendiente'}
            </span>
          </span>
          {perfilBadge(p)}
        </div>
      </td>

      {/* Col 2: Enlace */}
      <td className="py-3 pr-4 text-sm">
        {p.estado === 'pendiente' && enlace ? (
          <CopyInvitationLinkButton url={enlace} />
        ) : p.estado === 'reclamado' ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Reclamado
          </span>
        ) : (
          <span className="text-xs text-[var(--foreground-muted)]">—</span>
        )}
      </td>

      {/* Col 3: Ficha */}
      <td className="py-3 pr-4 text-sm">
        {fichaEstadoBadge(p, rondaId)}
      </td>

      {/* Col 4: Envíos PT */}
      <td className="py-3 pr-4 text-sm">
        {p.envios_pt_count > 0 ? (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            {p.envios_pt_count} envío{p.envios_pt_count !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground-muted)]">
            Sin envíos
          </span>
        )}
      </td>

      {/* Col 5: Acciones */}
      <td className="py-3 text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            <form action={regenerateSlotAction} className="inline">
              <input type="hidden" name="ronda_id" value={rondaId} />
              <input type="hidden" name="participante_id" value={p.ronda_participante_id} />
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--foreground-muted)] transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
              >
                Regenerar
              </button>
            </form>
            <form action={removeParticipanteAction} className="inline">
              <input type="hidden" name="ronda_id" value={rondaId} />
              <input type="hidden" name="participante_id" value={p.ronda_participante_id} />
              <ConfirmSubmitButton
                type="submit"
                message={`¿Eliminar a ${p.email} de esta ronda?`}
                className="rounded-lg border border-rose-200 bg-rose-50/50 px-2 py-1 text-xs text-rose-600 transition hover:border-rose-400 hover:bg-rose-100 hover:text-rose-800"
              >
                Eliminar
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </td>
    </tr>
  )
}

/* ─── Search Form ────────────────────────────────────────────────────── */

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

/* ─── Page ────────────────────────────────────────────────────────────── */

export default async function ParticipantesPage({ params, searchParams }: PageProps) {
  const auth = await requireAuth()
  if (!auth.user) redirect('/login')
  if (!isAdmin(auth)) redirect('/denied?reason=role')

  const { id: rondaId } = await params
  const ronda = await getRonda(rondaId)
  if (!ronda) notFound()

  const ptItems = await listPTItems(rondaId)
  if (ptItems.length === 0) {
    redirect(`/dashboard/rondas/${rondaId}/configuracion-pt?error=${encodeURIComponent('Configure los niveles PT antes de gestionar participantes.')}`)
  }

  // Single consolidated query — no more dual listParticipantes + listFichaResumenesByRonda
  const participantes = await listParticipantesRondaResumen(rondaId)

  const sp = searchParams ? await searchParams : {}
  const success = getParam(sp.success)
  const error = getParam(sp.error)
  const busquedaEmail = getParam(sp.busqueda_email)
  const notFound_ = getParam(sp.not_found) === '1'
  const foundId = getParam(sp.found_id)
  const foundEmail = getParam(sp.found_email)
  const foundName = getParam(sp.found_name)

  const validFiltros: FiltroParticipante[] = [
    'todos',
    'enlace_pendiente',
    'ficha_pendiente',
    'ficha_enviada',
    'con_envios',
    'sin_envios',
  ]
  const rawFiltro = getParam(sp.filtro) ?? 'todos'
  const filtroActivo: FiltroParticipante = validFiltros.includes(rawFiltro as FiltroParticipante)
    ? (rawFiltro as FiltroParticipante)
    : 'todos'
  const participantesFiltrados = filtrarParticipantes(participantes, filtroActivo)

  const canEdit = ronda.estado !== 'cerrada'

  // Metrics (computed from full list, not filtered)
  const totalCupos = participantes.length
  const enlacesPendientes = participantes.filter((p) => p.estado === 'pendiente').length
  const cuposReclamados = participantes.filter((p) => p.estado === 'reclamado').length
  const fichasPendientes = participantes.filter(
    (p) => p.estado === 'reclamado' && p.ficha_estado !== 'enviado'
  ).length
  const fichasEnviadas = participantes.filter((p) => p.ficha_estado === 'enviado').length
  const conEnvios = participantes.filter((p) => p.envios_pt_count > 0).length

  const referencias = participantes.filter((p) => p.participant_profile === 'member_special')

  // Filter bar items
  const filtros: FiltroItem[] = [
    { valor: 'todos', label: 'Todos', count: totalCupos },
    { valor: 'enlace_pendiente', label: 'Enlace pendiente', count: enlacesPendientes },
    { valor: 'ficha_pendiente', label: 'Ficha pendiente', count: fichasPendientes },
    { valor: 'ficha_enviada', label: 'Ficha enviada', count: fichasEnviadas },
    { valor: 'con_envios', label: 'Con envíos PT', count: conEnvios },
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Context Navigation */}
        <RondaContextNav rondaId={rondaId} rondaCodigo={ronda.codigo} ptConfigurado={ptItems.length > 0} />

        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">{ronda.nombre}</h1>
              <EstadoBadge estado={ronda.estado} />
            </div>
            <p className="text-sm text-[var(--foreground-muted)]">
              Código <span className="font-medium text-[var(--foreground)]">{ronda.codigo}</span> ·{' '}
              {participantes.length} cupo{participantes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </header>

        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        {/* Resumen metrics strip */}
        <ResumenStrip
          totalCupos={totalCupos}
          enlacesPendientes={enlacesPendientes}
          cuposReclamados={cuposReclamados}
          fichasPendientes={fichasPendientes}
          fichasEnviadas={fichasEnviadas}
          conEnvios={conEnvios}
          rondaId={rondaId}
        />

        {/* Filter bar */}
        <FiltroBar filtros={filtros} filtroActivo={filtroActivo} rondaId={rondaId} />

        {/* Participants table */}
        <section className="card p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Cupos asignados</h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                {filtroActivo !== 'todos'
                  ? `Mostrando ${participantesFiltrados.length} de ${totalCupos} (filtro: ${filtros.find((f) => f.valor === filtroActivo)?.label ?? filtroActivo})`
                  : `Estado de cupos, fichas y envíos PT por laboratorio.`}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--pt-primary-subtle)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              {participantesFiltrados.length}
            </div>
          </div>

          {participantesFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center text-sm text-[var(--foreground-muted)]">
              {filtroActivo !== 'todos'
                ? 'No hay participantes que coincidan con este filtro.'
                : 'No hay participantes asignados. Use la sección de abajo para agregar laboratorios.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem]">
                <thead>
                  <tr className="border-b-2 border-[var(--pt-primary)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Cupo
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Enlace
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Ficha
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Envíos PT
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participantesFiltrados.map((p) => (
                    <ParticipanteRow
                      key={p.ronda_participante_id}
                      p={p}
                      canEdit={canEdit}
                      rondaCodigo={ronda.codigo}
                      rondaId={rondaId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Collapsible add participant section */}
        {canEdit && (
          <details open={participantes.length === 0} className="card overflow-hidden p-0">
            <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
              ＋ Agregar participante
            </summary>
            <div className="grid gap-4 border-t border-[var(--border-soft)] p-6">
              {referencias.length === 0 && (
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
            </div>
          </details>
        )}

        {!canEdit && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            La ronda está cerrada. La lista de participantes es de solo lectura.
          </div>
        )}
      </div>
    </div>
  )
}
