import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { requireAuth, isAdmin } from '@/lib/auth'
import {
  getRonda,
  listPTItems,
  listPTSampleGroups,
  listParticipantesPT,
  CONTAMINANTES,
  type RondaPTItem,
  type RondaPTSampleGroup,
  type RondaParticipantePT,
} from '@/lib/rondas'
import {
  createPTItemAction,
  createPTSampleGroupAction,
  updateParticipantePTAction,
  deletePTItemAction,
  deletePTSampleGroupAction,
} from './actions'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
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

function estadoBadge(ronda: { estado: string }) {
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

function PTItemRow({ item, canEdit }: { item: RondaPTItem; canEdit: boolean }) {
  return (
    <tr className="border-b border-[var(--border-soft)] last:border-0">
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{item.contaminante}</td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{item.run_code}</td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{item.level_label}</td>
      <td className="py-3 text-right">
        {canEdit && (
          <form action={deletePTItemAction} className="inline">
            <input type="hidden" name="ronda_id" value={item.ronda_id} />
            <input type="hidden" name="item_id" value={item.id} />
            <button type="submit" className="text-xs text-rose-600 transition hover:text-rose-800">
              Eliminar
            </button>
          </form>
        )}
      </td>
    </tr>
  )
}

function SampleGroupRow({ group, canEdit }: { group: RondaPTSampleGroup; canEdit: boolean }) {
  return (
    <tr className="border-b border-[var(--border-soft)] last:border-0">
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{group.sample_group}</td>
      <td className="py-3 text-right">
        {canEdit && (
          <form action={deletePTSampleGroupAction} className="inline">
            <input type="hidden" name="ronda_id" value={group.ronda_id} />
            <input type="hidden" name="group_id" value={group.id} />
            <button type="submit" className="text-xs text-rose-600 transition hover:text-rose-800">
              Eliminar
            </button>
          </form>
        )}
      </td>
    </tr>
  )
}

function ParticipantePTRow({ participante, canEdit }: { participante: RondaParticipantePT; canEdit: boolean }) {
  return (
    <tr className="border-b border-[var(--border-soft)] last:border-0">
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{participante.email}</td>
      <td className="py-3 pr-4">
        {canEdit ? (
          <form action={updateParticipantePTAction} className="flex gap-2">
            <input type="hidden" name="ronda_id" value={participante.ronda_id} />
            <input type="hidden" name="participante_id" value={participante.id} />
            <input
              type="text"
              name="participant_code"
              defaultValue={participante.participant_code ?? ''}
              placeholder="Código PT"
              className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
            />
            <input
              type="number"
              name="replicate_code"
              defaultValue={participante.replicate_code ?? ''}
              placeholder="Réplica"
              min="1"
              className="w-16 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
            />
            <button type="submit" className="btn-primary text-xs px-3 py-1">
              Guardar
            </button>
          </form>
        ) : (
          <span className="text-sm text-[var(--foreground-muted)]">
            {participante.participant_code ?? '-'} / {participante.replicate_code ?? '-'}
          </span>
        )}
      </td>
      <td className="py-3 text-xs text-[var(--foreground-muted)]">
        {participante.claimed_at ? new Date(participante.claimed_at).toLocaleDateString('es-CO') : 'No reclamado'}
      </td>
    </tr>
  )
}

export default async function ConfiguracionPTPage({ params, searchParams }: PageProps) {
  const auth = await requireAuth()
  if (!auth.user) redirect('/login')
  if (!isAdmin(auth)) redirect('/denied?reason=role')

  const { id: rondaId } = await params
  const ronda = await getRonda(rondaId)
  if (!ronda) notFound()

  const ptItems = await listPTItems(rondaId)
  const sampleGroups = await listPTSampleGroups(rondaId)
  const participantesPT = await listParticipantesPT(rondaId)

  const sp = searchParams ? await searchParams : {}
  const success = getParam(sp.success)
  const error = getParam(sp.error)

  const canEdit = ronda.estado !== 'cerrada'

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
              <Link
                href={`/dashboard/rondas/${rondaId}`}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
              >
                {ronda.codigo}
              </Link>
              <span className="text-[var(--border)]">/</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                Configuración PT
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">{ronda.nombre}</h1>
              {estadoBadge(ronda)}
            </div>
            <p className="text-sm text-[var(--foreground-muted)]">
              Configure los parámetros PT para generar el CSV compatible con pt_app
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/dashboard/rondas/${rondaId}/participantes`} className="btn-outline">
              Participantes
            </Link>
            <Link href={`/dashboard/rondas/${rondaId}/resultados`} className="btn-outline">
              Resultados
            </Link>
          </div>
        </header>

        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Configuración de corridas PT</h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                Defina las combinaciones de run + level para cada contaminante
              </p>
            </div>

            {canEdit && (
              <form action={createPTItemAction} className="mb-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <input type="hidden" name="ronda_id" value={rondaId} />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)] mb-1">
                    Contaminante
                  </label>
                  <select
                    name="contaminante"
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                  >
                    <option value="">Seleccione...</option>
                    {CONTAMINANTES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)] mb-1">
                      Código de corrida (run)
                    </label>
                    <input
                      type="text"
                      name="run_code"
                      required
                      placeholder="Ej: 1, A, R1"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)] mb-1">
                      Nivel (level)
                    </label>
                    <input
                      type="text"
                      name="level_label"
                      required
                      placeholder="Ej: Alto, Bajo, 1"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary">
                  Agregar corrida PT
                </button>
              </form>
            )}

            {ptItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--foreground-muted)]">
                No hay configuraciones PT definidas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[24rem]">
                  <thead>
                    <tr className="border-b-2 border-[var(--pt-primary)]">
                      <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                        Contaminante
                      </th>
                      <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                        Run
                      </th>
                      <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                        Level
                      </th>
                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ptItems.map((item) => (
                      <PTItemRow key={item.id} item={item} canEdit={canEdit} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Grupos de muestra PT</h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                Defina los grupos de muestra reutilizados en todas las corridas
              </p>
            </div>

            {canEdit && (
              <form action={createPTSampleGroupAction} className="mb-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <input type="hidden" name="ronda_id" value={rondaId} />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)] mb-1">
                    Nombre del grupo de muestra
                  </label>
                  <input
                    type="text"
                    name="sample_group"
                    required
                    placeholder="Ej: Grupo A, Muestra 1, Sample 01"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Agregar grupo de muestra
                </button>
              </form>
            )}

            {sampleGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--foreground-muted)]">
                No hay grupos de muestra definidos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[16rem]">
                  <thead>
                    <tr className="border-b-2 border-[var(--pt-primary)]">
                      <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                        Grupo de muestra
                      </th>
                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleGroups.map((group) => (
                      <SampleGroupRow key={group.id} group={group} canEdit={canEdit} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Códigos de participantes PT</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              Asigne los códigos analíticos (participant_id) y códigos de réplica para el CSV
            </p>
          </div>

          {participantesPT.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--foreground-muted)]">
              No hay participantes asignados a esta ronda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem]">
                <thead>
                  <tr className="border-b-2 border-[var(--pt-primary)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Participante / correo
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Código PT / Réplica
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                      Reclamado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participantesPT.map((participante) => (
                    <ParticipantePTRow key={participante.id} participante={participante} canEdit={canEdit} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!canEdit && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            La ronda está cerrada. La configuración PT es de solo lectura.
          </div>
        )}
      </div>
    </div>
  )
}
