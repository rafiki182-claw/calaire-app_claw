import { v } from 'convex/values'
import { query, mutation, QueryCtx, MutationCtx } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

async function getLatestFichaByRondaParticipante(
  ctx: QueryCtx | MutationCtx,
  rondaParticipanteId: Id<'rondaParticipantes'>
): Promise<Doc<'fichasRegistro'> | null> {
  const fichas = await ctx.db
    .query('fichasRegistro')
    .withIndex('by_ronda_participante', (q) => q.eq('rondaParticipanteId', rondaParticipanteId))
    .collect()
  fichas.sort((a, b) => b.updatedAt - a.updatedAt)
  return fichas[0] ?? null
}

// ---------------------------------------------------------------------------
// Fichas — read
// ---------------------------------------------------------------------------

export const getFichaById = query({
  args: { fichaId: v.id('fichasRegistro') },
  handler: async (ctx, { fichaId }) => {
    return ctx.db.get(fichaId)
  },
})

export const getFichaByRondaParticipante = query({
  args: { rondaParticipanteId: v.id('rondaParticipantes') },
  handler: async (ctx, { rondaParticipanteId }) => {
    const ficha = await getLatestFichaByRondaParticipante(ctx, rondaParticipanteId)
    if (!ficha) return null

    const [acompanantes, analizadores, instrumentos] = await Promise.all([
      ctx.db.query('fichasAcompanantes').withIndex('by_ficha', (q) => q.eq('fichaId', ficha._id)).collect(),
      ctx.db.query('fichasAnalizadores').withIndex('by_ficha', (q) => q.eq('fichaId', ficha._id)).collect(),
      ctx.db.query('fichasInstrumentos').withIndex('by_ficha', (q) => q.eq('fichaId', ficha._id)).collect(),
    ])

    acompanantes.sort((a, b) => a.sortOrder - b.sortOrder)
    analizadores.sort((a, b) => a.sortOrder - b.sortOrder)
    instrumentos.sort((a, b) => a.sortOrder - b.sortOrder)

    return { ...ficha, acompanantes, analizadores, instrumentos }
  },
})

export const getFichaResumenByRondaParticipante = query({
  args: { rondaParticipanteId: v.id('rondaParticipantes') },
  handler: async (ctx, { rondaParticipanteId }) => {
    const ficha = await getLatestFichaByRondaParticipante(ctx, rondaParticipanteId)
    if (!ficha) return null
    return { id: ficha._id, rondaParticipanteId: ficha.rondaParticipanteId, estado: ficha.estado }
  },
})

export const listFichaResumenesByRpIds = query({
  args: { rpIds: v.array(v.id('rondaParticipantes')) },
  handler: async (ctx, { rpIds }) => {
    if (rpIds.length === 0) return {}
    const fichas = await Promise.all(
      rpIds.map((rpId) => getLatestFichaByRondaParticipante(ctx, rpId))
    )
    const result: Record<string, { id: string; rondaParticipanteId: string; estado: string }> = {}
    for (const ficha of fichas) {
      if (ficha) result[ficha.rondaParticipanteId] = { id: ficha._id, rondaParticipanteId: ficha.rondaParticipanteId, estado: ficha.estado }
    }
    return result
  },
})

export const listFichaResumenesByRonda = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const participantes = await ctx.db
      .query('rondaParticipantes')
      .withIndex('by_ronda', (q) => q.eq('rondaId', rondaId))
      .collect()

    const fichas = await Promise.all(
      participantes.map((p) => getLatestFichaByRondaParticipante(ctx, p._id))
    )

    const result: Record<string, { id: string; rondaParticipanteId: string; estado: string }> = {}
    for (const ficha of fichas) {
      if (ficha) result[ficha.rondaParticipanteId] = { id: ficha._id, rondaParticipanteId: ficha.rondaParticipanteId, estado: ficha.estado }
    }
    return result
  },
})

// ---------------------------------------------------------------------------
// Fichas — mutations
// ---------------------------------------------------------------------------

