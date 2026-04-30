import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ---------------------------------------------------------------------------
// PT Items & Sample Groups — read
// ---------------------------------------------------------------------------

export const listPTItems = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const items = await ctx.db
      .query('rondaPtItems')
      .withIndex('by_ronda', (q) => q.eq('rondaId', rondaId))
      .collect()
    items.sort((a, b) => {
      if (a.contaminante !== b.contaminante) return a.contaminante.localeCompare(b.contaminante)
      return a.sortOrder - b.sortOrder
    })
    return items
  },
})

export const listPTSampleGroups = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const groups = await ctx.db
      .query('rondaPtSampleGroups')
      .withIndex('by_ronda', (q) => q.eq('rondaId', rondaId))
      .collect()
    groups.sort((a, b) => a.sortOrder - b.sortOrder)
    return groups
  },
})

// ---------------------------------------------------------------------------
// Participantes PT — read
// ---------------------------------------------------------------------------

export const getRondaParticipantePT = query({
  args: { rondaId: v.id('rondas'), userId: v.string() },
  handler: async (ctx, { rondaId, userId }) => {
    return ctx.db
      .query('rondaParticipantes')
      .withIndex('by_ronda_user', (q) => q.eq('rondaId', rondaId).eq('workosUserId', userId))
      .unique()
  },
})

export const listParticipantesPT = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const rows = await ctx.db
      .query('rondaParticipantes')
      .withIndex('by_ronda', (q) => q.eq('rondaId', rondaId))
      .collect()
    rows.sort((a, b) => a.invitadoAt - b.invitadoAt)
    return rows
  },
})

// ---------------------------------------------------------------------------
// Envios PT — read
// ---------------------------------------------------------------------------

export const listEnviosPT = query({
  args: { rondaId: v.id('rondas'), userId: v.string() },
  handler: async (ctx, { rondaId, userId }) => {
    const participante = await ctx.db
      .query('rondaParticipantes')
      .withIndex('by_ronda_user', (q) => q.eq('rondaId', rondaId).eq('workosUserId', userId))
      .unique()
    if (!participante) return []

    return ctx.db
      .query('enviosPt')
      .withIndex('by_participante', (q) => q.eq('rondaParticipanteId', participante._id))
      .collect()
  },
})

export const getEnvioPT = query({
  args: {
    rondaParticipanteId: v.id('rondaParticipantes'),
    ptItemId:            v.id('rondaPtItems'),
    sampleGroupId:       v.id('rondaPtSampleGroups'),
  },
  handler: async (ctx, { rondaParticipanteId, ptItemId, sampleGroupId }) => {
    return ctx.db
      .query('enviosPt')
      .withIndex('by_participante_item_group', (q) =>
        q.eq('rondaParticipanteId', rondaParticipanteId).eq('ptItemId', ptItemId).eq('sampleGroupId', sampleGroupId)
      )
      .unique()
  },
})

export const getEstadoEnvioPTParticipante = query({
  args: { rondaId: v.id('rondas'), userId: v.string() },
  handler: async (ctx, { rondaId, userId }) => {
    const [items, sampleGroups] = await Promise.all([
      ctx.db.query('rondaPtItems').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtSampleGroups').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
    ])
    const totalEsperado = items.length * sampleGroups.length

    const participante = await ctx.db
      .query('rondaParticipantes')
      .withIndex('by_ronda_user', (q) => q.eq('rondaId', rondaId).eq('workosUserId', userId))
      .unique()

    if (!participante) {
      return { completo: false, enviado: false, enviados_at: null, total_esperado: 0, total_guardado: 0 }
    }

    const envios = await ctx.db
      .query('enviosPt')
      .withIndex('by_participante', (q) => q.eq('rondaParticipanteId', participante._id))
      .collect()

    const totalGuardado = envios.length
    const completo = totalGuardado === totalEsperado && totalEsperado > 0

    let enviado = false
    let enviadosAt: string | null = null

    if (completo) {
      const finalTimes = Array.from(
        new Set(envios.map((e) => e.finalSubmittedAt).filter((t): t is number => t !== undefined && t !== null))
      )
      if (finalTimes.length === 1) {
        enviado = true
        enviadosAt = new Date(finalTimes[0]!).toISOString()
      }
    }

    return {
      completo,
      enviado,
      enviados_at: enviadosAt,
      total_esperado: totalEsperado,
      total_guardado: totalGuardado,
    }
  },
})

