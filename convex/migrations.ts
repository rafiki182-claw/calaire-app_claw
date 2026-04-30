import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'

const PARTICIPANT_CODE_LENGTH = 6
const PARTICIPANT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PARTICIPANT_CODE_MAX_ATTEMPTS = 20

const TABLES = [
  'fichasInstrumentos',
  'fichasAnalizadores',
  'fichasAcompanantes',
  'fichasRegistro',
  'enviosPt',
  'envios',
  'rondaPtSampleGroups',
  'rondaPtItems',
  'rondaParticipantes',
  'rondaContaminantes',
  'rondas',
] as const

function clean<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T
}

function generateParticipantCode(): string {
  let code = ''
  for (let i = 0; i < PARTICIPANT_CODE_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * PARTICIPANT_CODE_ALPHABET.length)
    code += PARTICIPANT_CODE_ALPHABET[idx]
  }
  return code
}

function generateUniqueBackfillParticipantCode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < PARTICIPANT_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = generateParticipantCode()
    if (!existingCodes.has(code)) {
      existingCodes.add(code)
      return code
    }
  }

  throw new Error('No se pudo generar un codigo de participante unico para esta ronda.')
}

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const result: Record<string, number> = {}
    for (const table of TABLES) {
      result[table] = (await ctx.db.query(table).collect()).length
    }
    return result
  },
})

export const wipeAll = mutation({
  args: { confirm: v.literal('WIPE_CONVEX_MIGRATION_TABLES') },
  handler: async (ctx) => {
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect()
      await Promise.all(rows.map((row) => ctx.db.delete(row._id)))
    }
  },
})

export const backfillParticipantCodes = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = true }) => {
    const rows = await ctx.db.query('rondaParticipantes').collect()
    const byRonda = new Map<Id<'rondas'>, typeof rows>()

    for (const row of rows) {
      const rondaRows = byRonda.get(row.rondaId) ?? []
      rondaRows.push(row)
      byRonda.set(row.rondaId, rondaRows)
    }

    let missing = 0
    let updated = 0
    const duplicateCodes: Array<{
      rondaId: Id<'rondas'>
      participantCode: string
      count: number
    }> = []
    const planned: Array<{
      participanteId: Id<'rondaParticipantes'>
      rondaId: Id<'rondas'>
      participantCode: string
    }> = []

    for (const [rondaId, rondaRows] of byRonda) {
      const existingCodes = new Set<string>()
      const codeCounts = new Map<string, number>()

      for (const row of rondaRows) {
        if (!row.participantCode) continue
        codeCounts.set(row.participantCode, (codeCounts.get(row.participantCode) ?? 0) + 1)
        existingCodes.add(row.participantCode)
      }

      for (const [participantCode, count] of codeCounts) {
        if (count > 1) {
          duplicateCodes.push({ rondaId, participantCode, count })
        }
      }

      for (const row of rondaRows) {
        if (row.participantCode) continue
        missing += 1
        planned.push({
          participanteId: row._id,
          rondaId,
          participantCode: generateUniqueBackfillParticipantCode(existingCodes),
        })
      }
    }

    if (duplicateCodes.length > 0) {
      return {
        ok: false,
        dryRun,
        total: rows.length,
        missing,
        updated: 0,
        duplicateCodes,
        planned: dryRun ? planned : [],
      }
    }

    if (!dryRun) {
      for (const item of planned) {
        await ctx.db.patch(item.participanteId, {
          participantCode: item.participantCode,
        })
        updated += 1
      }
    }

    return {
      ok: true,
      dryRun,
      total: rows.length,
      missing,
      updated,
      duplicateCodes,
      planned: dryRun ? planned : [],
    }
  },
})

