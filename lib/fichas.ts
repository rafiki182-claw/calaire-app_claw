import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type EstadoFicha = 'borrador' | 'enviado'

export type FichaRegistro = {
  id: string
  ronda_participante_id: string
  nombre_laboratorio: string | null
  nombre_responsable: string | null
  cargo: string | null
  ciudad: string | null
  departamento: string | null
  telefono: string | null
  transporte: string | null
  hora_llegada: string | null
  estacionamiento: boolean
  observaciones: string | null
  dec_datos_correctos: boolean
  dec_acepta_condiciones: boolean
  dec_compromisos: boolean
  dec_firma_autorizada: boolean
  nombre_firma: string | null
  estado: EstadoFicha
  created_at: string
  updated_at: string
}

export type Acompanante = {
  id: string
  ficha_id: string
  sort_order: number
  nombre_completo: string
  documento_identidad: string
  rol: string
}

export type Analizador = {
  id: string
  ficha_id: string
  sort_order: number
  analito: string
  fabricante: string
  modelo: string
  numero_serie: string
  metodo_epa: string
  fecha_ultima_calibracion: string | null
  tipo_verificacion: string
  incertidumbre_declarada: string
  unidad_salida: string
}

export type Instrumento = {
  id: string
  ficha_id: string
  sort_order: number
  equipo: string
  marca_modelo: string
  numero_serie: string
  cantidad: number
}

export type FichaCompleta = FichaRegistro & {
  acompanantes: Acompanante[]
  analizadores: Analizador[]
  instrumentos: Instrumento[]
}

export type FichaResumen = {
  id: string
  ronda_participante_id: string
  estado: EstadoFicha
}

export type AcompananteInput = Omit<Acompanante, 'id' | 'ficha_id'>
export type AnalizadorInput = Omit<Analizador, 'id' | 'ficha_id'>
export type InstrumentoInput = Omit<Instrumento, 'id' | 'ficha_id'>

export const FICHA_SCALAR_ALLOWLIST = [
  'nombre_laboratorio',
  'nombre_responsable',
  'cargo',
  'ciudad',
  'departamento',
  'telefono',
  'transporte',
  'hora_llegada',
  'estacionamiento',
  'observaciones',
  'dec_datos_correctos',
  'dec_acepta_condiciones',
  'dec_compromisos',
  'dec_firma_autorizada',
  'nombre_firma',
] as const

export type FichaScalarField = (typeof FICHA_SCALAR_ALLOWLIST)[number]

// ---------------------------------------------------------------------------
// Internal field-mapping helpers
// ---------------------------------------------------------------------------

