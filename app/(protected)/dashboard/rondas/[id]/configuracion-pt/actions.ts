'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireAuth, isAdmin } from '@/lib/auth'
import {
  createPTItem,
  createPTSampleGroup,
  deletePTItem,
  deletePTSampleGroup,
  listPTItems,
  listPTSampleGroups,
  updateParticipantePT,
  type Contaminante,
} from '@/lib/rondas'
import { CONTAMINANTES } from '@/lib/rondas'

function pageUrl(rondaId: string) {
  return `/dashboard/rondas/${rondaId}/configuracion-pt`
}

function errorUrl(rondaId: string, msg: string) {
  return `${pageUrl(rondaId)}?error=${encodeURIComponent(msg)}`
}

function successUrl(rondaId: string, msg: string) {
  return `${pageUrl(rondaId)}?success=${encodeURIComponent(msg)}`
}

async function requireAdmin() {
  const auth = await requireAuth()
  if (!isAdmin(auth)) redirect('/denied?reason=role')
  return auth
}

function parseText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function parseNumber(formData: FormData, key: string) {
  const val = parseText(formData, key)
  return val ? parseInt(val, 10) : null
}

async function ensureDefaultSampleGroup(rondaId: string) {
  const existing = await listPTSampleGroups(rondaId)
  const found = existing.find((row) => row.sample_group === 'A')
  if (found) return found

  const sortOrder = Math.max(0, ...existing.map((row) => row.sort_order)) + 1
  return createPTSampleGroup(rondaId, 'A', sortOrder)
}