export const listResultadosPTRonda = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const [participantes, items, sampleGroups] = await Promise.all([
      ctx.db.query('rondaParticipantes').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtItems').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtSampleGroups').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
    ])
    participantes.sort((a, b) => a.invitadoAt - b.invitadoAt)

    const totalEsperado = items.length * sampleGroups.length

    const enviosAll = await ctx.db
      .query('enviosPt')
      .withIndex('by_ronda', (q) => q.eq('rondaId', rondaId))
      .collect()

    const enviosPorParticipante = new Map<string, typeof enviosAll>()
    for (const e of enviosAll) {
      const list = enviosPorParticipante.get(e.rondaParticipanteId) ?? []
      list.push(e)
      enviosPorParticipante.set(e.rondaParticipanteId, list)
    }

    return participantes.map((p) => {
      const celdas = enviosPorParticipante.get(p._id) ?? []
      const completados = celdas.length
      const finalTimes = Array.from(
        new Set(celdas.map((c) => c.finalSubmittedAt).filter((t): t is number => t !== undefined && t !== null))
      )

      return {
        participante_id: p._id,
        workos_user_id: p.workosUserId,
        email: p.email,
        participant_code: p.participantCode ?? null,
        replicate_code: p.replicateCode ?? null,
        completados,
        total_esperado: totalEsperado,
        porcentaje_completitud: totalEsperado > 0 ? Math.round((completados / totalEsperado) * 100) : 0,
        enviados_at: finalTimes.length === 1 ? new Date(finalTimes[0]!).toISOString() : null,
        celdas: celdas.map((c) => ({
          pt_item_id: c.ptItemId,
          sample_group_id: c.sampleGroupId,
          mean_value: c.meanValue,
          sd_value: c.sdValue,
          draft_saved_at: new Date(c.draftSavedAt).toISOString(),
          final_submitted_at: c.finalSubmittedAt ? new Date(c.finalSubmittedAt).toISOString() : null,
          updated_at: new Date(c.updatedAt).toISOString(),
        })),
      }
    })
  },
})

export const listEnviosPTRound = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const envios = await ctx.db
      .query('enviosPt')
      .withIndex('by_ronda', (q) => q.eq('rondaId', rondaId))
      .collect()

    const submitted = envios.filter((e) => e.finalSubmittedAt !== undefined && e.finalSubmittedAt !== null)

    const [items, sampleGroups, participantes] = await Promise.all([
      ctx.db.query('rondaPtItems').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtSampleGroups').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaParticipantes').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
    ])

    const itemMap = new Map(items.map((i) => [i._id, i]))
    const groupMap = new Map(sampleGroups.map((g) => [g._id, g]))
    const participanteMap = new Map(participantes.map((p) => [p._id, p]))

    const exported = submitted
      .map((e) => {
        const item = itemMap.get(e.ptItemId)
        const group = groupMap.get(e.sampleGroupId)
        const participante = participanteMap.get(e.rondaParticipanteId)
        if (!item || !group || !participante) return null

        return {
          pollutant: item.contaminante.toLowerCase(),
          run: item.runCode,
          level: item.levelLabel,
          participant_id: participante.participantCode ?? '',
          replicate: participante.replicateCode ?? 0,
          sample_group: group.sampleGroup,
          d1: e.d1 ?? null,
          d2: e.d2 ?? null,
          d3: e.d3 ?? null,
          mean_value: e.meanValue,
          sd_value: e.sdValue,
          ux: e.ux ?? null,
          ux_exp: e.uxExp ?? null,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    exported.sort((a, b) => {
      if (a.pollutant !== b.pollutant) return a.pollutant.localeCompare(b.pollutant)
      if (a.run !== b.run) return a.run.localeCompare(b.run)
      if (a.level !== b.level) return a.level.localeCompare(b.level)
      if (a.participant_id !== b.participant_id) return a.participant_id.localeCompare(b.participant_id)
      if (a.replicate !== b.replicate) return a.replicate - b.replicate
      return a.sample_group.localeCompare(b.sample_group)
    })

    return exported
  },
})

