'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CONTAMINANTES,
  type EnvioPT,
  type Ronda,
  type RondaPTItem,
  type RondaPTSampleGroup,
} from '@/lib/rondas'
import { enviarInformeFinalAction, guardarEnvioAction } from './actions'

type CellKey = `${string}::${string}`
type CellData = {
  d1: string
  d2: string
  d3: string
  meanValue: string
  sdValue: string
  ux: string
  uxExp: string
}
type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

function toCellKey(ptItemId: string, sampleGroupId: string): CellKey {
  return `${ptItemId}::${sampleGroupId}`
}

function fromCellKey(key: CellKey) {
  const [ptItemId, sampleGroupId] = key.split('::')
  return { ptItemId, sampleGroupId }
}

function isValidNumberInput(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  const parsed = Number(trimmed)
  return Number.isFinite(parsed)
}

function getCellIssue(data: CellData): string | null {
  for (const [label, field] of [['d1', data.d1], ['d2', data.d2], ['d3', data.d3]] as const) {
    if (field.trim() !== '' && !isValidNumberInput(field)) {
      return `${label} debe ser un número válido.`
    }
  }
  if (data.meanValue.trim() !== '' && !isValidNumberInput(data.meanValue)) {
    return 'El promedio debe ser un número válido.'
  }
  if (data.sdValue.trim() !== '' && (!isValidNumberInput(data.sdValue) || Number(data.sdValue) < 0)) {
    return 'La desviación estándar debe ser ≥ 0.'
  }
  if (data.ux.trim() !== '' && (!isValidNumberInput(data.ux) || Number(data.ux) < 0)) {
    return 'u(x) debe ser ≥ 0.'
  }
  if (data.uxExp.trim() !== '' && (!isValidNumberInput(data.uxExp) || Number(data.uxExp) < 0)) {
    return 'u(x) exp debe ser ≥ 0.'
  }
  return null
}

function isCellComplete(data: CellData): boolean {
  return (
    isValidNumberInput(data.d1) &&
    isValidNumberInput(data.d2) &&
    isValidNumberInput(data.d3) &&
    isValidNumberInput(data.meanValue) &&
    isValidNumberInput(data.sdValue) &&
    Number(data.sdValue) >= 0 &&
    isValidNumberInput(data.ux) &&
    Number(data.ux) >= 0 &&
    isValidNumberInput(data.uxExp) &&
    Number(data.uxExp) >= 0
  )
}

function initCells(
  ptItems: RondaPTItem[],
  sampleGroups: RondaPTSampleGroup[],
  envios: EnvioPT[]
): Record<CellKey, CellData> {
  const enviosMap = new Map(
    envios.map((envio) => [toCellKey(envio.pt_item_id, envio.sample_group_id), envio])
  )
  const cells = {} as Record<CellKey, CellData>

  for (const item of ptItems) {
    for (const group of sampleGroups) {
      const key = toCellKey(item.id, group.id)
      const envio = enviosMap.get(key)
      cells[key] = {
        d1: envio?.d1 != null ? String(envio.d1) : '',
        d2: envio?.d2 != null ? String(envio.d2) : '',
        d3: envio?.d3 != null ? String(envio.d3) : '',
        meanValue: envio != null ? String(envio.mean_value) : '',
        sdValue: envio != null ? String(envio.sd_value) : '',
        ux: envio?.ux != null ? String(envio.ux) : '',
        uxExp: envio?.ux_exp != null ? String(envio.ux_exp) : '',
      }
    }
  }

  return cells
}

function initStatus(
  ptItems: RondaPTItem[],
  sampleGroups: RondaPTSampleGroup[],
  envios: EnvioPT[]
): Record<CellKey, SaveStatus> {
  const existing = new Set(envios.map((envio) => toCellKey(envio.pt_item_id, envio.sample_group_id)))
  const status = {} as Record<CellKey, SaveStatus>

  for (const item of ptItems) {
    for (const group of sampleGroups) {
      const key = toCellKey(item.id, group.id)
      status[key] = existing.has(key) ? 'saved' : 'idle'
    }
  }

  return status
}

