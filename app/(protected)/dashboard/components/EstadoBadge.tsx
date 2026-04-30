const CLASSES: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-800',
  cerrada: 'bg-slate-200 text-slate-700',
  borrador: 'bg-amber-100 text-amber-800',
}

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] ${CLASSES[estado] ?? CLASSES.borrador}`}
    >
      {estado}
    </span>
  )
}