export const listAllEnviosPT = query({
  args: { rondaId: v.id('rondas') },
  handler: async (ctx, { rondaId }) => {
    const [envios, items, sampleGroups, participantes] = await Promise.all([
      ctx.db.query('enviosPt').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtItems').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtSampleGroups').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaParticipantes').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
    ])

    const itemMap = new Map(items.map((item) => [item._id, item]))
    const groupMap = new Map(sampleGroups.map((group) => [group._id, group]))
    const participanteMap = new Map(participantes.map((participante) => [participante._id, participante]))

    return envios
      .map((envio) => {
        const ptItem = itemMap.get(envio.ptItemId)
        const sampleGroup = groupMap.get(envio.sampleGroupId)
        const participante = participanteMap.get(envio.rondaParticipanteId)

        if (!ptItem || !sampleGroup || !participante) return null

        return {
          envio,
          ptItem,
          sampleGroup,
          participante,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  },
})

// ---------------------------------------------------------------------------
// Envios PT — mutations
// ---------------------------------------------------------------------------

export const upsertEnvioPT = mutation({
  args: {
    rondaId:             v.id('rondas'),
    rondaParticipanteId: v.id('rondaParticipantes'),
    ptItemId:            v.id('rondaPtItems'),
    sampleGroupId:       v.id('rondaPtSampleGroups'),
    d1:                  v.optional(v.number()),
    d2:                  v.optional(v.number()),
    d3:                  v.optional(v.number()),
    meanValue:           v.number(),
    sdValue:             v.number(),
    ux:                  v.optional(v.number()),
    uxExp:               v.optional(v.number()),
  },
  handler: async (ctx, { rondaId, rondaParticipanteId, ptItemId, sampleGroupId, d1, d2, d3, meanValue, sdValue, ux, uxExp }) => {
    const now = Date.now()

    const existing = await ctx.db
      .query('enviosPt')
      .withIndex('by_participante_item_group', (q) =>
        q.eq('rondaParticipanteId', rondaParticipanteId).eq('ptItemId', ptItemId).eq('sampleGroupId', sampleGroupId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { d1, d2, d3, meanValue, sdValue, ux, uxExp, draftSavedAt: now, updatedAt: now })
      return existing._id
    }

    return ctx.db.insert('enviosPt', {
      rondaId,
      rondaParticipanteId,
      ptItemId,
      sampleGroupId,
      d1,
      d2,
      d3,
      meanValue,
      sdValue,
      ux,
      uxExp,
      draftSavedAt: now,
      updatedAt: now,
    })
  },
})

export const submitFinalPT = mutation({
  args: { rondaId: v.id('rondas'), userId: v.string() },
  handler: async (ctx, { rondaId, userId }) => {
    const participante = await ctx.db
      .query('rondaParticipantes')
      .withIndex('by_ronda_user', (q) => q.eq('rondaId', rondaId).eq('workosUserId', userId))
      .unique()
    if (!participante) throw new Error('Participante no encontrado')

    const [items, sampleGroups] = await Promise.all([
      ctx.db.query('rondaPtItems').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
      ctx.db.query('rondaPtSampleGroups').withIndex('by_ronda', (q) => q.eq('rondaId', rondaId)).collect(),
    ])
    const expectedCount = items.length * sampleGroups.length

    const envios = await ctx.db
      .query('enviosPt')
      .withIndex('by_participante', (q) => q.eq('rondaParticipanteId', participante._id))
      .collect()

    if (envios.length !== expectedCount) {
      throw new Error('Faltan datos para completar el envio final')
    }

    const now = Date.now()
    await Promise.all(envios.map((e) => ctx.db.patch(e._id, { finalSubmittedAt: now, updatedAt: now })))
    return new Date(now).toISOString()
  },
})

// ---------------------------------------------------------------------------
// Admin PT — mutations
// ---------------------------------------------------------------------------

export const createPTItem = mutation({
  args: {
    rondaId:      v.id('rondas'),
    contaminante: v.union(
      v.literal('CO'), v.literal('SO2'), v.literal('O3'), v.literal('NO'), v.literal('NO2')
    ),
    runCode:    v.string(),
    levelLabel: v.string(),
    sortOrder:  v.number(),
  },
  handler: async (ctx, { rondaId, contaminante, runCode, levelLabel, sortOrder }) => {
    const id = await ctx.db.insert('rondaPtItems', { rondaId, contaminante, runCode, levelLabel, sortOrder, createdAt: Date.now() })
    return ctx.db.get(id)
  },
})

export const createPTItemsBulk = mutation({
  args: {
    rondaId:      v.id('rondas'),
    contaminante: v.union(
      v.literal('CO'), v.literal('SO2'), v.literal('O3'), v.literal('NO'), v.literal('NO2')
    ),
    items: v.array(v.object({
      runCode:    v.string(),
      levelLabel: v.string(),
      sortOrder:  v.number(),
    })),
  },
  handler: async (ctx, { rondaId, contaminante, items }) => {
    const now = Date.now()
    const ids = []
    for (const item of items) {
      const id = await ctx.db.insert('rondaPtItems', {
        rondaId,
        contaminante,
        runCode: item.runCode,
        levelLabel: item.levelLabel,
        sortOrder: item.sortOrder,
        createdAt: now,
      })
      ids.push(id)
    }
    return Promise.all(ids.map((id) => ctx.db.get(id)))
  },
})

export const createPTSampleGroup = mutation({
  args: {
    rondaId:     v.id('rondas'),
    sampleGroup: v.string(),
    sortOrder:   v.number(),
  },
  handler: async (ctx, { rondaId, sampleGroup, sortOrder }) => {
    const id = await ctx.db.insert('rondaPtSampleGroups', { rondaId, sampleGroup, sortOrder, createdAt: Date.now() })
    return ctx.db.get(id)
  },
})

export const updateParticipantePT = mutation({
  args: {
    participanteId:  v.id('rondaParticipantes'),
    participantCode: v.union(v.string(), v.null()),
    replicateCode:   v.union(v.number(), v.null()),
  },
  handler: async (ctx, { participanteId, participantCode, replicateCode }) => {
    const patch: {
      participantCode?: string | null
      replicateCode?: number | null
    } = {}
    if (participantCode !== undefined) patch.participantCode = participantCode
    if (replicateCode !== undefined) patch.replicateCode = replicateCode
    if (Object.keys(patch).length > 0) await ctx.db.patch(participanteId, patch)
  },
})

export const deletePTItem = mutation({
  args: { rondaId: v.id('rondas'), itemId: v.id('rondaPtItems') },
  handler: async (ctx, { rondaId, itemId }) => {
    const item = await ctx.db.get(itemId)
    if (!item) return
    if (item.rondaId !== rondaId) throw new Error('Item PT no pertenece a la ronda')

    // Cascada manual: eliminar envios_pt relacionados
    const envios = await ctx.db
      .query('enviosPt')
      .withIndex('by_pt_item', (q) => q.eq('ptItemId', itemId))
      .collect()
    await Promise.all(envios.map((e) => ctx.db.delete(e._id)))
    await ctx.db.delete(itemId)
  },
})

export const deletePTSampleGroup = mutation({
  args: { rondaId: v.id('rondas'), groupId: v.id('rondaPtSampleGroups') },
  handler: async (ctx, { rondaId, groupId }) => {
    const group = await ctx.db.get(groupId)
    if (!group) return
    if (group.rondaId !== rondaId) throw new Error('Grupo de muestra PT no pertenece a la ronda')

    // Cascada manual: eliminar envios_pt con este sampleGroupId
    const envios = await ctx.db
      .query('enviosPt')
      .withIndex('by_ronda', (q) => q.eq('rondaId', group.rondaId))
      .collect()
    const toDelete = envios.filter((e) => e.sampleGroupId === groupId)
    await Promise.all(toDelete.map((e) => ctx.db.delete(e._id)))
    await ctx.db.delete(groupId)
  },
})
