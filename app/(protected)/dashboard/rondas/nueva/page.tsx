import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireAuth, isAdmin } from '@/lib/auth'
import { CONTAMINANTES } from '@/lib/rondas'
import { createRondaAction } from '@/app/(protected)/dashboard/actions'

export default async function NuevaRondaPage() {
  const auth = await requireAuth()
  if (!isAdmin(auth)) redirect('/denied?reason=role')

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard?tab=rondas"
            className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            ← Rondas
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Nueva ronda</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Defina el nombre, código y estructura analítica. Se generarán los enlaces de acceso por participante.
          </p>
        </div>

        <form action={createRondaAction} className="card grid gap-6 p-6">

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">Nombre</span>
              <input
                type="text"
                name="nombre"
                required
                autoFocus
                placeholder="Ronda CO abril 2026"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--pt-primary)] focus:ring-2 focus:ring-[var(--pt-primary-subtle)] transition-colors"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">Código</span>
              <input
                type="text"
                name="codigo"
                required
                placeholder="RDA-CO-2026-01"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 uppercase text-[var(--foreground)] outline-none focus:border-[var(--pt-primary)] focus:ring-2 focus:ring-[var(--pt-primary-subtle)] transition-colors"
              />
            </label>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">Número de participantes</span>
              <input
                type="number"
                name="participantes_planeados"
                min="1"
                required
                defaultValue="1"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--pt-primary)] focus:ring-2 focus:ring-[var(--pt-primary-subtle)] transition-colors md:max-w-[14rem]"
              />
            </label>
            <label className="inline-flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] cursor-pointer hover:border-[var(--pt-primary)] transition-colors w-fit">
              <input
                type="checkbox"
                name="include_reference"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--pt-primary)]"
              />
              <span>Incluir referencia (member special) con enlace individual</span>
            </label>
          </div>

          <div className="grid gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                Contaminantes
              </h2>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Seleccione los contaminantes incluidos y defina niveles y réplicas.
              </p>
            </div>

            <div className="grid gap-2">
              {CONTAMINANTES.map((contaminante) => (
                <div
                  key={contaminante}
                  className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-[1.4fr_1fr_1fr]"
                >
                  <label className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      name={`enabled_${contaminante}`}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--pt-primary)]"
                    />
                    <span>{contaminante}</span>
                  </label>

                  <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
                    <span>Niveles</span>
                    <input
                      type="number"
                      min="1"
                      name={`niveles_${contaminante}`}
                      defaultValue={1}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--pt-primary)] transition-colors"
                    />
                  </label>

                  <label className="grid gap-1 text-sm text-[var(--foreground-muted)]">
                    <span>Réplicas</span>
                    <select
                      name={`replicas_${contaminante}`}
                      defaultValue="2"
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--pt-primary)] transition-colors"
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
            <Link
              href="/dashboard?tab=rondas"
              className="btn-outline"
            >
              Cancelar
            </Link>
            <button type="submit" className="btn-primary">
              Crear ronda
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
