'use client'

import { useMemo, useState } from 'react'

import type { Contaminante } from '@/lib/rondas'
import { createPTItemsBulkAction } from './actions'

type LevelRow = {
  id: number
  runCode: string
  levelLabel: string
}

type Props = {
  rondaId: string
  contaminantes: Contaminante[]
}

const INITIAL_ROWS: LevelRow[] = [
  { id: 1, runCode: '1', levelLabel: '1' },
  { id: 2, runCode: '2', levelLabel: '2' },
  { id: 3, runCode: '3', levelLabel: '3' },
]

export function PTLevelsBulkForm({ rondaId, contaminantes }: Props) {
  const [rows, setRows] = useState<LevelRow[]>(INITIAL_ROWS)
  const [nextId, setNextId] = useState(4)

  const levelsValue = useMemo(
    () =>
      rows
        .map((row) => {
          const runCode = row.runCode.trim()
          const levelLabel = row.levelLabel.trim()
          if (!runCode && !levelLabel) return ''
          return `${runCode}, ${levelLabel}`
        })
        .filter(Boolean)
        .join('\n'),
    [rows]
  )

  function updateRow(id: number, field: 'runCode' | 'levelLabel', value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  function addRows(count: number) {
    setRows((current) => {
      const additions = Array.from({ length: count }, (_, index) => {
        const id = nextId + index
        return { id, runCode: String(current.length + index + 1), levelLabel: String(current.length + index + 1) }
      })
      return [...current, ...additions]
    })
    setNextId((current) => current + count)
  }

  function removeRow(id: number) {
    setRows((current) => {
      if (current.length === 1) return current
      return current.filter((row) => row.id !== id)
    })
  }

  return (
    <form action={createPTItemsBulkAction} className="mb-6 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <input type="hidden" name="ronda_id" value={rondaId} />
      <input type="hidden" name="levels" value={levelsValue} />

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
          Contaminante
        </label>
        <select
          name="contaminante"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="">Seleccione...</option>
          {contaminantes.map((contaminante) => (
            <option key={contaminante} value={contaminante}>
              {contaminante}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem] border-b border-[var(--border-soft)] bg-[var(--surface-muted)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
          <div className="px-3 py-2">#</div>
          <div className="px-3 py-2">Run</div>
          <div className="px-3 py-2">Nivel</div>
          <div className="px-2 py-2 text-right"> </div>
        </div>

        <div className="divide-y divide-[var(--border-soft)]">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem] items-center"
            >
              <div className="px-3 py-2 text-sm text-[var(--foreground-muted)]">{index + 1}</div>
              <div className="px-2 py-2">
                <input
                  type="text"
                  value={row.runCode}
                  onChange={(event) => updateRow(row.id, 'runCode', event.target.value)}
                  required
                  aria-label={`Run fila ${index + 1}`}
                  className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--pt-primary)] focus:bg-[var(--surface)]"
                />
              </div>
              <div className="px-2 py-2">
                <input
                  type="text"
                  value={row.levelLabel}
                  onChange={(event) => updateRow(row.id, 'levelLabel', event.target.value)}
                  required
                  aria-label={`Nivel fila ${index + 1}`}
                  className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--pt-primary)] focus:bg-[var(--surface)]"
                />
              </div>
              <div className="px-2 py-2 text-right">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="rounded-md px-2 py-1 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Quitar fila ${index + 1}`}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addRows(1)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--pt-primary)]"
          >
            + 1 fila
          </button>
          <button
            type="button"
            onClick={() => addRows(5)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--pt-primary)]"
          >
            + 5 filas
          </button>
        </div>
        <button type="submit" className="btn-primary min-w-44">
          Agregar niveles PT
        </button>
      </div>
    </form>
  )
}
