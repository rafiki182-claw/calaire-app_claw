import { notFound, redirect } from 'next/navigation'
import { withAuth } from '@workos-inc/authkit-nextjs'
import {
  claimParticipanteToken,
  getEstadoEnvioPTParticipante,
  getRondaByCodigo,
  getRondaParticipantePT,
  isInvitado,
  listEnviosPT,
  listPTItems,
  listPTSampleGroups,
} from '@/lib/rondas'
import { isAdmin } from '@/lib/auth'
import FormularioRonda from './FormularioRonda'
import FormularioReferencia from './FormularioReferencia'

export default async function RondaPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { codigo } = await params
  const sp = searchParams ? await searchParams : {}
  const rawToken = Array.isArray(sp.token) ? sp.token[0] : sp.token
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  const auth = await withAuth({ ensureSignedIn: true })
  if (!auth.user) redirect('/login')

  const ronda = await getRondaByCodigo(codigo)
  if (!ronda) notFound()

  // Admins pueden acceder siempre; participantes solo si están invitados
  if (!isAdmin(auth)) {
    let invitado = await isInvitado(ronda.id, auth.user.id)

    if (!invitado && token) {
      const claim = await claimParticipanteToken(
        ronda.id,
        token,
        auth.user.id,
        auth.user.email,
        auth.role ?? null
      )
      if (claim === 'claimed' || claim === 'already-assigned') {
        redirect(`/ronda/${codigo}`)
      }

    }

    invitado = invitado || (await isInvitado(ronda.id, auth.user.id))
    if (!invitado) {
      redirect('/denied?reason=invite')
    }

    if (ronda.estado === 'borrador') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow p-10 text-center max-w-md">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Ronda no disponible</h2>
            <p className="text-gray-500 text-sm">
              La ronda <strong>{codigo}</strong> aún no ha sido activada. Vuelve más tarde.
            </p>
          </div>
        </div>
      )
    }

    if (ronda.estado === 'cerrada') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow p-10 text-center max-w-md">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Ronda cerrada</h2>
            <p className="text-gray-500 text-sm">
              La ronda <strong>{codigo}</strong> ya fue cerrada por el coordinador y no admite
              nuevos ingresos.
            </p>
          </div>
        </div>
      )
    }
  }

  const [ptItems, sampleGroups, enviosIniciales, estadoEnvio, participantePT] = await Promise.all([
    listPTItems(ronda.id),
    listPTSampleGroups(ronda.id),
    listEnviosPT(ronda.id, auth.user.id),
    getEstadoEnvioPTParticipante(ronda.id, auth.user.id),
    getRondaParticipantePT(ronda.id, auth.user.id),
  ])

  const isReferencia = participantePT?.participant_profile === 'member_special'

  if (isReferencia) {
    return (
      <FormularioReferencia
        ronda={ronda}
        ptItems={ptItems}
        sampleGroups={sampleGroups}
        enviosIniciales={enviosIniciales}
        envioFinalizado={estadoEnvio.enviado}
        enviadoAt={estadoEnvio.enviados_at}
        participantCode={participantePT?.participant_code ?? null}
        replicateCode={participantePT?.replicate_code ?? null}
      />
    )
  }

  return (
    <FormularioRonda
      ronda={ronda}
      ptItems={ptItems}
      sampleGroups={sampleGroups}
      enviosIniciales={enviosIniciales}
      envioFinalizado={estadoEnvio.enviado}
      enviadoAt={estadoEnvio.enviados_at}
      participantCode={participantePT?.participant_code ?? null}
      replicateCode={participantePT?.replicate_code ?? null}
    />
  )
}
