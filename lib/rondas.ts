import { getSupabaseAdmin } from '@/lib/supabase'

export const CONTAMINANTES = ['CO', 'SO2', 'O3', 'NO', 'NO2'] as const
export const REPLICAS_OPTIONS = [2, 3] as const
export const PENDING_PARTICIPANTE_PREFIX = 'pendiente:'
export const MEMBER_SPECIAL_ROLES = ['member_special', 'member-special', 'member special'] as const

export type ParticipantePerfil = 'member' | 'member_special'

export type RondaPTItem = {
  id: string
  ronda_id: string
  contaminante: Contaminante
  run_code: string
  level_label: string
  sort_order: number
  created_at: string
}

export type RondaPTSampleGroup = {
  id: string
  ronda_id: string
  sample_group: string
  sort_order: number
  created_at: string
}

export type RondaParticipantePT = {
  id: string
  ronda_id: string
  workos_user_id: string
  email: string
  invitado_at: string
  participant_profile: ParticipantePerfil
  participant_code: string | null
  replicate_code: number | null
  claimed_at: string | null
}

export type EnvioPT = {
  id: string
  ronda_id: string
  ronda_participante_id: string
  pt_item_id: string
  sample_group_id: string
  d1: number | null
  d2: number | null
  d3: number | null
  mean_value: number
  sd_value: number
  ux: number | null
  ux_exp: number | null
  draft_saved_at: string
  final_submitted_at: string | null
  updated_at: string
}

export type EnvioPTConMetadatos = {
  pollutant: string
  run: string
  level: string
  participant_id: string
  replicate: number
  sample_group: string
  d1: number | null
  d2: number | null
  d3: number | null
  mean_value: number
  sd_value: number
  ux: number | null
  ux_exp: number | null
}

export type Envio = {
  id: string
  ronda_id: string
  workos_user_id: string
  contaminante: Contaminante
  nivel: number
  valores: number[]
  promedio: number | null
  incertidumbre: number | null
  submitted_at: string
  updated_at: string
}

export type RondaParticipante = {
  id: string
  ronda_id: string
  workos_user_id: string
  email: string
  invitado_at: string
  participant_profile: ParticipantePerfil
  envios_count: number
  estado: 'pendiente' | 'asignado'
  slot_token: string | null
}

export type ResultadoParticipante = {
  workos_user_id: string
  email: string
  completados: number
  total_esperado: number
  porcentaje_completitud: number
  enviados_at: string | null
  envios: Envio[]
}

export type ResultadoPTCelda = {
  pt_item_id: string
  sample_group_id: string
  mean_value: number
  sd_value: number
  draft_saved_at: string
  final_submitted_at: string | null
  updated_at: string
}

export type ResultadoParticipantePT = {
  participante_id: string
  workos_user_id: string
  email: string
  participant_code: string | null
  replicate_code: number | null
  completados: number
  total_esperado: number
  porcentaje_completitud: number
  enviados_at: string | null
  celdas: ResultadoPTCelda[]
}

export type Contaminante = (typeof CONTAMINANTES)[number]
export type EstadoRonda = 'borrador' | 'activa' | 'cerrada'

export type RondaContaminante = {
  id: string
  ronda_id: string
  contaminante: Contaminante
  niveles: number
  replicas: 2 | 3
}

export type Ronda = {
  id: string
  codigo: string
  nombre: string
  estado: EstadoRonda
  created_at: string
  contaminantes: RondaContaminante[]
  participantes_planeados?: number
  participantes_asignados?: number
}

export type EnvioPTWithRelations = EnvioPT & {
  pt_item: RondaPTItem
  sample_group: RondaPTSampleGroup
  participante: RondaParticipantePT
}

type RondaRow = {
  id: string
  codigo: string
  nombre: string
  estado: EstadoRonda
  created_at: string
  ronda_contaminantes: RondaContaminante[] | null
  participantes_planeados?: number
  participantes_asignados?: number
}

function getSlotToken(workosUserId: string): string | null {
  return workosUserId.startsWith(PENDING_PARTICIPANTE_PREFIX)
    ? workosUserId.slice(PENDING_PARTICIPANTE_PREFIX.length)
    : null
}

function normalizeParticipantProfile(
  profile: string | null | undefined
): ParticipantePerfil {
  return profile === 'member_special' ? 'member_special' : 'member'
}

