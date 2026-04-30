import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { withAuth } from '@workos-inc/authkit-nextjs'
import { isAdmin } from '@/lib/auth'
import { getRondaByCodigo, getRondaParticipantePT, isInvitado } from '@/lib/rondas'
import { getOrCreateFicha, getFichaByRondaParticipante } from '@/lib/fichas'
import FormularioRegistro from './FormularioRegistro'

type Props = {
  params: Promise<{ codigo: string }>
}

export default async function RegistroPage({ params }: Props) {
  const { codigo } = await params
  const auth = await withAuth({ ensureSignedIn: true })
  if (!auth.user) redirect('/login')

  const ronda = await getRondaByCodigo(codigo)
  if (!ronda) notFound()

  const admin = isAdmin(auth)

  if (!admin) {
    const invitado = await isInvitado(ronda.id, auth.user.id)
    if (!invitado) redirect('/denied?reason=invite')
  }

  const rp = await getRondaParticipantePT(ronda.id, auth.user.id)
  if (!rp) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
        <div className="card max-w-md p-10 text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Sin asignación</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            No tiene una asignación en esta ronda para registrar la ficha.
          </p>
          <Link href="/dashboard" className="btn-outline mt-4 inline-block">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  await getOrCreateFicha(rp.id)
  const ficha = await getFichaByRondaParticipante(rp.id)
  if (!ficha) notFound()

  const soloLectura = ficha.estado === 'enviado' || ronda.estado === 'cerrada'

  return (
    <FormularioRegistro
      codigoRonda={codigo}
      rondaCodigo={ronda.codigo}
      rondaEstado={ronda.estado}
      participanteCodigo={rp.participant_code}
      ficha={ficha}
      soloLectura={soloLectura}
    />
  )
}
