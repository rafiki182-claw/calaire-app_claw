import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/auth'
import { getRonda } from '@/lib/rondas'
import { getOrCreateFicha, getFichaByRondaParticipante } from '@/lib/fichas'
import FichaAdminEditor from './FichaAdminEditor'

type Props = {
  params: Promise<{ id: string; pid: string }>
}

export default async function FichaAdminPage({ params }: Props) {
  await requireAdminAuth()

  const { id: rondaId, pid: rondaParticipanteId } = await params

  const ronda = await getRonda(rondaId)
  if (!ronda) notFound()

  await getOrCreateFicha(rondaParticipanteId)
  const fichaCompleta = await getFichaByRondaParticipante(rondaParticipanteId)
  if (!fichaCompleta) notFound()

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="header-bar px-6 py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
              >
                CALAIRE APP
              </Link>
              <span className="text-[var(--border)]">/</span>
              <Link
                href={`/dashboard/rondas/${rondaId}/participantes`}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
              >
                Participantes
              </Link>
              <span className="text-[var(--border)]">/</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                Ficha
              </span>
            </div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              F-PSEA-05A — {ronda.nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--foreground-muted)]">
                Ronda: <strong className="text-[var(--foreground)]">{ronda.codigo}</strong>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  fichaCompleta.estado === 'enviado'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {fichaCompleta.estado === 'enviado' ? 'Enviada' : 'Borrador'}
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                Edición admin
              </span>
            </div>
          </div>
        </header>

        <FichaAdminEditor fichaId={fichaCompleta.id} ficha={fichaCompleta} />

        <div>
          <Link
            href={`/dashboard/rondas/${rondaId}/participantes`}
            className="btn-outline"
          >
            ← Volver a participantes
          </Link>
        </div>
      </div>
    </div>
  )
}
