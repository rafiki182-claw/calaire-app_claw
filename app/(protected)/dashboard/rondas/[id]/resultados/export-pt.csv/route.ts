import { NextResponse } from 'next/server'

import { isAdmin, requireAuth } from '@/lib/auth'
import { buildPTCsv, getRonda, listEnviosPTRound } from '@/lib/rondas'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.user || !isAdmin(auth)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const { id: rondaId } = await params
  const ronda = await getRonda(rondaId)

  if (!ronda) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const enviosPT = await listEnviosPTRound(rondaId)
  const missingParticipantIds = enviosPT.filter((envio) => !envio.participant_id?.trim())
  const missingReplicates = enviosPT.filter((envio) => envio.replicate == null || Number(envio.replicate) <= 0)

  if (missingParticipantIds.length > 0 || missingReplicates.length > 0) {
    return NextResponse.json(
      {
        error: 'pt_export_incomplete',
        message: 'No se puede exportar el CSV PT porque hay envíos con participant_id o réplica pendientes.',
        missing_participant_id_count: missingParticipantIds.length,
        missing_replicate_count: missingReplicates.length,
      },
      { status: 409 }
    )
  }

  const csv = buildPTCsv(enviosPT)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ronda.codigo.toLowerCase()}-pt.csv"`,
    },
  })
}
