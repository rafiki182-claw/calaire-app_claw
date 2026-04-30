import { notFound, redirect } from 'next/navigation'

import { requireAuth, isAdmin } from '@/lib/auth'
import {
  getRonda,
  listPTItems,
  listParticipantesPT,
  type RondaPTItem,
  type RondaParticipantePT,
} from '@/lib/rondas'
import { RondaContextNav } from '../RondaContextNav'
import { Alert } from '@/app/(protected)/dashboard/components/Alert'
import { EstadoBadge } from '@/app/(protected)/dashboard/components/EstadoBadge'
import {
  updateParticipantePTAction,
  deletePTItemAction,
} from './actions'
import { PTLevelsBulkForm } from './PTLevelsBulkForm'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
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

function ParticipantePTRow({ participante, canEdit }: { participante: RondaParticipantePT; canEdit: boolean }) {
  return (
    <tr className="border-b border-[var(--border-soft)] last:border-0">
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{participante.email}</td>
      <td className="py-3 pr-4">
        {canEdit ? (
          <form action={updateParticipantePTAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="ronda_id" value={participante.ronda_id} />
            <input type="hidden" name="participante_id" value={participante.id} />
            <label className="grid gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Código
              </span>
              <input
                type="text"
                name="participant_code"
                defaultValue={participante.participant_code ?? ''}
                placeholder="Auto"
                className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Réplica
              </span>
              <input
                type="number"
                name="replicate_code"
                defaultValue={participante.replicate_code ?? ''}
                placeholder="1"
                min="1"
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
              />
            </label>
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
  const participantesPT = await listParticipantesPT(rondaId)

  const sp = searchParams ? await searchParams : {}
  const success = getParam(sp.success)
  const error = getParam(sp.error)

  const canEdit = ronda.estado !== 'cerrada'

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
              Configure los parámetros PT para generar el CSV compatible con pt_app
            </p>
          </div>
        </header>

        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        <div className="grid gap-6">
          <section className="card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Configurar niveles PT</h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                Cargue varios niveles para un contaminante. El grupo de muestra se usa internamente como A.
              </p>
            </div>

            {canEdit && (
              <PTLevelsBulkForm
                rondaId={rondaId}
                contaminantes={ronda.contaminantes.map((c) => c.contaminante)}
              />
            )}

            {ptItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--foreground-muted)]">
                No hay niveles PT definidos.
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

        </div>

        <section className="card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Códigos de participantes PT</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              El código analítico (participant_id) se genera automáticamente. Use esta edición solo como respaldo administrativo; la réplica completa la exportación CSV.
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
                      Código / Réplica
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