export function isMemberSpecialRole(role: string | null | undefined): boolean {
  if (!role) return false
  return MEMBER_SPECIAL_ROLES.includes(role.toLowerCase() as (typeof MEMBER_SPECIAL_ROLES)[number])
}

export async function getRonda(id: string): Promise<Ronda | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('rondas')
    .select(
      `
        id,
        codigo,
        nombre,
        estado,
        created_at,
        ronda_contaminantes (
          id,
          ronda_id,
          contaminante,
          niveles,
          replicas
        )
      `
    )
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    ...(data satisfies RondaRow),
    contaminantes: ((data as RondaRow).ronda_contaminantes ?? []).sort((a, b) =>
      CONTAMINANTES.indexOf(a.contaminante) - CONTAMINANTES.indexOf(b.contaminante)
    ),
  }
}

export async function listParticipantes(rondaId: string): Promise<RondaParticipante[]> {
  const { data: rows, error } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select('id, ronda_id, workos_user_id, email, invitado_at, participant_profile')
    .eq('ronda_id', rondaId)
    .order('invitado_at', { ascending: true })

  if (error) throw new Error(`No fue posible cargar los participantes: ${error.message}`)
  if (!rows || rows.length === 0) return []

  const participanteIds = rows.map((row) => row.id)
  const { data: envioRows } = await getSupabaseAdmin()
    .from('envios_pt')
    .select('ronda_participante_id')
    .eq('ronda_id', rondaId)
    .in('ronda_participante_id', participanteIds)

  const envioCountByParticipante = (envioRows ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.ronda_participante_id] = (acc[e.ronda_participante_id] ?? 0) + 1
    return acc
  }, {})

  return rows.map((p) => ({
    ...p,
    participant_profile: normalizeParticipantProfile(p.participant_profile),
    envios_count: envioCountByParticipante[p.id] ?? 0,
    estado: p.workos_user_id.startsWith(PENDING_PARTICIPANTE_PREFIX) ? 'pendiente' : 'asignado',
    slot_token: getSlotToken(p.workos_user_id),
  }))
}

export async function listResultadosRonda(rondaId: string): Promise<ResultadoParticipante[]> {
  const ronda = await getRonda(rondaId)
  if (!ronda) throw new Error('La ronda no existe.')

  const participantes = await listParticipantes(rondaId)
  const { data: envioRows, error } = await getSupabaseAdmin()
    .from('envios')
    .select('*')
    .eq('ronda_id', rondaId)
    .order('contaminante', { ascending: true })
    .order('nivel', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`No fue posible cargar los envios: ${error.message}`)

  const totalEsperado = ronda.contaminantes.reduce((sum, item) => sum + item.niveles, 0)
  const enviosPorUsuario = (envioRows ?? []).reduce<Record<string, Envio[]>>((acc, envio) => {
    const key = envio.workos_user_id
    acc[key] ??= []
    acc[key].push(envio as Envio)
    return acc
  }, {})

  return participantes.map((participante) => {
    const envios = enviosPorUsuario[participante.workos_user_id] ?? []
    const completados = envios.length
    const enviadosAt = envios.reduce<string | null>((latest, envio) => {
      if (!latest) return envio.updated_at
      return new Date(envio.updated_at) > new Date(latest) ? envio.updated_at : latest
    }, null)

    return {
      workos_user_id: participante.workos_user_id,
      email: participante.email,
      completados,
      total_esperado: totalEsperado,
      porcentaje_completitud:
        totalEsperado > 0 ? Math.round((completados / totalEsperado) * 100) : 0,
      enviados_at: enviadosAt,
      envios,
    }
  })
}

