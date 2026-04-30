'use client'

import { useRouter } from 'next/navigation'

import type { Ronda } from '@/lib/rondas'

export function RondaParticipantesSelector({
  rondas,
  selectedRondaId,
}: {
  rondas: Ronda[]
  selectedRondaId: string
}) {
  const router = useRouter()

  return (
    <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
      <span>Ronda</span>
      <select
        value={selectedRondaId}
        onChange={(event) => {
          const params = new URLSearchParams({ tab: 'participantes' })
          if (event.target.value) params.set('ronda_id', event.target.value)
          router.push(`/dashboard?${params.toString()}`)
        }}
        className="min-w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Todas las rondas</option>
        {rondas.map((ronda) => (
          <option key={ronda.id} value={ronda.id}>
            {ronda.codigo} - {ronda.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}
