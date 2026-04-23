import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { isAdmin, requireAuth } from '@/lib/auth'
import {
  getRonda,
  listPTItems,
  listPTSampleGroups,
  listResultadosPTRonda,
  type ResultadoParticipantePT,
  type Ronda,
} from '@/lib/rondas'

type PageProps = {
  params: Promise<{ id: string }>
}

type ColumnaPT = {
  key: string
  run: string
  level: string
  sampleGroup: string
  contaminante: string
}

function formatDate(value: string | null) {
  if (!value) return 'Sin envío final'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
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

function completitudBadge(resultado: ResultadoParticipantePT) {
  const done = resultado.completados >= resultado.total_esperado && resultado.total_esperado > 0
  return (
    <span
      className={`numeric rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {resultado.completados}/{resultado.total_esperado} ({resultado.porcentaje_completitud}%)
    </span>
  )
}

function getCellMap(resultado: ResultadoParticipantePT) {
  return resultado.celdas.reduce<Record<string, { mean_value: number; sd_value: number }>>((acc, celda) => {
    acc[`${celda.pt_item_id}::${celda.sample_group_id}`] = {
      mean_value: celda.mean_value,
      sd_value: celda.sd_value,
    }
    return acc
  }, {})
}

export default async function ResultadosPage({ params }: PageProps) {
  const auth = await requireAuth()
  if (!auth.user) redirect('/login')
  if (!isAdmin(auth)) redirect('/denied?reason=role')

  const { id: rondaId } = await params
  const ronda = await getRonda(rondaId)
  if (!ronda) notFound()

  const [ptItems, sampleGroups, resultados] = await Promise.all([
    listPTItems(rondaId),
    listPTSampleGroups(rondaId),
    listResultadosPTRonda(rondaId),
  ])

  const columnas: ColumnaPT[] = ptItems.flatMap((item) =>
    sampleGroups.map((group) => ({
      key: `${item.id}::${group.id}`,
      run: item.run_code,
      level: item.level_label,
      sampleGroup: group.sample_group,
      contaminante: item.contaminante,
    }))
  )
  const finalizados = resultados.filter((row) => row.enviados_at != null).length
  const incompletos = resultados.filter((row) => row.completados < row.total_esperado).length
  const canExport = finalizados > 0

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                  href={`/dashboard/rondas/${ronda.id}/participantes`}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
                >
                  Participantes
                </Link>
                <span className="text-[var(--border)]">/</span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                  Resultados PT
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">{ronda.nombre}</h1>
                {estadoBadge(ronda)}
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Código <span className="font-medium text-[var(--foreground)]">{ronda.codigo}</span> ·{' '}
                {resultados.length} participante{resultados.length !== 1 ? 's' : ''} asignado
                {resultados.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/dashboard/rondas/${ronda.id}/configuracion-pt`} className="btn-outline">
                Configuración PT
              </Link>
              {canExport ? (
                <a href={`/dashboard/rondas/${ronda.id}/resultados/export-pt.csv`} className="btn-primary">
                  Exportar CSV PT
                </a>
              ) : (
                <span className="btn-outline cursor-not-allowed opacity-70">
                  Exportar CSV PT (sin envíos finales)
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card-accent p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
              Participantes
            </div>
            <div className="numeric mt-2 text-3xl font-semibold text-[var(--foreground)]">{resultados.length}</div>
          </div>
          <div className="card-accent p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
              Envíos finales
            </div>
            <div className="numeric mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {finalizados}
            </div>
          </div>
          <div className="card-accent p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
              Incompletos
            </div>
            <div className="numeric mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {incompletos}
            </div>
          </div>
        </section>

        {!canExport && resultados.length > 0 && (
          <section className="card p-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              El CSV PT exporta únicamente combinaciones con envío final confirmado.
            </div>
          </section>
        )}

        {columnas.length === 0 ? (
          <section className="card p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No hay columnas PT para revisar. Configura corridas y grupos de muestra en “Configuración PT”.
            </div>
          </section>
        ) : (
          <section className="card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Matriz operativa PT</h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                Vista por participante y combinación exacta (`pollutant`, `run`, `level`, `sample_group`).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1280px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 border-b-2 border-[var(--pt-primary)] bg-[var(--surface)] px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                      Participante
                    </th>
                    <th className="border-b-2 border-[var(--pt-primary)] bg-[var(--surface)] px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                      Estado
                    </th>
                    <th className="border-b-2 border-[var(--pt-primary)] bg-[var(--surface)] px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                      Envío final
                    </th>
                    {columnas.map((columna) => (
                      <th
                        key={columna.key}
                        className="border-b-2 border-[var(--pt-primary)] bg-[var(--surface)] px-4 py-3 text-left font-semibold text-[var(--foreground)]"
                      >
                        <div className="text-xs uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                          {columna.contaminante}
                        </div>
                        <div className="text-sm">{columna.run}</div>
                        <div className="text-xs text-[var(--foreground-muted)]">
                          {columna.level} · {columna.sampleGroup}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((resultado) => {
                    const celdas = getCellMap(resultado)
                    return (
                      <tr key={resultado.participante_id} className="align-top">
                        <td className="sticky left-0 z-10 border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-4">
                          <div className="font-medium text-[var(--foreground)]">{resultado.email}</div>
                          <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                            participant_id:{' '}
                            <span className="numeric text-[var(--foreground)]">
                              {resultado.participant_code ?? '—'}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--foreground-muted)]">
                            replicate:{' '}
                            <span className="numeric text-[var(--foreground)]">
                              {resultado.replicate_code ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="border-b border-[var(--border-soft)] px-4 py-4">
                          {completitudBadge(resultado)}
                        </td>
                        <td className="border-b border-[var(--border-soft)] px-4 py-4 text-[var(--foreground-muted)]">
                          {formatDate(resultado.enviados_at)}
                        </td>
                        {columnas.map((columna) => {
                          const celda = celdas[columna.key]
                          return (
                            <td
                              key={`${resultado.participante_id}-${columna.key}`}
                              className="border-b border-[var(--border-soft)] px-4 py-4"
                            >
                              {celda ? (
                                <div className="space-y-1">
                                  <div className="numeric text-sm font-medium text-[var(--foreground)]">
                                    mean {celda.mean_value}
                                  </div>
                                  <div className="numeric text-xs text-[var(--foreground-muted)]">
                                    sd {celda.sd_value}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[var(--border)]">Sin dato</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