export function buildResultadosCsv(resultados: ResultadoParticipante[]): string {
  const header = [
    'participant_id',
    'participant_email',
    'pollutant',
    'level',
    'mean_value',
    'uncertainty',
    'submitted_at',
  ]

  const rows = resultados.flatMap((resultado) =>
    resultado.envios.map((envio) => [
      resultado.workos_user_id,
      resultado.email,
      envio.contaminante.toLowerCase(),
      String(envio.nivel),
      ...envio.valores.map((value) => String(value)),
      envio.promedio != null ? String(envio.promedio) : '',
      envio.incertidumbre != null ? String(envio.incertidumbre) : '',
      envio.submitted_at,
    ])
  )

  const maxReplicas = Math.max(0, ...resultados.flatMap((r) => r.envios.map((e) => e.valores.length)))
  const replicaHeaders = Array.from({ length: maxReplicas }, (_, index) => `replicate_${index + 1}`)
  const csvRows = [[...header.slice(0, 4), ...replicaHeaders, ...header.slice(4)]]

  for (const row of rows) {
    const base = row.slice(0, 4)
    const replicas = row.slice(4, row.length - 3)
    const tail = row.slice(row.length - 3)
    const paddedReplicas = [...replicas, ...Array(Math.max(0, maxReplicas - replicas.length)).fill('')]
    csvRows.push([...base, ...paddedReplicas, ...tail])
  }

  return csvRows
    .map((row) =>
      row
        .map((value) => {
          const normalized = String(value ?? '')
          return /[",\n]/.test(normalized)
            ? `"${normalized.replace(/"/g, '""')}"`
            : normalized
        })
        .join(',')
    )
    .join('\n')
}

export async function getRondaByCodigo(codigo: string): Promise<Ronda | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('rondas')
    .select(
      `id, codigo, nombre, estado, created_at,
       ronda_contaminantes (id, ronda_id, contaminante, niveles, replicas)`
    )
    .eq('codigo', codigo)
    .single()

  if (error || !data) return null

  return {
    ...(data satisfies RondaRow),
    contaminantes: ((data as RondaRow).ronda_contaminantes ?? []).sort((a, b) =>
      CONTAMINANTES.indexOf(a.contaminante) - CONTAMINANTES.indexOf(b.contaminante)
    ),
  }
}

export async function claimParticipanteToken(
  rondaId: string,
  token: string,
  userId: string,
  email: string,
  role?: string | null,
): Promise<'claimed' | 'already-assigned' | 'invalid'> {
  const normalizedToken = token.trim()
  if (!normalizedToken) return 'invalid'

  const admin = getSupabaseAdmin()

  const { data: assigned } = await admin
    .from('ronda_participantes')
    .select('id')
    .eq('ronda_id', rondaId)
    .eq('workos_user_id', userId)
    .maybeSingle()

  if (assigned) return 'already-assigned'

  const placeholderId = `${PENDING_PARTICIPANTE_PREFIX}${normalizedToken}`
  const { data: slot } = await admin
    .from('ronda_participantes')
    .select('id, participant_profile')
    .eq('ronda_id', rondaId)
    .eq('workos_user_id', placeholderId)
    .maybeSingle()

  if (!slot) return 'invalid'

  const { error } = await admin
    .from('ronda_participantes')
    .update({
      workos_user_id: userId,
      email,
      invitado_at: new Date().toISOString(),
      claimed_at: new Date().toISOString(),
    })
    .eq('id', slot.id)
    .eq('ronda_id', rondaId)
    .eq('workos_user_id', placeholderId)

  if (error) {
    if (error.code === '23505') return 'already-assigned'
    throw new Error(`No fue posible reclamar el enlace del participante: ${error.message}`)
  }

  return 'claimed'
}

export async function isInvitado(rondaId: string, userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select('id')
    .eq('ronda_id', rondaId)
    .eq('workos_user_id', userId)
    .maybeSingle()
  return !!data
}

