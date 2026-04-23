import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
          404
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Recurso no encontrado
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">La ruta solicitada no existe</h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Verifique el enlace de la ronda o vuelva al panel principal para continuar con la
            operacion.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Abrir dashboard
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
