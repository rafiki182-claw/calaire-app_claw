import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { Alert } from '@/app/(protected)/dashboard/components/Alert'
import { EstadoBadge } from '@/app/(protected)/dashboard/components/EstadoBadge'
import { requireAuth, isAdmin } from '@/lib/auth'
import {
  getRonda,
  getRondaMetricasCompletas,
  type EstadoOperativo,
  type RondaMetricas,
  type EstadoRonda,
} from '@/lib/rondas'
import { RondaContextNav } from './RondaContextNav'
import { activarRondaAction, cerrarRondaAction, reabrirRondaAction } from './actions'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const ESTADO_OPERATIVO_CONFIG: Record<
  EstadoOperativo,
  { label: string; icon: string; classes: string }
> = {
  preparar_ronda: { label: 'Preparar ronda', icon: '⚠️', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  invitar_participantes: { label: 'Invitar participantes', icon: '📨', classes: 'bg-sky-100 text-sky-800 border-sky-200' },
  esperando_fichas: { label: 'Esperando fichas', icon: '📋', classes: 'bg-violet-100 text-violet-800 border-violet-200' },
  recibiendo_resultados: { label: 'Recibiendo resultados', icon: '📥', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
  revisar_incompletos: { label: 'Revisar incompletos', icon: '⚡', classes: 'bg-orange-100 text-orange-800 border-orange-200' },
  lista_para_exportar: { label: 'Lista para exportar', icon: '✓', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cerrada: { label: 'Cerrada', icon: '🔒', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
}

function EstadoOperativoBadge({ estado }: { estado: EstadoOperativo }) {
  const config = ESTADO_OPERATIVO_CONFIG[estado]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${config.classes}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Progress metric card
// ---------------------------------------------------------------------------

function MetricaCard({
  label,
  value,
  total,
  href,
}: {
  label: string
  value: number | string
  total?: number | string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  href?: string
}) {
  const inner = (
    <>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
        {label}
      </div>
      <div className="numeric mt-2 text-3xl font-semibold text-[var(--foreground)]">
        {value}
        {total !== undefined && (
          <span className="text-xl font-normal text-[var(--foreground-muted)]"> / {total}</span>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="card-accent px-5 py-4 transition hover:border-[var(--pt-primary)] hover:shadow-md">
        {inner}
      </Link>
    )
  }

  return <div className="card-accent px-5 py-4">{inner}</div>
}

// ---------------------------------------------------------------------------
// Alertas operativas
// ---------------------------------------------------------------------------

function AlertasOperativas({ metricas, rondaId }: { metricas: RondaMetricas; rondaId: string }) {
  const alertas: { message: string; href: string; tone: 'amber' | 'sky' | 'violet' | 'emerald' }[] = []

  // Participant-level alerts only make sense once PT is configured
  // (the CONFIG PT card already communicates the pending state visually)
  if (metricas.pt_configurado) {
    if (metricas.fichas_pendientes > 0) {
      alertas.push({
        message: `${metricas.fichas_pendientes} ficha${metricas.fichas_pendientes !== 1 ? 's' : ''} pendiente${metricas.fichas_pendientes !== 1 ? 's' : ''} de envío.`,
        href: `/dashboard/rondas/${rondaId}/participantes`,
        tone: 'violet',
      })
    }
  }

  // 3. Results available
  if (metricas.envios_finales > 0) {
    alertas.push({
      message: `${metricas.envios_finales} envío${metricas.envios_finales !== 1 ? 's' : ''} final${metricas.envios_finales !== 1 ? 'es' : ''} disponible${metricas.envios_finales !== 1 ? 's' : ''}.`,
      href: `/dashboard/rondas/${rondaId}/resultados`,
      tone: 'emerald',
    })
  }

  if (alertas.length === 0) return null

  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    sky: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
    violet: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  }

  return (
    <div className="grid gap-2">
      {alertas.map((alerta) => (
        <Link
          key={alerta.message}
          href={alerta.href}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${toneClasses[alerta.tone]}`}
        >
          <span>{alerta.message}</span>
          <span className="text-xs opacity-70">→</span>
        </Link>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Acciones de estado
// ---------------------------------------------------------------------------

function AccionesDeEstado({
  rondaId,
  estado,
  confirmCerrar,
  confirmReabrir,
}: {
  rondaId: string
  estado: EstadoRonda
  confirmCerrar: boolean
  confirmReabrir: boolean
}) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Acciones de estado</h2>
      <p className="text-sm text-[var(--foreground-muted)] mb-4">
        Transiciones del ciclo de vida de la ronda.
      </p>

      <div className="flex flex-wrap gap-3">
        {estado === 'borrador' && (
          <form action={activarRondaAction}>
            <input type="hidden" name="ronda_id" value={rondaId} />
            <button type="submit" className="btn-primary">
              Activar ronda →
            </button>
          </form>
        )}

        {estado === 'activa' && !confirmCerrar && (
          <form action={cerrarRondaAction}>
            <input type="hidden" name="ronda_id" value={rondaId} />
            <button type="submit" className="btn-outline">
              Cerrar ronda
            </button>
          </form>
        )}

        {estado === 'activa' && confirmCerrar && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-sm text-rose-800">¿Está seguro de cerrar la ronda?</span>
            <form action={cerrarRondaAction}>
              <input type="hidden" name="ronda_id" value={rondaId} />
              <input type="hidden" name="confirm" value="1" />
              <button
                type="submit"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Confirmar cierre
              </button>
            </form>
            <Link
              href={`/dashboard/rondas/${rondaId}`}
              className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Cancelar
            </Link>
          </div>
        )}

        {estado === 'cerrada' && !confirmReabrir && (
          <form action={reabrirRondaAction}>
            <input type="hidden" name="ronda_id" value={rondaId} />
            <button type="submit" className="btn-outline">
              Reabrir ronda
            </button>
          </form>
        )}

        {estado === 'cerrada' && confirmReabrir && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="text-sm text-amber-800">¿Está seguro de reabrir la ronda?</span>
            <form action={reabrirRondaAction}>
              <input type="hidden" name="ronda_id" value={rondaId} />
              <input type="hidden" name="confirm" value="1" />
              <button type="submit" className="btn-primary">
                Confirmar reapertura
              </button>
            </form>
            <Link
              href={`/dashboard/rondas/${rondaId}`}
              className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Cancelar
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RondaResumenPage({ params, searchParams }: PageProps) {
  const auth = await requireAuth()
  if (!auth.user) redirect('/login')
  if (!isAdmin(auth)) redirect('/denied?reason=role')

  const { id: rondaId } = await params
  const ronda = await getRonda(rondaId)
  if (!ronda) notFound()

  const metricas = await getRondaMetricasCompletas(rondaId, ronda)

  const sp = searchParams ? await searchParams : {}
  const success = getParam(sp.success)
  const error = getParam(sp.error)
  const confirmCerrar = getParam(sp.confirm_cerrar) === '1'
  const confirmReabrir = getParam(sp.confirm_reabrir) === '1'

  // Derive metric card variants
  const cuposVariant =
    metricas.cupos_reclamados === metricas.cupos_totales && metricas.cupos_totales > 0
      ? 'success'
      : metricas.cupos_reclamados === 0 && metricas.cupos_totales > 0
        ? 'danger'
        : 'warning'

  const fichasVariant =
    metricas.fichas_enviadas === metricas.cupos_reclamados && metricas.cupos_reclamados > 0
      ? 'success'
      : metricas.fichas_pendientes > 0
        ? 'warning'
        : 'default'

  const enviosVariant =
    metricas.envios_finales >= metricas.envios_esperados && metricas.envios_esperados > 0
      ? 'success'
      : metricas.envios_finales > 0
        ? 'warning'
        : 'default'

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Context Navigation */}
        <RondaContextNav rondaId={rondaId} rondaCodigo={ronda.codigo} ptConfigurado={metricas.pt_configurado} />

        {/* Header */}
        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">{ronda.nombre}</h1>
              <EstadoBadge estado={ronda.estado} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <EstadoOperativoBadge estado={metricas.estado_operativo} />
            </div>
            <p className="text-sm text-[var(--foreground-muted)]">
              {metricas.accion_recomendada}
            </p>
          </div>
        </header>

        {/* Alerts */}
        <Alert tone="success" message={success} />
        <Alert tone="error" message={error} />

        {/* Progress Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricaCard
            label="Config PT"
            value={metricas.pt_configurado ? '✓ Configurado' : '✗ Pendiente'}
            href={!metricas.pt_configurado ? `/dashboard/rondas/${rondaId}/configuracion-pt` : undefined}
          />
          <MetricaCard
            label="Cupos"
            value={metricas.cupos_reclamados}
            total={metricas.cupos_totales}
            variant={cuposVariant}
          />
          <MetricaCard
            label="Fichas"
            value={metricas.fichas_enviadas}
            total={metricas.cupos_reclamados}
            variant={fichasVariant}
          />
          <MetricaCard
            label="Envíos PT"
            value={metricas.envios_finales}
            total={metricas.envios_esperados}
            variant={enviosVariant}
          />
        </section>

        {/* Operational Alerts */}
        <AlertasOperativas metricas={metricas} rondaId={rondaId} />

        {/* State Actions */}
        <AccionesDeEstado
          rondaId={rondaId}
          estado={ronda.estado}
          confirmCerrar={confirmCerrar}
          confirmReabrir={confirmReabrir}
        />
      </div>
    </div>
  )
}