export const getOrCreateFicha = mutation({
  args: { rondaParticipanteId: v.id('rondaParticipantes') },
  handler: async (ctx, { rondaParticipanteId }) => {
    const existing = await getLatestFichaByRondaParticipante(ctx, rondaParticipanteId)
    if (existing) return existing._id

    const now = Date.now()
    return ctx.db.insert('fichasRegistro', {
      rondaParticipanteId,
      estacionamiento: false,
      decDatosCorrectos: false,
      decAceptaCondiciones: false,
      decCompromisos: false,
      decFirmaAutorizada: false,
      estado: 'borrador',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const upsertFichaScalar = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    field: v.union(
      v.literal('nombreLaboratorio'),
      v.literal('nombreResponsable'),
      v.literal('cargo'),
      v.literal('ciudad'),
      v.literal('departamento'),
      v.literal('telefono'),
      v.literal('transporte'),
      v.literal('horaLlegada'),
      v.literal('estacionamiento'),
      v.literal('observaciones'),
      v.literal('decDatosCorrectos'),
      v.literal('decAceptaCondiciones'),
      v.literal('decCompromisos'),
      v.literal('decFirmaAutorizada'),
      v.literal('nombreFirma'),
    ),
    valueString:  v.optional(v.union(v.string(), v.null())),
    valueBoolean: v.optional(v.boolean()),
  },
  handler: async (ctx, { fichaId, field, valueString, valueBoolean }) => {
    const ficha = await ctx.db.get(fichaId)
    if (!ficha || ficha.estado !== 'borrador') throw new Error('Ficha no editable')

    const value = valueBoolean !== undefined ? valueBoolean : (valueString ?? null)
    await ctx.db.patch(fichaId, { [field]: value ?? undefined, updatedAt: Date.now() })
  },
})

export const replaceAcompanantes = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    items: v.array(v.object({
      sortOrder:          v.number(),
      nombreCompleto:     v.string(),
      documentoIdentidad: v.string(),
      rol:                v.string(),
    })),
  },
  handler: async (ctx, { fichaId, items }) => {
    const ficha = await ctx.db.get(fichaId)
    if (!ficha || ficha.estado !== 'borrador') throw new Error('Ficha no editable')

    const existing = await ctx.db
      .query('fichasAcompanantes')
      .withIndex('by_ficha', (q) => q.eq('fichaId', fichaId))
      .collect()
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)))
    await Promise.all(items.map((item) => ctx.db.insert('fichasAcompanantes', { fichaId, ...item })))
    await ctx.db.patch(fichaId, { updatedAt: Date.now() })
  },
})

export const replaceAnalizadores = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    items: v.array(v.object({
      sortOrder:              v.number(),
      analito:                v.string(),
      fabricante:             v.string(),
      modelo:                 v.string(),
      numeroSerie:            v.string(),
      metodoEpa:              v.string(),
      fechaUltimaCalibracion: v.optional(v.string()),
      tipoVerificacion:       v.string(),
      incertidumbreDeclarada: v.string(),
      unidadSalida:           v.string(),
    })),
  },
  handler: async (ctx, { fichaId, items }) => {
    const ficha = await ctx.db.get(fichaId)
    if (!ficha || ficha.estado !== 'borrador') throw new Error('Ficha no editable')

    const existing = await ctx.db
      .query('fichasAnalizadores')
      .withIndex('by_ficha', (q) => q.eq('fichaId', fichaId))
      .collect()
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)))
    await Promise.all(items.map((item) => ctx.db.insert('fichasAnalizadores', { fichaId, ...item })))
    await ctx.db.patch(fichaId, { updatedAt: Date.now() })
  },
})

export const replaceInstrumentos = mutation({
  args: {
    fichaId: v.id('fichasRegistro'),
    items: v.array(v.object({
      sortOrder:   v.number(),
      equipo:      v.string(),
      marcaModelo: v.string(),
      numeroSerie: v.string(),
      cantidad:    v.number(),
    })),
  },
  handler: async (ctx, { fichaId, items }) => {
    const ficha = await ctx.db.get(fichaId)
    if (!ficha || ficha.estado !== 'borrador') throw new Error('Ficha no editable')

    const existing = await ctx.db
      .query('fichasInstrumentos')
      .withIndex('by_ficha', (q) => q.eq('fichaId', fichaId))
      .collect()
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)))
    await Promise.all(items.map((item) => ctx.db.insert('fichasInstrumentos', { fichaId, ...item })))
    await ctx.db.patch(fichaId, { updatedAt: Date.now() })
  },
})

export const submitFicha = mutation({
  args: { fichaId: v.id('fichasRegistro') },
  handler: async (ctx, { fichaId }) => {
    const ficha = await ctx.db.get(fichaId)
    if (!ficha || ficha.estado !== 'borrador') throw new Error('Ficha no en estado borrador')
    await ctx.db.patch(fichaId, { estado: 'enviado', updatedAt: Date.now() })
  },
})

export const reabrirFicha = mutation({
  args: { fichaId: v.id('fichasRegistro') },
  handler: async (ctx, { fichaId }) => {
    const ficha = await ctx.db.get(fichaId)
    if (!ficha) throw new Error('Ficha no encontrada')
    if (ficha.estado !== 'enviado') throw new Error('Ficha no enviada')

    await ctx.db.patch(fichaId, { estado: 'borrador', updatedAt: Date.now() })
  },
})