// Maps snake_case lib field names to camelCase Convex field names
const SCALAR_FIELD_MAP: Record<FichaScalarField, 'nombreLaboratorio' | 'nombreResponsable' | 'cargo' | 'ciudad' | 'departamento' | 'telefono' | 'transporte' | 'horaLlegada' | 'estacionamiento' | 'observaciones' | 'decDatosCorrectos' | 'decAceptaCondiciones' | 'decCompromisos' | 'decFirmaAutorizada' | 'nombreFirma'> = {
  nombre_laboratorio:    'nombreLaboratorio',
  nombre_responsable:    'nombreResponsable',
  cargo:                 'cargo',
  ciudad:                'ciudad',
  departamento:          'departamento',
  telefono:              'telefono',
  transporte:            'transporte',
  hora_llegada:          'horaLlegada',
  estacionamiento:       'estacionamiento',
  observaciones:         'observaciones',
  dec_datos_correctos:   'decDatosCorrectos',
  dec_acepta_condiciones:'decAceptaCondiciones',
  dec_compromisos:       'decCompromisos',
  dec_firma_autorizada:  'decFirmaAutorizada',
  nombre_firma:          'nombreFirma',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFichaDoc(doc: any): FichaRegistro {
  return {
    id: doc._id as string,
    ronda_participante_id: doc.rondaParticipanteId as string,
    nombre_laboratorio: (doc.nombreLaboratorio ?? null) as string | null,
    nombre_responsable: (doc.nombreResponsable ?? null) as string | null,
    cargo: (doc.cargo ?? null) as string | null,
    ciudad: (doc.ciudad ?? null) as string | null,
    departamento: (doc.departamento ?? null) as string | null,
    telefono: (doc.telefono ?? null) as string | null,
    transporte: (doc.transporte ?? null) as string | null,
    hora_llegada: (doc.horaLlegada ?? null) as string | null,
    estacionamiento: (doc.estacionamiento ?? false) as boolean,
    observaciones: (doc.observaciones ?? null) as string | null,
    dec_datos_correctos: (doc.decDatosCorrectos ?? false) as boolean,
    dec_acepta_condiciones: (doc.decAceptaCondiciones ?? false) as boolean,
    dec_compromisos: (doc.decCompromisos ?? false) as boolean,
    dec_firma_autorizada: (doc.decFirmaAutorizada ?? false) as boolean,
    nombre_firma: (doc.nombreFirma ?? null) as string | null,
    estado: doc.estado as EstadoFicha,
    created_at: new Date(doc.createdAt as number).toISOString(),
    updated_at: new Date(doc.updatedAt as number).toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAcompananteDoc(a: any): Acompanante {
  return {
    id: a._id as string,
    ficha_id: a.fichaId as string,
    sort_order: a.sortOrder as number,
    nombre_completo: a.nombreCompleto as string,
    documento_identidad: a.documentoIdentidad as string,
    rol: a.rol as string,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnalizadorDoc(a: any): Analizador {
  return {
    id: a._id as string,
    ficha_id: a.fichaId as string,
    sort_order: a.sortOrder as number,
    analito: a.analito as string,
    fabricante: a.fabricante as string,
    modelo: a.modelo as string,
    numero_serie: a.numeroSerie as string,
    metodo_epa: a.metodoEpa as string,
    fecha_ultima_calibracion: (a.fechaUltimaCalibracion ?? null) as string | null,
    tipo_verificacion: a.tipoVerificacion as string,
    incertidumbre_declarada: a.incertidumbreDeclarada as string,
    unidad_salida: a.unidadSalida as string,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInstrumentoDoc(i: any): Instrumento {
  return {
    id: i._id as string,
    ficha_id: i.fichaId as string,
    sort_order: i.sortOrder as number,
    equipo: i.equipo as string,
    marca_modelo: i.marcaModelo as string,
    numero_serie: i.numeroSerie as string,
    cantidad: i.cantidad as number,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFichaResumenFromResult(r: any): FichaResumen {
  return {
    id: r.id as string,
    ronda_participante_id: r.rondaParticipanteId as string,
    estado: r.estado as EstadoFicha,
  }
}

// ---------------------------------------------------------------------------
// Fichas — queries
// ---------------------------------------------------------------------------

export async function getOrCreateFicha(rondaParticipanteId: string): Promise<FichaRegistro> {
  const id = await fetchMutation(api.fichas.getOrCreateFicha, {
    rondaParticipanteId: rondaParticipanteId as Id<'rondaParticipantes'>,
  })
  const doc = await fetchQuery(api.fichas.getFichaById, {
    fichaId: id as Id<'fichasRegistro'>,
  })
  if (!doc) throw new Error('No fue posible crear la ficha de registro')
  return mapFichaDoc(doc)
}

export async function getFichaByRondaParticipante(
  rondaParticipanteId: string
): Promise<FichaCompleta | null> {
  const result = await fetchQuery(api.fichas.getFichaByRondaParticipante, {
    rondaParticipanteId: rondaParticipanteId as Id<'rondaParticipantes'>,
  })
  if (!result) return null

  return {
    ...mapFichaDoc(result),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    acompanantes: (result.acompanantes as any[]).map(mapAcompananteDoc),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analizadores: (result.analizadores as any[]).map(mapAnalizadorDoc),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instrumentos: (result.instrumentos as any[]).map(mapInstrumentoDoc),
  }
}

export async function getFichaResumenByRondaParticipante(
  rondaParticipanteId: string
): Promise<FichaResumen | null> {
  const result = await fetchQuery(api.fichas.getFichaResumenByRondaParticipante, {
    rondaParticipanteId: rondaParticipanteId as Id<'rondaParticipantes'>,
  })
  if (!result) return null
  return mapFichaResumenFromResult(result)
}

export async function getFichasResumenByRpIds(
  rpIds: string[]
): Promise<Record<string, FichaResumen>> {
  if (rpIds.length === 0) return {}
  const result = await fetchQuery(api.fichas.listFichaResumenesByRpIds, {
    rpIds: rpIds as Id<'rondaParticipantes'>[],
  })
  const mapped: Record<string, FichaResumen> = {}
  for (const [rpId, r] of Object.entries(result)) {
    mapped[rpId] = mapFichaResumenFromResult(r)
  }
  return mapped
}

export async function listFichaResumenesByRonda(
  rondaId: string
): Promise<Record<string, FichaResumen>> {
  const result = await fetchQuery(api.fichas.listFichaResumenesByRonda, {
    rondaId: rondaId as Id<'rondas'>,
  })
  const mapped: Record<string, FichaResumen> = {}
  for (const [rpId, r] of Object.entries(result)) {
    mapped[rpId] = mapFichaResumenFromResult(r)
  }
  return mapped
}

// ---------------------------------------------------------------------------
// Fichas — mutations
// ---------------------------------------------------------------------------

export async function upsertFichaScalars(
  fichaId: string,
  field: FichaScalarField,
  value: string | boolean | null
): Promise<void> {
  const convexField = SCALAR_FIELD_MAP[field]
  await fetchMutation(api.fichas.upsertFichaScalar, {
    fichaId: fichaId as Id<'fichasRegistro'>,
    field: convexField,
    ...(typeof value === 'boolean'
      ? { valueBoolean: value }
      : { valueString: value }),
  })
}

export async function replaceAcompanantes(
  fichaId: string,
  items: AcompananteInput[]
): Promise<void> {
  await fetchMutation(api.fichas.replaceAcompanantes, {
    fichaId: fichaId as Id<'fichasRegistro'>,
    items: items.map((item) => ({
      sortOrder:          item.sort_order,
      nombreCompleto:     item.nombre_completo,
      documentoIdentidad: item.documento_identidad,
      rol:                item.rol,
    })),
  })
}

export async function replaceAnalizadores(
  fichaId: string,
  items: AnalizadorInput[]
): Promise<void> {
  await fetchMutation(api.fichas.replaceAnalizadores, {
    fichaId: fichaId as Id<'fichasRegistro'>,
    items: items.map((item) => ({
      sortOrder:              item.sort_order,
      analito:                item.analito,
      fabricante:             item.fabricante,
      modelo:                 item.modelo,
      numeroSerie:            item.numero_serie,
      metodoEpa:              item.metodo_epa,
      fechaUltimaCalibracion: item.fecha_ultima_calibracion ?? undefined,
      tipoVerificacion:       item.tipo_verificacion,
      incertidumbreDeclarada: item.incertidumbre_declarada,
      unidadSalida:           item.unidad_salida,
    })),
  })
}

export async function replaceInstrumentos(
  fichaId: string,
  items: InstrumentoInput[]
): Promise<void> {
  await fetchMutation(api.fichas.replaceInstrumentos, {
    fichaId: fichaId as Id<'fichasRegistro'>,
    items: items.map((item) => ({
      sortOrder:   item.sort_order,
      equipo:      item.equipo,
      marcaModelo: item.marca_modelo,
      numeroSerie: item.numero_serie,
      cantidad:    item.cantidad,
    })),
  })
}

export async function submitFicha(fichaId: string): Promise<void> {
  await fetchMutation(api.fichas.submitFicha, {
    fichaId: fichaId as Id<'fichasRegistro'>,
  })
}