export const insertRonda = mutation({
  args: {
    codigo: v.string(),
    nombre: v.string(),
    estado: v.union(v.literal('borrador'), v.literal('activa'), v.literal('cerrada')),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('rondas', args),
})

export const insertRondaContaminante = mutation({
  args: {
    rondaId: v.id('rondas'),
    contaminante: v.union(v.literal('CO'), v.literal('SO2'), v.literal('O3'), v.literal('NO'), v.literal('NO2')),
    niveles: v.number(),
    replicas: v.union(v.literal(2), v.literal(3)),
  },
  handler: async (ctx, args) => ctx.db.insert('rondaContaminantes', args),
})

export const insertRondaParticipante = mutation({
  args: {
    rondaId: v.id('rondas'),
    workosUserId: v.string(),
    email: v.string(),
    invitadoAt: v.number(),
    participantProfile: v.union(v.literal('member'), v.literal('member_special')),
    participantCode: v.optional(v.string()),
    replicateCode: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => ctx.db.insert('rondaParticipantes', clean(args)),
})

export const insertRondaPtItem = mutation({
  args: {
    rondaId: v.id('rondas'),
    contaminante: v.union(v.literal('CO'), v.literal('SO2'), v.literal('O3'), v.literal('NO'), v.literal('NO2')),
    runCode: v.string(),
    levelLabel: v.string(),
    sortOrder: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('rondaPtItems', args),
})

export const insertRondaPtSampleGroup = mutation({
  args: {
    rondaId: v.id('rondas'),
    sampleGroup: v.string(),
    sortOrder: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('rondaPtSampleGroups', args),
})

export const insertEnvio = mutation({
  args: {
    rondaId: v.id('rondas'),
    workosUserId: v.string(),
    contaminante: v.union(v.literal('CO'), v.literal('SO2'), v.literal('O3'), v.literal('NO'), v.literal('NO2')),
    nivel: v.number(),
    valores: v.array(v.number()),
    promedio: v.optional(v.number()),
    incertidumbre: v.optional(v.number()),
    submittedAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('envios', clean(args)),
})

export const insertEnvioPt = mutation({
  args: {
    rondaId: v.id('rondas'),
    rondaParticipanteId: v.id('rondaParticipantes'),
    ptItemId: v.id('rondaPtItems'),
    sampleGroupId: v.id('rondaPtSampleGroups'),
    d1: v.optional(v.number()),
    d2: v.optional(v.number()),
    d3: v.optional(v.number()),
    meanValue: v.number(),
    sdValue: v.number(),
    ux: v.optional(v.number()),
    uxExp: v.optional(v.number()),
    draftSavedAt: v.number(),
    finalSubmittedAt: v.optional(v.number()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('enviosPt', clean(args)),
})

export const insertFichaRegistro = mutation({
  args: {
    rondaParticipanteId: v.id('rondaParticipantes'),
    nombreLaboratorio: v.optional(v.string()),
    nombreResponsable: v.optional(v.string()),
    cargo: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    departamento: v.optional(v.string()),
    telefono: v.optional(v.string()),
    transporte: v.optional(v.string()),
    horaLlegada: v.optional(v.string()),
    estacionamiento: v.boolean(),
    observaciones: v.optional(v.string()),
    decDatosCorrectos: v.boolean(),
    decAceptaCondiciones: v.boolean(),
    decCompromisos: v.boolean(),
    decFirmaAutorizada: v.boolean(),
    nombreFirma: v.optional(v.string()),
    estado: v.union(v.literal('borrador'), v.literal('enviado')),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('fichasRegistro', clean(args)),
})

export const insertFichaAcompanante = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    sortOrder: v.number(),
    nombreCompleto: v.string(),
    documentoIdentidad: v.string(),
    rol: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert('fichasAcompanantes', args),
})

export const insertFichaAnalizador = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    sortOrder: v.number(),
    analito: v.string(),
    fabricante: v.string(),
    modelo: v.string(),
    numeroSerie: v.string(),
    metodoEpa: v.string(),
    fechaUltimaCalibracion: v.optional(v.string()),
    tipoVerificacion: v.string(),
    incertidumbreDeclarada: v.string(),
    unidadSalida: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert('fichasAnalizadores', clean(args)),
})

export const insertFichaInstrumento = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    sortOrder: v.number(),
    equipo: v.string(),
    marcaModelo: v.string(),
    numeroSerie: v.string(),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert('fichasInstrumentos', args),
})
