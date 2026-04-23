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
  const csv = buildPTCsv(enviosPT)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ronda.codigo.toLowerCase()}-pt.csv"`,
    },
  })
}