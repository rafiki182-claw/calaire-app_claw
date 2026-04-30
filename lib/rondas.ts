import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

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

export type RondaPTItemInput = {
  runCode: string
  levelLabel: string
  sortOrder: number
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

export type ParticipanteRondaResumen = {
  ronda_participante_id: string
  ronda_id: string
  email: string
  workos_user_id: string | null
  participant_profile: ParticipantePerfil
  participant_code: string | null
  replicate_code: number | null
  estado: 'pendiente' | 'reclamado'
  slot_token: string | null
  claimed_at: string | null
  invitado_at: string
  ficha_estado: 'no_iniciada' | 'borrador' | 'enviado'
  envios_pt_count: number
  tiene_envio_final: boolean
}

export type FiltroParticipante =
  | 'todos'
  | 'enlace_pendiente'   // estado === 'pendiente'
  | 'ficha_pendiente'    // estado === 'reclamado' && ficha_estado !== 'enviado'
  | 'ficha_enviada'      // ficha_estado === 'enviado'
  | 'con_envios'         // envios_pt_count > 0
  | 'sin_envios'         // estado === 'reclamado' && envios_pt_count === 0

export function filtrarParticipantes(
  participantes: ParticipanteRondaResumen[],
  filtro: FiltroParticipante
): ParticipanteRondaResumen[] {
  switch (filtro) {
    case 'enlace_pendiente':
      return participantes.filter((p) => p.estado === 'pendiente')
    case 'ficha_pendiente':
      return participantes.filter(
        (p) => p.estado === 'reclamado' && p.ficha_estado !== 'enviado'
      )
    case 'ficha_enviada':
      return participantes.filter((p) => p.ficha_estado === 'enviado')
    case 'con_envios':
      return participantes.filter((p) => p.envios_pt_count > 0)
    case 'sin_envios':
      return participantes.filter(
        (p) => p.estado === 'reclamado' && p.envios_pt_count === 0
      )
    default:
      return participantes
  }
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

// ---------------------------------------------------------------------------
// Pure helpers — unchanged
// ---------------------------------------------------------------------------

export function isMemberSpecialRole(role: string | null | undefined): boolean {
  if (!role) return false
  return MEMBER_SPECIAL_ROLES.includes(role.toLowerCase() as (typeof MEMBER_SPECIAL_ROLES)[number])
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

// ---------------------------------------------------------------------------
// Internal field-mapping helpers
// ---------------------------------------------------------------------------

function msToISO(ms: number): string {
  return new Date(ms).toISOString()
}

function optMsToISO(ms: number | undefined | null): string | null {
  return ms != null ? new Date(ms).toISOString() : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContaminanteDoc(c: any): RondaContaminante {
  return {
    id: c._id as string,
    ronda_id: c.rondaId as string,
    contaminante: c.contaminante as Contaminante,
    niveles: c.niveles as number,
    replicas: c.replicas as 2 | 3,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRondaWithContaminantes(r: any): Ronda {
  return {
    id: r._id as string,
    codigo: r.codigo as string,
    nombre: r.nombre as string,
    estado: r.estado as EstadoRonda,
    created_at: msToISO(r.createdAt as number),
    contaminantes: (r.contaminantes as unknown[]).map(mapContaminanteDoc),
    participantes_planeados: r.participantes_planeados as number | undefined,
    participantes_asignados: r.participantes_asignados as number | undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapParticipanteDoc(p: any): RondaParticipante {
  return {
    id: p._id as string,
    ronda_id: p.rondaId as string,
    workos_user_id: p.workosUserId as string,
    email: p.email as string,
    invitado_at: msToISO(p.invitadoAt as number),
    participant_profile: (p.participantProfile ?? 'member') as ParticipantePerfil,
    envios_count: (p.envios_count ?? 0) as number,
    estado: (p.estado ?? (String(p.workosUserId).startsWith(PENDING_PARTICIPANTE_PREFIX) ? 'pendiente' : 'asignado')) as 'pendiente' | 'asignado',
    slot_token: (p.slot_token ?? null) as string | null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapParticipanteRondaResumenDoc(p: any): ParticipanteRondaResumen {
  const enviosPtCount = (p.envios_pt_count ?? 0) as number
  return {
    ronda_participante_id: p.ronda_participante_id as string,
    ronda_id: p.ronda_id as string,
    email: p.email as string,
    workos_user_id: (p.workos_user_id ?? null) as string | null,
    participant_profile: (p.participant_profile ?? 'member') as ParticipantePerfil,
    participant_code: (p.participant_code ?? null) as string | null,
    replicate_code: (p.replicate_code ?? null) as number | null,
    estado: p.estado as 'pendiente' | 'reclamado',
    slot_token: (p.slot_token ?? null) as string | null,
    claimed_at: (p.claimed_at ?? null) as string | null,
    invitado_at: p.invitado_at as string,
    ficha_estado: p.ficha_estado as 'no_iniciada' | 'borrador' | 'enviado',
    envios_pt_count: enviosPtCount,
    tiene_envio_final: enviosPtCount > 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEnvioDoc(e: any): Envio {
  return {
    id: e._id as string,
    ronda_id: e.rondaId as string,
    workos_user_id: e.workosUserId as string,
    contaminante: e.contaminante as Contaminante,
    nivel: e.nivel as number,
    valores: e.valores as number[],
    promedio: (e.promedio ?? null) as number | null,
    incertidumbre: (e.incertidumbre ?? null) as number | null,
    submitted_at: msToISO(e.submittedAt as number),
    updated_at: msToISO(e.updatedAt as number),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPTItemDoc(item: any): RondaPTItem {
  return {
    id: item._id as string,
    ronda_id: item.rondaId as string,
    contaminante: item.contaminante as Contaminante,
    run_code: item.runCode as string,
    level_label: item.levelLabel as string,
    sort_order: item.sortOrder as number,
    created_at: msToISO(item.createdAt as number),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPTSampleGroupDoc(g: any): RondaPTSampleGroup {
  return {
    id: g._id as string,
    ronda_id: g.rondaId as string,
    sample_group: g.sampleGroup as string,
    sort_order: g.sortOrder as number,
    created_at: msToISO(g.createdAt as number),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapParticipantePTDoc(p: any): RondaParticipantePT {
  return {
    id: p._id as string,
    ronda_id: p.rondaId as string,
    workos_user_id: p.workosUserId as string,
    email: p.email as string,
    invitado_at: msToISO(p.invitadoAt as number),
    participant_profile: (p.participantProfile ?? 'member') as ParticipantePerfil,
    participant_code: (p.participantCode ?? null) as string | null,
    replicate_code: (p.replicateCode ?? null) as number | null,
    claimed_at: optMsToISO(p.claimedAt),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEnvioPTDoc(e: any): EnvioPT {
  return {
    id: e._id as string,
    ronda_id: e.rondaId as string,
    ronda_participante_id: e.rondaParticipanteId as string,
    pt_item_id: e.ptItemId as string,
    sample_group_id: e.sampleGroupId as string,
    d1: (e.d1 ?? null) as number | null,
    d2: (e.d2 ?? null) as number | null,
    d3: (e.d3 ?? null) as number | null,
    mean_value: e.meanValue as number,
    sd_value: e.sdValue as number,
    ux: (e.ux ?? null) as number | null,
    ux_exp: (e.uxExp ?? null) as number | null,
    draft_saved_at: msToISO(e.draftSavedAt as number),
    final_submitted_at: optMsToISO(e.finalSubmittedAt),
    updated_at: msToISO(e.updatedAt as number),
  }
}

// ---------------------------------------------------------------------------
// Rondas — read
// ---------------------------------------------------------------------------

export async function getRonda(id: string): Promise<Ronda | null> {
  const result = await fetchQuery(api.rondas.getRonda, { id: id as Id<'rondas'> })
  if (!result) return null
  return mapRondaWithContaminantes(result)
}

export async function getRondaByCodigo(codigo: string): Promise<Ronda | null> {
  const result = await fetchQuery(api.rondas.getRondaByCodigo, { codigo })
  if (!result) return null
  return mapRondaWithContaminantes(result)
}

export async function listRondas(): Promise<Ronda[]> {
  const results = await fetchQuery(api.rondas.listRondas, {})
  return results.map(mapRondaWithContaminantes)
}

// ---------------------------------------------------------------------------
// Participantes — read
// ---------------------------------------------------------------------------

export async function listParticipantes(rondaId: string): Promise<RondaParticipante[]> {
  const rows = await fetchQuery(api.rondas.listParticipantes, { rondaId: rondaId as Id<'rondas'> })
  return rows.map(mapParticipanteDoc)
}

export async function listParticipantesRondaResumen(
  rondaId: string
): Promise<ParticipanteRondaResumen[]> {
  const rows = await fetchQuery(api.rondas.listParticipantesRondaResumen, {
    rondaId: rondaId as Id<'rondas'>,
  })
  return rows.map(mapParticipanteRondaResumenDoc)
}

export async function listRondasParticipante(userId: string): Promise<RondaParticipanteAsignada[]> {
  const rows = await fetchQuery(api.rondas.listRondasParticipante, { userId })
  return rows.map((r) => ({
    ...mapRondaWithContaminantes(r),
    invitado_at: r.invitado_at as string,
    ronda_participante_id: r.ronda_participante_id as string,
    ficha_estado: r.ficha_estado as 'no_iniciada' | 'borrador' | 'enviado',
  }))
}

export async function listAllParticipantes(): Promise<ParticipanteGlobal[]> {
  const rows = await fetchQuery(api.rondas.listAllParticipantes, {})
  return rows.map((r) => ({
    workos_user_id: r.workos_user_id,
    email: r.email,
    total_envios: r.total_envios,
    rondas: r.rondas.map((ronda) => ({
      ...ronda,
      estado: ronda.estado as EstadoRonda,
    })),
  }))
}

export async function isInvitado(rondaId: string, userId: string): Promise<boolean> {
  return fetchQuery(api.rondas.isInvitado, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
}

// ---------------------------------------------------------------------------
// Envios regulares — read
// ---------------------------------------------------------------------------

export async function listEnvios(rondaId: string, userId: string): Promise<Envio[]> {
  const rows = await fetchQuery(api.rondas.listEnvios, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
  return rows.map(mapEnvioDoc)
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
  return fetchQuery(api.rondas.getEstadoEnvioParticipante, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
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
  return fetchQuery(api.rondas.listResultados, { rondaId: rondaId as Id<'rondas'> })
}

export async function listResultadosRonda(rondaId: string): Promise<ResultadoParticipante[]> {
  const rows = await fetchQuery(api.rondas.listResultadosRonda, { rondaId: rondaId as Id<'rondas'> })
  return rows.map((row) => ({
    workos_user_id: row.workos_user_id,
    email: row.email,
    completados: row.completados,
    total_esperado: row.total_esperado,
    porcentaje_completitud: row.porcentaje_completitud,
    enviados_at: row.enviados_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    envios: (row.envios as any[]).map(mapEnvioDoc),
  }))
}

// ---------------------------------------------------------------------------
// Mutations — participantes
// ---------------------------------------------------------------------------

export async function claimParticipanteToken(
  rondaId: string,
  token: string,
  userId: string,
  email: string,
): Promise<'claimed' | 'already-assigned' | 'invalid'> {
  return fetchMutation(api.rondas.claimParticipanteToken, {
    rondaId: rondaId as Id<'rondas'>,
    token,
    userId,
    email,
  })
}

export async function createConfiguredRonda(
  nombre: string,
  codigo: string,
  contaminantes: { contaminante: Contaminante; niveles: number; replicas: 2 | 3 }[],
  slots: { workosUserId: string; email: string; participantProfile: ParticipantePerfil }[]
): Promise<string> {
  const id = await fetchMutation(api.rondas.createConfiguredRonda, {
    nombre,
    codigo,
    contaminantes,
    slots,
  })
  return id as string
}

export async function updateRondaConfig(
  rondaId: string,
  nombre: string,
  codigo: string,
  contaminantes: { contaminante: Contaminante; niveles: number; replicas: 2 | 3 }[]
): Promise<void> {
  await fetchMutation(api.rondas.updateRondaConfig, {
    id: rondaId as Id<'rondas'>,
    nombre,
    codigo,
    contaminantes,
  })
}

export async function transitionRondaEstado(
  rondaId: string,
  nextState: 'activa' | 'cerrada'
): Promise<void> {
  await fetchMutation(api.rondas.transitionRondaEstado, {
    id: rondaId as Id<'rondas'>,
    nextState,
  })
}

export async function reabrirRonda(rondaId: string): Promise<void> {
  await fetchMutation(api.rondas.reabrirRonda, {
    id: rondaId as Id<'rondas'>,
  })
}

export async function deleteRonda(rondaId: string): Promise<string> {
  return fetchMutation(api.rondas.deleteRonda, {
    id: rondaId as Id<'rondas'>,
  })
}

export async function assignParticipante(
  rondaId: string,
  workosUserId: string,
  email: string,
  participantProfile: ParticipantePerfil
): Promise<void> {
  await fetchMutation(api.rondas.assignParticipante, {
    rondaId: rondaId as Id<'rondas'>,
    workosUserId,
    email,
    participantProfile,
  })
}

export async function regenerateParticipanteSlot(
  rondaId: string,
  participanteId: string,
  workosUserId: string,
  email: string
): Promise<void> {
  await fetchMutation(api.rondas.regenerateParticipanteSlot, {
    rondaId: rondaId as Id<'rondas'>,
    participanteId: participanteId as Id<'rondaParticipantes'>,
    workosUserId,
    email,
  })
}

export async function removeParticipante(
  rondaId: string,
  participanteId: string
): Promise<void> {
  await fetchMutation(api.rondas.removeParticipante, {
    rondaId: rondaId as Id<'rondas'>,
    participanteId: participanteId as Id<'rondaParticipantes'>,
  })
}

export async function addReferenceSlot(
  rondaId: string,
  workosUserId: string,
  email: string
): Promise<void> {
  await fetchMutation(api.rondas.addReferenceSlot, {
    rondaId: rondaId as Id<'rondas'>,
    workosUserId,
    email,
  })
}

// ---------------------------------------------------------------------------
// RondaParticipanteAsignada / ParticipanteGlobal types
// ---------------------------------------------------------------------------

export type RondaParticipanteAsignada = Ronda & {
  invitado_at: string
  ronda_participante_id: string
  ficha_estado: 'no_iniciada' | 'borrador' | 'enviado'
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

// ---------------------------------------------------------------------------
// PT Items & Sample Groups — read
// ---------------------------------------------------------------------------

export async function listPTItems(rondaId: string): Promise<RondaPTItem[]> {
  const rows = await fetchQuery(api.pt.listPTItems, { rondaId: rondaId as Id<'rondas'> })
  return rows.map(mapPTItemDoc)
}

export async function listPTSampleGroups(rondaId: string): Promise<RondaPTSampleGroup[]> {
  const rows = await fetchQuery(api.pt.listPTSampleGroups, { rondaId: rondaId as Id<'rondas'> })
  return rows.map(mapPTSampleGroupDoc)
}

// ---------------------------------------------------------------------------
// Participantes PT — read
// ---------------------------------------------------------------------------

export async function getRondaParticipantePT(
  rondaId: string,
  userId: string
): Promise<RondaParticipantePT | null> {
  const row = await fetchQuery(api.pt.getRondaParticipantePT, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
  if (!row) return null
  return mapParticipantePTDoc(row)
}

export async function listParticipantesPT(rondaId: string): Promise<RondaParticipantePT[]> {
  const rows = await fetchQuery(api.pt.listParticipantesPT, { rondaId: rondaId as Id<'rondas'> })
  return rows.map(mapParticipantePTDoc)
}

// ---------------------------------------------------------------------------
// Envios PT — read
// ---------------------------------------------------------------------------

export async function listEnviosPT(rondaId: string, userId: string): Promise<EnvioPT[]> {
  const rows = await fetchQuery(api.pt.listEnviosPT, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
  return rows.map(mapEnvioPTDoc)
}

export async function getEnvioPT(
  rondaParticipanteId: string,
  ptItemId: string,
  sampleGroupId: string
): Promise<EnvioPT | null> {
  const row = await fetchQuery(api.pt.getEnvioPT, {
    rondaParticipanteId: rondaParticipanteId as Id<'rondaParticipantes'>,
    ptItemId: ptItemId as Id<'rondaPtItems'>,
    sampleGroupId: sampleGroupId as Id<'rondaPtSampleGroups'>,
  })
  if (!row) return null
  return mapEnvioPTDoc(row)
}

export async function getEstadoEnvioPTParticipante(
  rondaId: string,
  userId: string
): Promise<EstadoEnvioParticipante> {
  return fetchQuery(api.pt.getEstadoEnvioPTParticipante, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
}

export async function listResultadosPTRonda(rondaId: string): Promise<ResultadoParticipantePT[]> {
  return fetchQuery(api.pt.listResultadosPTRonda, { rondaId: rondaId as Id<'rondas'> })
}

export async function listEnviosPTRound(rondaId: string): Promise<EnvioPTConMetadatos[]> {
  return fetchQuery(api.pt.listEnviosPTRound, { rondaId: rondaId as Id<'rondas'> })
}

// ---------------------------------------------------------------------------
// Envios PT — mutations
// ---------------------------------------------------------------------------

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
  await fetchMutation(api.pt.upsertEnvioPT, {
    rondaId: rondaId as Id<'rondas'>,
    rondaParticipanteId: rondaParticipanteId as Id<'rondaParticipantes'>,
    ptItemId: ptItemId as Id<'rondaPtItems'>,
    sampleGroupId: sampleGroupId as Id<'rondaPtSampleGroups'>,
    d1,
    d2,
    d3,
    meanValue,
    sdValue,
    ux,
    uxExp,
  })
  const row = await fetchQuery(api.pt.getEnvioPT, {
    rondaParticipanteId: rondaParticipanteId as Id<'rondaParticipantes'>,
    ptItemId: ptItemId as Id<'rondaPtItems'>,
    sampleGroupId: sampleGroupId as Id<'rondaPtSampleGroups'>,
  })
  if (!row) throw new Error('No fue posible recuperar el envio PT tras guardarlo')
  return mapEnvioPTDoc(row)
}

export async function submitFinalPT(rondaId: string, userId: string): Promise<string> {
  return fetchMutation(api.pt.submitFinalPT, {
    rondaId: rondaId as Id<'rondas'>,
    userId,
  })
}

// ---------------------------------------------------------------------------
// Admin PT — mutations
// ---------------------------------------------------------------------------

export async function createPTItem(
  rondaId: string,
  contaminante: Contaminante,
  runCode: string,
  levelLabel: string,
  sortOrder: number
): Promise<RondaPTItem> {
  const doc = await fetchMutation(api.pt.createPTItem, {
    rondaId: rondaId as Id<'rondas'>,
    contaminante,
    runCode,
    levelLabel,
    sortOrder,
  })
  if (!doc) throw new Error('No fue posible recuperar el item PT tras crearlo')
  return {
    id: doc._id as string,
    ronda_id: doc.rondaId as string,
    contaminante: doc.contaminante,
    run_code: doc.runCode,
    level_label: doc.levelLabel,
    sort_order: doc.sortOrder,
    created_at: new Date(doc._creationTime).toISOString(),
  }
}

export async function createPTItemsBulk(
  rondaId: string,
  contaminante: Contaminante,
  items: RondaPTItemInput[]
): Promise<RondaPTItem[]> {
  const docs = await fetchMutation(api.pt.createPTItemsBulk, {
    rondaId: rondaId as Id<'rondas'>,
    contaminante,
    items,
  })
  return docs.map((doc) => {
    if (!doc) throw new Error('No fue posible recuperar un item PT tras crearlo')
    return {
      id: doc._id as string,
      ronda_id: doc.rondaId as string,
      contaminante: doc.contaminante,
      run_code: doc.runCode,
      level_label: doc.levelLabel,
      sort_order: doc.sortOrder,
      created_at: new Date(doc._creationTime).toISOString(),
    }
  })
}

export async function createPTSampleGroup(
  rondaId: string,
  sampleGroup: string,
  sortOrder: number
): Promise<RondaPTSampleGroup> {
  const doc = await fetchMutation(api.pt.createPTSampleGroup, {
    rondaId: rondaId as Id<'rondas'>,
    sampleGroup,
    sortOrder,
  })
  if (!doc) throw new Error('No fue posible recuperar el grupo de muestra PT tras crearlo')
  return {
    id: doc._id as string,
    ronda_id: doc.rondaId as string,
    sample_group: doc.sampleGroup,
    sort_order: doc.sortOrder,
    created_at: new Date(doc._creationTime).toISOString(),
  }
}

export async function updateParticipantePT(
  participanteId: string,
  participantCode: string | null,
  replicateCode: number | null
): Promise<void> {
  await fetchMutation(api.pt.updateParticipantePT, {
    participanteId: participanteId as Id<'rondaParticipantes'>,
    participantCode,
    replicateCode,
  })
}

export async function deletePTItem(rondaId: string, itemId: string): Promise<void> {
  await fetchMutation(api.pt.deletePTItem, {
    rondaId: rondaId as Id<'rondas'>,
    itemId: itemId as Id<'rondaPtItems'>,
  })
}

export async function deletePTSampleGroup(rondaId: string, groupId: string): Promise<void> {
  await fetchMutation(api.pt.deletePTSampleGroup, {
    rondaId: rondaId as Id<'rondas'>,
    groupId: groupId as Id<'rondaPtSampleGroups'>,
  })
}

// ---------------------------------------------------------------------------
// listAllEnviosPT
// ---------------------------------------------------------------------------

export async function listAllEnviosPT(rondaId: string): Promise<EnvioPTWithRelations[]> {
  const rows = await fetchQuery(api.pt.listAllEnviosPT, { rondaId: rondaId as Id<'rondas'> })

  return rows.map(({ envio, ptItem, sampleGroup, participante }) => ({
    ...mapEnvioPTDoc(envio),
    pt_item: mapPTItemDoc(ptItem),
    sample_group: mapPTSampleGroupDoc(sampleGroup),
    participante: mapParticipantePTDoc(participante),
  }))
}

// ---------------------------------------------------------------------------
// Estado operativo — types + pure derivation + async loader
// ---------------------------------------------------------------------------

export type EstadoOperativo =
  | 'preparar_ronda'
  | 'invitar_participantes'
  | 'esperando_fichas'
  | 'recibiendo_resultados'
  | 'revisar_incompletos'
  | 'lista_para_exportar'
  | 'cerrada'

export type RondaMetricas = {
  cupos_totales: number
  cupos_reclamados: number
  fichas_enviadas: number
  fichas_pendientes: number       // reclamados sin ficha enviada
  envios_finales: number          // participantes con enviados_at !== null
  envios_esperados: number        // = cupos_reclamados
  pt_configurado: boolean         // ptItems.length > 0; sample group defaults to A
  estado_operativo: EstadoOperativo
  accion_recomendada: string
}

/**
 * Pure derivation of operative status from ronda data.
 * Priority is descending — first matching condition wins.
 * Reusable in the global dashboard (Fase 1) and ronda summary (Fase 2).
 */
export function derivarEstadoOperativo(
  ronda: Pick<Ronda, 'estado'>,
  datos: Omit<RondaMetricas, 'estado_operativo' | 'accion_recomendada'>
): Pick<RondaMetricas, 'estado_operativo' | 'accion_recomendada'> {
  if (ronda.estado === 'cerrada') {
    return { estado_operativo: 'cerrada', accion_recomendada: 'La ronda está cerrada.' }
  }
  if (!datos.pt_configurado) {
    return { estado_operativo: 'preparar_ronda', accion_recomendada: 'Configure los niveles PT.' }
  }
  if (datos.cupos_totales === 0) {
    return { estado_operativo: 'preparar_ronda', accion_recomendada: 'Agregue participantes antes de activar la ronda.' }
  }
  if (datos.cupos_reclamados === 0) {
    return { estado_operativo: 'invitar_participantes', accion_recomendada: 'Comparta los enlaces de invitación. Ningún cupo ha sido reclamado.' }
  }
  if (datos.fichas_pendientes > 0) {
    return { estado_operativo: 'esperando_fichas', accion_recomendada: 'Hay fichas pendientes antes de recibir resultados.' }
  }
  if (datos.envios_finales === 0) {
    return { estado_operativo: 'recibiendo_resultados', accion_recomendada: 'Esperando envíos finales de los participantes.' }
  }
  if (datos.envios_finales > 0 && datos.envios_finales < datos.envios_esperados) {
    return { estado_operativo: 'revisar_incompletos', accion_recomendada: 'Hay participantes que no han enviado resultados.' }
  }
  return { estado_operativo: 'lista_para_exportar', accion_recomendada: 'Todos los envíos están completos. Puede exportar el CSV PT.' }
}

/**
 * Loads all data required for metrics and derives the operative state.
 * Uses 4 existing queries in parallel — no new Convex queries needed.
 */
export async function getRondaMetricasCompletas(
  rondaId: string,
  ronda: Pick<Ronda, 'estado'>
): Promise<RondaMetricas> {
  const [participantes, resultadosPT, ptItems] = await Promise.all([
    listParticipantesRondaResumen(rondaId),
    listResultadosPTRonda(rondaId),
    listPTItems(rondaId),
  ])

  const cupos_totales = participantes.length
  const cupos_reclamados = participantes.filter((p) => p.estado === 'reclamado').length
  const fichas_enviadas = participantes.filter((p) => p.ficha_estado === 'enviado').length
  const fichas_pendientes = cupos_reclamados - fichas_enviadas
  const envios_esperados = cupos_reclamados
  const envios_finales = resultadosPT.filter((r) => r.enviados_at !== null).length
  const pt_configurado = ptItems.length > 0

  const datos = {
    cupos_totales,
    cupos_reclamados,
    fichas_enviadas,
    fichas_pendientes,
    envios_finales,
    envios_esperados,
    pt_configurado,
  }

  const { estado_operativo, accion_recomendada } = derivarEstadoOperativo(ronda, datos)

  return { ...datos, estado_operativo, accion_recomendada }
}
