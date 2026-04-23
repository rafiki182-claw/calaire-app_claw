import Link from 'next/link'

function resolveMessage(reason?: string) {
  switch (reason) {
    case 'role':
      return 'La cuenta autenticada no tiene permisos para acceder a esta seccion administrativa.'
    case 'invite':
      return 'La cuenta autenticada no esta asociada a la ronda solicitada.'
    case 'reference-role':
      return 'Este enlace es exclusivo para el perfil member special (referencia).'
    default:
      return 'No fue posible autorizar el acceso con la sesion actual.'
  }
}

export default async function DeniedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) ?? {}
  const reasonRaw = params.reason
  const reason = Array.isArray(reasonRaw) ? reasonRaw[0] : reasonRaw

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_100%)] px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] border border-amber-200 bg-white/95 p-8 shadow-sm">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          🔒
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Acceso denegado
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">No es posible abrir esta vista</h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">{resolveMessage(reason)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Volver al dashboard
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