export async function listEnvios(rondaId: string, userId: string): Promise<Envio[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('envios')
    .select('*')
    .eq('ronda_id', rondaId)
    .eq('workos_user_id', userId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Envio[]
}

export type EstadoEnvioParticipante = {
  completo: boolean
  enviado: boolean
  enviados_at: string | null
  total_esperado: number
  total_guardado: number
}

export async function getEstadoEnvioParticipante(
  rondaId: string,
  userId: string
): Promise<EstadoEnvioParticipante> {
  const ronda = await getRonda(rondaId)
  if (!ronda) {
    return {
      completo: false,
      enviado: false,
      enviados_at: null,
      total_esperado: 0,
      total_guardado: 0,
    }
  }

  const envios = await listEnvios(rondaId, userId)
  const totalEsperado = ronda.contaminantes.reduce((sum, item) => sum + item.niveles, 0)
  const completo = envios.length === totalEsperado && totalEsperado > 0
  const marcasEnvio = Array.from(new Set(envios.map((envio) => envio.submitted_at)))
  const enviado = completo && marcasEnvio.length === 1

  return {
    completo,
    enviado,
    enviados_at: enviado ? marcasEnvio[0] ?? null : null,
    total_esperado: totalEsperado,
    total_guardado: envios.length,
  }
}

export type CeldaParticipante = {
  email: string
  userId: string
  promedio: number | null
  incertidumbre: number | null
  valores: number[]
}

export type ResultadoNivel = {
  nivel: number
  participantes: CeldaParticipante[]
  media: number | null
  desviacion: number | null
  cv: number | null
}

export type ResultadoContaminante = {
  contaminante: Contaminante
  replicas: number
  niveles: ResultadoNivel[]
}

export async function listResultados(rondaId: string): Promise<ResultadoContaminante[]> {
  const ronda = await getRonda(rondaId)
  if (!ronda) return []

  const { data: participantesRows } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select('workos_user_id, email')
    .eq('ronda_id', rondaId)
    .order('invitado_at', { ascending: true })

  const participantes = participantesRows ?? []

  const { data: enviosRows } = await getSupabaseAdmin()
    .from('envios')
    .select('workos_user_id, contaminante, nivel, valores, promedio, incertidumbre')
    .eq('ronda_id', rondaId)

  type EnvioRow = {
    workos_user_id: string
    contaminante: Contaminante
    nivel: number
    valores: number[]
    promedio: number | null
    incertidumbre: number | null
  }

  const envios = (enviosRows ?? []) as EnvioRow[]
  const envioIndex = new Map<string, EnvioRow>()
  for (const e of envios) {
    envioIndex.set(`${e.workos_user_id}|${e.contaminante}|${e.nivel}`, e)
  }

  return ronda.contaminantes.map((rc) => {
    const niveles: ResultadoNivel[] = Array.from({ length: rc.niveles }, (_, i) => {
      const nivelNum = i + 1

      const partData: CeldaParticipante[] = participantes.map((p) => {
        const envio = envioIndex.get(`${p.workos_user_id}|${rc.contaminante}|${nivelNum}`)
        return {
          email: p.email,
          userId: p.workos_user_id,
          promedio: envio?.promedio ?? null,
          incertidumbre: envio?.incertidumbre ?? null,
          valores: envio?.valores ?? [],
        }
      })

      const vals = partData.map((p) => p.promedio).filter((v): v is number => v !== null)
      let media: number | null = null
      let desviacion: number | null = null
      let cv: number | null = null

      if (vals.length > 0) {
        media = vals.reduce((a, b) => a + b, 0) / vals.length
        if (vals.length > 1) {
          const variance =
            vals.reduce((acc, v) => acc + (v - media!) ** 2, 0) / (vals.length - 1)
          desviacion = Math.sqrt(variance)
          if (media !== 0) cv = (desviacion / Math.abs(media)) * 100
        }
      }

      return { nivel: nivelNum, participantes: partData, media, desviacion, cv }
    })

    return { contaminante: rc.contaminante, replicas: rc.replicas, niveles }
  })
}

export type RondaParticipanteAsignada = Ronda & { invitado_at: string }

export async function listRondasParticipante(userId: string): Promise<RondaParticipanteAsignada[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select(
      `
        invitado_at,
        rondas (
          id, codigo, nombre, estado, created_at,
          ronda_contaminantes (id, ronda_id, contaminante, niveles, replicas)
        )
      `
    )
    .eq('workos_user_id', userId)
    .order('invitado_at', { ascending: false })

  if (error) throw new Error(`No fue posible cargar las rondas: ${error.message}`)

  return (data ?? []).flatMap((row) => {
    const ronda = row.rondas as unknown as RondaRow | null
    if (!ronda) return []
    return [
      {
        ...ronda,
        invitado_at: row.invitado_at,
        contaminantes: ((ronda.ronda_contaminantes ?? []) as RondaContaminante[]).sort(
          (a, b) => CONTAMINANTES.indexOf(a.contaminante) - CONTAMINANTES.indexOf(b.contaminante)
        ),
      },
    ]
  })
}

export type ParticipanteGlobal = {
  workos_user_id: string
  email: string
  rondas: {
    id: string
    codigo: string
    nombre: string
    estado: EstadoRonda
    envios_count: number
  }[]
  total_envios: number
}

export async function listAllParticipantes(): Promise<ParticipanteGlobal[]> {
  const admin = getSupabaseAdmin()

  const { data: rows, error } = await admin
    .from('ronda_participantes')
    .select(`
      workos_user_id,
      email,
      ronda_id,
      rondas (id, codigo, nombre, estado)
    `)
    .order('email', { ascending: true })

  if (error) throw new Error(`No fue posible cargar los participantes: ${error.message}`)
  if (!rows || rows.length === 0) return []

  // Exclude pending placeholder slots
  const claimed = rows.filter((r) => !r.workos_user_id.startsWith(PENDING_PARTICIPANTE_PREFIX))

  // Fetch envio counts per user across all rounds
  const { data: envioRows } = await admin
    .from('envios')
    .select('workos_user_id, ronda_id')

  const envioCount = (envioRows ?? []).reduce<Record<string, Record<string, number>>>((acc, e) => {
    acc[e.workos_user_id] ??= {}
    acc[e.workos_user_id][e.ronda_id] = (acc[e.workos_user_id][e.ronda_id] ?? 0) + 1
    return acc
  }, {})

  // Group by user
  const grouped = new Map<string, ParticipanteGlobal>()

  for (const row of claimed) {
    const ronda = row.rondas as unknown as { id: string; codigo: string; nombre: string; estado: EstadoRonda } | null
    if (!ronda) continue

    let entry = grouped.get(row.workos_user_id)
    if (!entry) {
      entry = {
        workos_user_id: row.workos_user_id,
        email: row.email,
        rondas: [],
        total_envios: 0,
      }
      grouped.set(row.workos_user_id, entry)
    }

    const rondaEnvios = envioCount[row.workos_user_id]?.[ronda.id] ?? 0
    entry.rondas.push({
      ...ronda,
      envios_count: rondaEnvios,
    })
    entry.total_envios += rondaEnvios
  }

  return Array.from(grouped.values())
}

export async function listRondas(): Promise<Ronda[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('rondas')
    .select(
      `
        id,
        codigo,
        nombre,
        estado,
        created_at,
        ronda_contaminantes (
          id,
          ronda_id,
          contaminante,
          niveles,
          replicas
        )
      `
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No fue posible cargar las rondas: ${error.message}`)
  }

  const rounds = (data satisfies RondaRow[]).map((row) => ({
    ...row,
    contaminantes: (row.ronda_contaminantes ?? []).sort((a, b) =>
      CONTAMINANTES.indexOf(a.contaminante) - CONTAMINANTES.indexOf(b.contaminante)
    ),
  }))

  const roundIds = rounds.map((round) => round.id)
  if (roundIds.length === 0) return rounds

  const { data: participantRows, error: participantError } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select('ronda_id, workos_user_id')
    .in('ronda_id', roundIds)

  if (participantError) {
    throw new Error(`No fue posible cargar los participantes planeados: ${participantError.message}`)
  }

  const counts = (participantRows ?? []).reduce<
    Record<string, { planeados: number; asignados: number }>
  >((acc, row) => {
    acc[row.ronda_id] ??= { planeados: 0, asignados: 0 }
    acc[row.ronda_id].planeados += 1
    if (!row.workos_user_id.startsWith(PENDING_PARTICIPANTE_PREFIX)) {
      acc[row.ronda_id].asignados += 1
    }
    return acc
  }, {})

  return rounds.map((round) => ({
    ...round,
    participantes_planeados: counts[round.id]?.planeados ?? 0,
    participantes_asignados: counts[round.id]?.asignados ?? 0,
  }))
}

export async function listPTItems(rondaId: string): Promise<RondaPTItem[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_pt_items')
    .select('*')
    .eq('ronda_id', rondaId)
    .order('contaminante', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`No fue posible cargar los items PT: ${error.message}`)
  return (data ?? []) as RondaPTItem[]
}

export async function listPTSampleGroups(rondaId: string): Promise<RondaPTSampleGroup[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_pt_sample_groups')
    .select('*')
    .eq('ronda_id', rondaId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`No fue posible cargar los grupos de muestra PT: ${error.message}`)
  return (data ?? []) as RondaPTSampleGroup[]
}

export async function getRondaParticipantePT(
  rondaId: string,
  userId: string
): Promise<RondaParticipantePT | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select(
      'id, ronda_id, workos_user_id, email, invitado_at, participant_profile, participant_code, replicate_code, claimed_at'
    )
    .eq('ronda_id', rondaId)
    .eq('workos_user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`No fue posible cargar el participante PT: ${error.message}`)
  if (!data) return null
  return {
    ...(data as RondaParticipantePT),
    participant_profile: normalizeParticipantProfile(data.participant_profile),
  }
}

export async function listEnviosPT(rondaId: string, userId: string): Promise<EnvioPT[]> {
  const participante = await getRondaParticipantePT(rondaId, userId)
  if (!participante) return []

  const { data, error } = await getSupabaseAdmin()
    .from('envios_pt')
    .select('*')
    .eq('ronda_id', rondaId)
    .eq('ronda_participante_id', participante.id)

  if (error) throw new Error(`No fue posible cargar los envios PT: ${error.message}`)
  return (data ?? []) as EnvioPT[]
}

export async function getEnvioPT(
  rondaParticipanteId: string,
  ptItemId: string,
  sampleGroupId: string
): Promise<EnvioPT | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('envios_pt')
    .select('*')
    .eq('ronda_participante_id', rondaParticipanteId)
    .eq('pt_item_id', ptItemId)
    .eq('sample_group_id', sampleGroupId)
    .maybeSingle()

  if (error) throw new Error(`No fue posible cargar el envio PT: ${error.message}`)
  return data as EnvioPT | null
}

export async function upsertEnvioPT(
  rondaId: string,
  rondaParticipanteId: string,
  ptItemId: string,
  sampleGroupId: string,
  d1: number,
  d2: number,
  d3: number,
  meanValue: number,
  sdValue: number,
  ux: number,
  uxExp: number,
): Promise<EnvioPT> {
  const { data, error } = await getSupabaseAdmin()
    .from('envios_pt')
    .upsert(
      {
        ronda_id: rondaId,
        ronda_participante_id: rondaParticipanteId,
        pt_item_id: ptItemId,
        sample_group_id: sampleGroupId,
        d1,
        d2,
        d3,
        mean_value: meanValue,
        sd_value: sdValue,
        ux,
        ux_exp: uxExp,
        draft_saved_at: new Date().toISOString(),
      },
      { onConflict: 'ronda_participante_id,pt_item_id,sample_group_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`No fue posible guardar el envio PT: ${error.message}`)
  return data as EnvioPT
}

export async function submitFinalPT(rondaId: string, userId: string): Promise<string> {
  const participante = await getRondaParticipantePT(rondaId, userId)
  if (!participante) throw new Error('Participante no encontrado')

  const items = await listPTItems(rondaId)
  const sampleGroups = await listPTSampleGroups(rondaId)
  const expectedCount = items.length * sampleGroups.length

  const { count } = await getSupabaseAdmin()
    .from('envios_pt')
    .select('*', { count: 'exact', head: true })
    .eq('ronda_id', rondaId)
    .eq('ronda_participante_id', participante.id)

  if (count !== expectedCount) {
    throw new Error('Faltan datos para completar el envio final')
  }

  const submittedAt = new Date().toISOString()
  const { error } = await getSupabaseAdmin()
    .from('envios_pt')
    .update({ final_submitted_at: submittedAt })
    .eq('ronda_id', rondaId)
    .eq('ronda_participante_id', participante.id)

  if (error) throw new Error(`No fue posible enviar el informe final PT: ${error.message}`)
  return submittedAt
}

export async function getEstadoEnvioPTParticipante(
  rondaId: string,
  userId: string
): Promise<EstadoEnvioParticipante> {
  const items = await listPTItems(rondaId)
  const sampleGroups = await listPTSampleGroups(rondaId)
  const totalEsperado = items.length * sampleGroups.length

  const participante = await getRondaParticipantePT(rondaId, userId)
  if (!participante) {
    return {
      completo: false,
      enviado: false,
      enviados_at: null,
      total_esperado: 0,
      total_guardado: 0,
    }
  }

  const { count } = await getSupabaseAdmin()
    .from('envios_pt')
    .select('*', { count: 'exact', head: true })
    .eq('ronda_id', rondaId)
    .eq('ronda_participante_id', participante.id)

  const totalGuardado = count ?? 0
  const completo = totalGuardado === totalEsperado && totalEsperado > 0

  let enviado = false
  let enviadosAt: string | null = null

  if (completo) {
    const { data: enviosFinalizados } = await getSupabaseAdmin()
      .from('envios_pt')
      .select('final_submitted_at')
      .eq('ronda_id', rondaId)
      .eq('ronda_participante_id', participante.id)
      .not('final_submitted_at', 'is', null)
    const marcas = Array.from(
      new Set((enviosFinalizados ?? []).map((row) => row.final_submitted_at).filter(Boolean))
    ) as string[]
    if (marcas.length === 1) {
      enviado = true
      enviadosAt = marcas[0]
    }
  }

  return {
    completo,
    enviado,
    enviados_at: enviadosAt,
    total_esperado: totalEsperado,
    total_guardado: totalGuardado,
  }
}

export async function listResultadosPTRonda(rondaId: string): Promise<ResultadoParticipantePT[]> {
  const [participantes, items, sampleGroups] = await Promise.all([
    listParticipantesPT(rondaId),
    listPTItems(rondaId),
    listPTSampleGroups(rondaId),
  ])

  const totalEsperado = items.length * sampleGroups.length
  const { data, error } = await getSupabaseAdmin()
    .from('envios_pt')
    .select(
      'ronda_participante_id, pt_item_id, sample_group_id, mean_value, sd_value, draft_saved_at, final_submitted_at, updated_at'
    )
    .eq('ronda_id', rondaId)

  if (error) throw new Error(`No fue posible cargar los resultados PT: ${error.message}`)

  const enviosPorParticipante = (data ?? []).reduce<Record<string, ResultadoPTCelda[]>>((acc, row) => {
    acc[row.ronda_participante_id] ??= []
    acc[row.ronda_participante_id].push({
      pt_item_id: row.pt_item_id,
      sample_group_id: row.sample_group_id,
      mean_value: row.mean_value,
      sd_value: row.sd_value,
      draft_saved_at: row.draft_saved_at,
      final_submitted_at: row.final_submitted_at,
      updated_at: row.updated_at,
    })
    return acc
  }, {})

  return participantes.map((participante) => {
    const celdas = enviosPorParticipante[participante.id] ?? []
    const completados = celdas.length
    const marcas = Array.from(
      new Set(celdas.map((celda) => celda.final_submitted_at).filter(Boolean))
    ) as string[]

    return {
      participante_id: participante.id,
      workos_user_id: participante.workos_user_id,
      email: participante.email,
      participant_code: participante.participant_code,
      replicate_code: participante.replicate_code,
      completados,
      total_esperado: totalEsperado,
      porcentaje_completitud: totalEsperado > 0 ? Math.round((completados / totalEsperado) * 100) : 0,
      enviados_at: marcas.length === 1 ? marcas[0] : null,
      celdas,
    }
  })
}

export async function listAllEnviosPT(rondaId: string): Promise<EnvioPTWithRelations[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('envios_pt')
    .select(`
      *,
      pt_item!inner (*),
      sample_group!inner (*),
      ronda_participante!inner (*)
    `)
    .eq('ronda_id', rondaId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`No fue posible cargar los envios PT: ${error.message}`)
  return (data ?? []) as EnvioPTWithRelations[]
}

export async function listParticipantesPT(rondaId: string): Promise<RondaParticipantePT[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .select(
      'id, ronda_id, workos_user_id, email, invitado_at, participant_profile, participant_code, replicate_code, claimed_at'
    )
    .eq('ronda_id', rondaId)
    .order('invitado_at', { ascending: true })

  if (error) throw new Error(`No fue posible cargar los participantes PT: ${error.message}`)
  return (data ?? []).map((item) => ({
    ...(item as RondaParticipantePT),
    participant_profile: normalizeParticipantProfile(item.participant_profile),
  }))
}

export async function createPTItem(
  rondaId: string,
  contaminante: Contaminante,
  runCode: string,
  levelLabel: string,
  sortOrder: number
): Promise<RondaPTItem> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_pt_items')
    .insert({
      ronda_id: rondaId,
      contaminante,
      run_code: runCode,
      level_label: levelLabel,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw new Error(`No fue posible crear el item PT: ${error.message}`)
  return data as RondaPTItem
}

export async function createPTSampleGroup(
  rondaId: string,
  sampleGroup: string,
  sortOrder: number
): Promise<RondaPTSampleGroup> {
  const { data, error } = await getSupabaseAdmin()
    .from('ronda_pt_sample_groups')
    .insert({
      ronda_id: rondaId,
      sample_group: sampleGroup,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw new Error(`No fue posible crear el grupo de muestra PT: ${error.message}`)
  return data as RondaPTSampleGroup
}

export async function updateParticipantePT(
  participanteId: string,
  participantCode: string | null,
  replicateCode: number | null
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('ronda_participantes')
    .update({
      participant_code: participantCode,
      replicate_code: replicateCode,
    })
    .eq('id', participanteId)

  if (error) throw new Error(`No fue posible actualizar el participante PT: ${error.message}`)
}

export async function deletePTItem(itemId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('ronda_pt_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(`No fue posible eliminar el item PT: ${error.message}`)
}

export async function deletePTSampleGroup(groupId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('ronda_pt_sample_groups')
    .delete()
    .eq('id', groupId)

  if (error) throw new Error(`No fue posible eliminar el grupo de muestra PT: ${error.message}`)
}

export async function listEnviosPTRound(rondaId: string): Promise<EnvioPTConMetadatos[]> {
  const admin = getSupabaseAdmin()

  const { data: enviosPT, error: enviosError } = await admin
    .from('envios_pt')
    .select(`
      id,
      ronda_id,
      ronda_participante_id,
      pt_item_id,
      sample_group_id,
      mean_value,
      sd_value,
      draft_saved_at,
      final_submitted_at,
      updated_at,
      ronda_participantes (
        id,
        ronda_id,
        workos_user_id,
        email,
        invitado_at,
        participant_code,
        replicate_code,
        claimed_at
      ),
      ronda_pt_items (
        id,
        ronda_id,
        contaminante,
        run_code,
        level_label,
        sort_order,
        created_at
      ),
      ronda_pt_sample_groups (
        id,
        ronda_id,
        sample_group,
        sort_order,
        created_at
      )
    `)
    .eq('ronda_id', rondaId)
    .order('draft_saved_at', { ascending: true })

  if (enviosError) {
    throw new Error(`No fue posible cargar los envíos PT: ${enviosError.message}`)
  }

  if (!enviosPT || enviosPT.length === 0) {
    return []
  }

  type EnvioPTRow = {
    id: string
    ronda_id: string
    ronda_participante_id: string
    pt_item_id: string
    sample_group_id: string
    d1: number | null
    d2: number | null
    d3: number | null
    mean_value: number
    sd_value: number
    ux: number | null
    ux_exp: number | null
    draft_saved_at: string
    final_submitted_at: string | null
    updated_at: string
    ronda_participantes: RondaParticipantePT[]
    ronda_pt_items: RondaPTItem[]
    ronda_pt_sample_groups: RondaPTSampleGroup[]
  }

  const rows = enviosPT as EnvioPTRow[]

  const exported = rows
    .filter((row) => row.final_submitted_at != null)
    .map((row) => ({
      pollutant: row.ronda_pt_items[0]?.contaminante.toLowerCase() ?? '',
      run: row.ronda_pt_items[0]?.run_code ?? '',
      level: row.ronda_pt_items[0]?.level_label ?? '',
      participant_id: row.ronda_participantes[0]?.participant_code ?? '',
      replicate: row.ronda_participantes[0]?.replicate_code ?? 0,
      sample_group: row.ronda_pt_sample_groups[0]?.sample_group ?? '',
      d1: row.d1,
      d2: row.d2,
      d3: row.d3,
      mean_value: row.mean_value,
      sd_value: row.sd_value,
      ux: row.ux,
      ux_exp: row.ux_exp,
    }))
    .filter((row) => row.participant_id && row.replicate > 0)

  exported.sort((a, b) => {
    if (a.pollutant !== b.pollutant) return a.pollutant.localeCompare(b.pollutant)
    if (a.run !== b.run) return a.run.localeCompare(b.run)
    if (a.level !== b.level) return a.level.localeCompare(b.level)
    if (a.participant_id !== b.participant_id) return a.participant_id.localeCompare(b.participant_id)
    if (a.replicate !== b.replicate) return a.replicate - b.replicate
    return a.sample_group.localeCompare(b.sample_group)
  })

  return exported
}

export function buildPTCsv(envios: EnvioPTConMetadatos[]): string {
  const header = [
    'pollutant',
    'run',
    'level',
    'participant_id',
    'replicate',
    'sample_group',
    'd1',
    'd2',
    'd3',
    'mean_value',
    'sd_value',
    'ux',
    'ux_exp',
  ]

  const rows = envios.map((envio) => [
    envio.pollutant,
    envio.run,
    envio.level,
    envio.participant_id,
    String(envio.replicate),
    envio.sample_group,
    envio.d1 != null ? String(envio.d1) : '',
    envio.d2 != null ? String(envio.d2) : '',
    envio.d3 != null ? String(envio.d3) : '',
    String(envio.mean_value),
    String(envio.sd_value),
    envio.ux != null ? String(envio.ux) : '',
    envio.ux_exp != null ? String(envio.ux_exp) : '',
  ])

  const csvRows = [header, ...rows]

  return csvRows
    .map((row) =>
      row
        .map((value) => {
          const normalized = String(value ?? '')
          return /[",\n]/.test(normalized)
            ? `"${normalized.replace(/"/g, '""')}"`
            : normalized
        })
        .join(',')
    )
    .join('\n')
}