export async function createPTItemAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const contaminante = parseText(formData, 'contaminante') as Contaminante
  const runCode = parseText(formData, 'run_code')
  const levelLabel = parseText(formData, 'level_label')
  let targetUrl = errorUrl(rondaId, 'Error al crear el item PT.')

  try {
    if (!rondaId || !contaminante || !runCode || !levelLabel) {
      throw new Error('Datos incompletos para crear el item PT.')
    }

    if (!CONTAMINANTES.includes(contaminante)) {
      throw new Error('Contaminante inválido.')
    }

    if (runCode.length === 0 || levelLabel.length === 0) {
      throw new Error('El código de corrida y el nivel son obligatorios.')
    }

    await ensureDefaultSampleGroup(rondaId)

    const existing = (await listPTItems(rondaId)).filter(
      (row) => row.contaminante === contaminante
    )

    if ((existing ?? []).some((row) => row.run_code === runCode)) {
      throw new Error('Ya existe una corrida PT con ese código (run) para este contaminante.')
    }

    if ((existing ?? []).some((row) => row.level_label === levelLabel)) {
      throw new Error('Ya existe una corrida PT con ese nivel (level) para este contaminante.')
    }

    const sortOrder = Math.max(0, ...existing.map((row) => row.sort_order)) + 1

    await createPTItem(rondaId, contaminante, runCode, levelLabel, sortOrder)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Item PT creado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el item PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function createPTItemsBulkAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const contaminante = parseText(formData, 'contaminante') as Contaminante
  const rawLevels = parseText(formData, 'levels')
  let targetUrl = errorUrl(rondaId, 'Error al crear los niveles PT.')

  try {
    if (!rondaId || !contaminante || !rawLevels) {
      throw new Error('Seleccione un contaminante y escriba al menos un nivel.')
    }

    if (!CONTAMINANTES.includes(contaminante)) {
      throw new Error('Contaminante inválido.')
    }

    const rows = rawLevels
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t;|]/).map((part) => part.trim()).filter(Boolean)
        if (parts.length === 1) return { runCode: parts[0], levelLabel: parts[0] }
        return { runCode: parts[0], levelLabel: parts[1] }
      })

    if (rows.length === 0) {
      throw new Error('Escriba al menos un nivel.')
    }

    const repeatedInInput = new Set<string>()
    for (const row of rows) {
      if (!row.runCode || !row.levelLabel) {
        throw new Error('Cada línea debe tener un nivel o el formato run, level.')
      }
      const key = `${row.runCode}::${row.levelLabel}`
      if (repeatedInInput.has(key)) {
        throw new Error(`La línea ${row.runCode}, ${row.levelLabel} está repetida.`)
      }
      repeatedInInput.add(key)
    }

    await ensureDefaultSampleGroup(rondaId)

    const existing = (await listPTItems(rondaId)).filter(
      (row) => row.contaminante === contaminante
    )
    const existingRuns = new Set(existing.map((row) => row.run_code))
    const existingLevels = new Set(existing.map((row) => row.level_label))

    for (const row of rows) {
      if (existingRuns.has(row.runCode)) {
        throw new Error(`Ya existe la corrida ${row.runCode} para ${contaminante}.`)
      }
      if (existingLevels.has(row.levelLabel)) {
        throw new Error(`Ya existe el nivel ${row.levelLabel} para ${contaminante}.`)
      }
    }

    let sortOrder = Math.max(0, ...existing.map((row) => row.sort_order))
    for (const row of rows) {
      sortOrder += 1
      await createPTItem(rondaId, contaminante, row.runCode, row.levelLabel, sortOrder)
    }

    revalidatePath(pageUrl(rondaId))
    revalidatePath(`/dashboard/rondas/${rondaId}`)
    targetUrl = successUrl(rondaId, `${rows.length} nivel${rows.length !== 1 ? 'es' : ''} PT creado${rows.length !== 1 ? 's' : ''}.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear los niveles PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function createPTSampleGroupAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const sampleGroup = parseText(formData, 'sample_group')
  let targetUrl = errorUrl(rondaId, 'Error al crear el grupo de muestra PT.')

  try {
    if (!rondaId || !sampleGroup) {
      throw new Error('Datos incompletos para crear el grupo de muestra PT.')
    }

    if (sampleGroup.length === 0) {
      throw new Error('El nombre del grupo de muestra es obligatorio.')
    }

    const existing = await listPTSampleGroups(rondaId)
    if (existing.some((row) => row.sample_group === sampleGroup)) {
      throw new Error('Ya existe un grupo de muestra con este nombre en esta ronda.')
    }

    const sortOrder = Math.max(0, ...existing.map((row) => row.sort_order)) + 1

    await createPTSampleGroup(rondaId, sampleGroup, sortOrder)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Grupo de muestra PT creado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el grupo de muestra PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function updateParticipantePTAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const participanteId = parseText(formData, 'participante_id')
  const participantCode = parseText(formData, 'participant_code') || null
  const replicateCode = parseNumber(formData, 'replicate_code')
  let targetUrl = errorUrl(rondaId, 'Error al actualizar el participante PT.')

  try {
    if (!rondaId || !participanteId) {
      throw new Error('Datos incompletos para actualizar el participante PT.')
    }

    if (replicateCode !== null && replicateCode < 1) {
      throw new Error('El código de réplica debe ser mayor o igual a 1.')
    }

    await updateParticipantePT(participanteId, participantCode, replicateCode)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Participante PT actualizado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar el participante PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function deletePTItemAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const itemId = parseText(formData, 'item_id')
  let targetUrl = errorUrl(rondaId, 'Error al eliminar el item PT.')

  try {
    if (!rondaId || !itemId) {
      throw new Error('Datos incompletos para eliminar el item PT.')
    }

    await deletePTItem(rondaId, itemId)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Item PT eliminado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar el item PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function deletePTSampleGroupAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const groupId = parseText(formData, 'group_id')
  let targetUrl = errorUrl(rondaId, 'Error al eliminar el grupo de muestra PT.')

  try {
    if (!rondaId || !groupId) {
      throw new Error('Datos incompletos para eliminar el grupo de muestra PT.')
    }

    await deletePTSampleGroup(rondaId, groupId)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Grupo de muestra PT eliminado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar el grupo de muestra PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}