function StatusIcon({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <span className="text-xs text-slate-500">guardando…</span>
  if (status === 'saved') return <span className="text-xs text-emerald-600">✓</span>
  if (status === 'error') return <span className="text-xs text-rose-600">✗</span>
  if (status === 'dirty') return <span className="text-xs text-amber-600">•</span>
  return null
}

export default function FormularioReferencia({
  ronda,
  ptItems,
  sampleGroups,
  enviosIniciales,
  envioFinalizado,
  enviadoAt,
  participantCode,
  replicateCode,
}: {
  ronda: Ronda
  ptItems: RondaPTItem[]
  sampleGroups: RondaPTSampleGroup[]
  enviosIniciales: EnvioPT[]
  envioFinalizado: boolean
  enviadoAt: string | null
  participantCode: string | null
  replicateCode: number | null
}) {
  const [submitDone, setSubmitDone] = useState(envioFinalizado)
  const [submittedAt, setSubmittedAt] = useState<string | null>(enviadoAt)
  const [cells, setCells] = useState(() => initCells(ptItems, sampleGroups, enviosIniciales))
  const [saveStatus, setSaveStatus] = useState<Record<CellKey, SaveStatus>>(() =>
    initStatus(ptItems, sampleGroups, enviosIniciales)
  )
  const [saveErrors, setSaveErrors] = useState<Record<CellKey, string>>({})
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const cerrada = ronda.estado === 'cerrada'
  const soloLectura = cerrada || submitDone
  const hasPTConfig = ptItems.length > 0 && sampleGroups.length > 0
  const hasParticipantCodes = Boolean(participantCode) && replicateCode != null

  const totalCells = ptItems.length * sampleGroups.length
  const completedCells = Object.values(cells).filter((cell) => isCellComplete(cell)).length
  const invalidCells = Object.values(cells).filter((cell) => getCellIssue(cell) !== null).length
  const progressPct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0
  const allComplete = totalCells > 0 && completedCells === totalCells
  const allSaved = Object.values(saveStatus).every((status) => status === 'saved' || status === 'idle')
  const canSubmit =
    hasPTConfig && hasParticipantCodes && allComplete && allSaved && invalidCells === 0 && !soloLectura

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      for (const timer of Object.values(activeTimers)) {
        clearTimeout(timer)
      }
    }
  }, [])

  async function triggerSave(key: CellKey, data: CellData) {
    const issue = getCellIssue(data)
    if (issue) {
      setSaveStatus((prev) => ({ ...prev, [key]: 'error' }))
      setSaveErrors((prev) => ({ ...prev, [key]: issue }))
      return
    }
    if (!isCellComplete(data)) return
    if (soloLectura) return

    const d1 = Number(data.d1)
    const d2 = Number(data.d2)
    const d3 = Number(data.d3)
    const meanValue = Number(data.meanValue)
    const sdValue = Number(data.sdValue)
    const ux = Number(data.ux)
    const uxExp = Number(data.uxExp)
    setSaveStatus((prev) => ({ ...prev, [key]: 'saving' }))

    const { ptItemId, sampleGroupId } = fromCellKey(key)
    const result = await guardarEnvioAction(ronda.id, ptItemId, sampleGroupId, d1, d2, d3, meanValue, sdValue, ux, uxExp)

    if (result.error) {
      setSaveStatus((prev) => ({ ...prev, [key]: 'error' }))
      setSaveErrors((prev) => ({ ...prev, [key]: result.error ?? 'No fue posible guardar.' }))
      setFormMessage(result.error)
      return
    }

    setSaveStatus((prev) => ({ ...prev, [key]: 'saved' }))
    setSaveErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function updateCell(key: CellKey, nextData: CellData) {
    setFormMessage(null)
    setCells((prev) => ({ ...prev, [key]: nextData }))
    setSaveStatus((prev) => ({ ...prev, [key]: 'dirty' }))
    setSaveErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })

    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      void triggerSave(key, nextData)
    }, 1200)
  }

  async function handleSubmit() {
    if (!canSubmit) {
      if (!hasPTConfig) {
        setFormMessage('La ronda aún no tiene configuración PT completa (corridas y grupos de muestra).')
      } else if (!hasParticipantCodes) {
        setFormMessage('Falta código PT o código de réplica. Contacta al coordinador de la ronda.')
      } else {
        setFormMessage('Revisa celdas pendientes o con error antes del envío final.')
      }
      return
    }

    setFormMessage(null)
    const result = await enviarInformeFinalAction(ronda.id)
    if (result.error) {
      setFormMessage(result.error)
      return
    }

    setSubmitDone(true)
    setSubmittedAt(result.submittedAt ?? new Date().toISOString())
  }

  const itemsByContaminante = CONTAMINANTES.map((contaminante) => ({
    contaminante,
    items: ptItems.filter((item) => item.contaminante === contaminante),
  })).filter((entry) => entry.items.length > 0)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-violet-800">
                Laboratorio de Referencia
              </div>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">{ronda.nombre}</h1>
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">Código: {ronda.codigo}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                ronda.estado === 'activa'
                  ? 'bg-emerald-100 text-emerald-800'
                  : ronda.estado === 'cerrada'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {ronda.estado}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="card-accent px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Código PT
              </div>
              <div className="numeric mt-1 text-lg font-semibold text-[var(--foreground)]">
                {participantCode ?? '—'}
              </div>
            </div>
            <div className="card-accent px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Réplica
              </div>
              <div className="numeric mt-1 text-lg font-semibold text-[var(--foreground)]">
                {replicateCode ?? '—'}
              </div>
            </div>
            <div className="card-accent px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Completitud
              </div>
              <div className="numeric mt-1 text-lg font-semibold text-[var(--foreground)]">
                {completedCells}/{totalCells}
              </div>
            </div>
            <div className="card-accent px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Observaciones
              </div>
              <div className="numeric mt-1 text-lg font-semibold text-[var(--foreground)]">{invalidCells}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[var(--foreground-muted)]">
              <span>Progreso PT</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--border)]">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: allComplete ? 'var(--success)' : 'var(--pt-primary)' }}
              />
            </div>
          </div>

          {cerrada && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Esta ronda está cerrada. Los datos son de solo lectura.
            </div>
          )}

          {!hasPTConfig && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              La configuración PT no está completa. Debe existir al menos una corrida PT y un grupo de muestra.
            </div>
          )}

          {!hasParticipantCodes && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No tienes asignado `participant_id` o `replicate`. Solicita al coordinador completar esa configuración.
            </div>
          )}

          {submitDone && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Tu informe final PT fue enviado correctamente.
              {submittedAt ? ` Fecha de envío: ${new Date(submittedAt).toLocaleString('es-CO')}.` : ''}
            </div>
          )}

          {formMessage && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formMessage}
            </div>
          )}
        </section>

        {itemsByContaminante.map(({ contaminante, items }) => {
          const contaminanteComplete =
            items.length > 0 &&
            sampleGroups.length > 0 &&
            items.every((item) =>
              sampleGroups.every((group) => isCellComplete(cells[toCellKey(item.id, group.id)]))
            )

          return (
            <section key={contaminante} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--foreground)]">
                    {contaminante}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                    {items.length * sampleGroups.length} combinación{items.length * sampleGroups.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                {contaminanteComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    ✓ Completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pendiente
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs text-[var(--foreground-muted)]">
                      <th className="px-4 py-2 font-semibold">Run</th>
                      <th className="px-4 py-2 font-semibold">Level</th>
                      {sampleGroups.length > 1 && <th className="px-4 py-2 font-semibold">Grupo</th>}
                      <th className="px-4 py-2 font-semibold">d1</th>
                      <th className="px-4 py-2 font-semibold">d2</th>
                      <th className="px-4 py-2 font-semibold">d3</th>
                      <th className="px-4 py-2 font-semibold">Promedio</th>
                      <th className="px-4 py-2 font-semibold">Desv. Est.</th>
                      <th className="px-4 py-2 font-semibold">u(x)</th>
                      <th className="px-4 py-2 font-semibold">u(x) exp</th>
                      <th className="px-4 py-2 font-semibold text-center">OK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {items.flatMap((item) =>
                      sampleGroups.map((group) => {
                        const key = toCellKey(item.id, group.id)
                        const data = cells[key]
                        const issue = saveErrors[key] ?? getCellIssue(data)
                        const status = saveStatus[key] ?? 'idle'
                        const complete = isCellComplete(data)

                        const inputCls = `w-20 rounded border px-2 py-1 text-sm outline-none numeric disabled:bg-[var(--surface-muted)] disabled:text-[var(--foreground-muted)] ${
                          issue ? 'border-rose-300 bg-rose-50/40' : 'border-[var(--border)]'
                        }`

                        return (
                          <tr
                            key={key}
                            className={`transition-colors hover:bg-[var(--surface-muted)]/40 ${
                              complete ? 'bg-emerald-50/20' : ''
                            } ${issue ? 'bg-rose-50/20' : ''}`}
                          >
                            <td className="px-4 py-2 font-mono text-xs text-[var(--foreground)]">{item.run_code}</td>
                            <td className="px-4 py-2 text-[var(--foreground-muted)]">{item.level_label}</td>
                            {sampleGroups.length > 1 && (
                              <td className="px-4 py-2 text-[var(--foreground-muted)]">{group.sample_group}</td>
                            )}
                            {(['d1', 'd2', 'd3'] as const).map((field) => (
                              <td key={field} className="px-2 py-2">
                                <input
                                  type="number"
                                  step="any"
                                  inputMode="decimal"
                                  value={data[field]}
                                  disabled={soloLectura}
                                  onChange={(e) => updateCell(key, { ...data, [field]: e.target.value })}
                                  className={inputCls}
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                inputMode="decimal"
                                value={data.meanValue}
                                disabled={soloLectura}
                                onChange={(e) => updateCell(key, { ...data, meanValue: e.target.value })}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                inputMode="decimal"
                                value={data.sdValue}
                                disabled={soloLectura}
                                onChange={(e) => updateCell(key, { ...data, sdValue: e.target.value })}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                inputMode="decimal"
                                value={data.ux}
                                disabled={soloLectura}
                                onChange={(e) => updateCell(key, { ...data, ux: e.target.value })}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                inputMode="decimal"
                                value={data.uxExp}
                                disabled={soloLectura}
                                onChange={(e) => updateCell(key, { ...data, uxExp: e.target.value })}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              {complete ? (
                                <span className="text-base font-semibold text-emerald-600">✓</span>
                              ) : issue ? (
                                <span className="text-xs text-rose-500" title={issue}>✗</span>
                              ) : (
                                <StatusIcon status={status} />
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}

        {!soloLectura && (
          <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-sm text-[var(--foreground-muted)]">
              {canSubmit
                ? 'Todas las combinaciones PT están completas y guardadas. Puedes enviar el informe final.'
                : `Faltan ${Math.max(totalCells - completedCells, 0)} celdas por completar o guardar.`}
            </p>
            <button type="button" onClick={() => void handleSubmit()} className="btn-primary" disabled={!canSubmit}>
              Enviar informe final PT
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
