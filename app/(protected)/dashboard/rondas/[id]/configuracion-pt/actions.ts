'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireAuth, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createPTItem, createPTSampleGroup, updateParticipantePT, type Contaminante } from '@/lib/rondas'
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

    const { data: existing, error: existingError } = await getSupabaseAdmin()
      .from('ronda_pt_items')
      .select('run_code, level_label')
      .eq('ronda_id', rondaId)
      .eq('contaminante', contaminante)
    if (existingError) throw new Error(existingError.message)

    if ((existing ?? []).some((row) => row.run_code === runCode)) {
      throw new Error('Ya existe una corrida PT con ese código (run) para este contaminante.')
    }

    if ((existing ?? []).some((row) => row.level_label === levelLabel)) {
      throw new Error('Ya existe una corrida PT con ese nivel (level) para este contaminante.')
    }

    const maxOrderResult = await getSupabaseAdmin()
      .from('ronda_pt_items')
      .select('sort_order')
      .eq('ronda_id', rondaId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sortOrder = (maxOrderResult.data?.sort_order ?? 0) + 1

    await createPTItem(rondaId, contaminante, runCode, levelLabel, sortOrder)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Item PT creado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el item PT.'
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

    const { data: existing } = await getSupabaseAdmin()
      .from('ronda_pt_sample_groups')
      .select('id')
      .eq('ronda_id', rondaId)
      .eq('sample_group', sampleGroup)
      .single()

    if (existing) {
      throw new Error('Ya existe un grupo de muestra con este nombre en esta ronda.')
    }

    const maxOrderResult = await getSupabaseAdmin()
      .from('ronda_pt_sample_groups')
      .select('sort_order')
      .eq('ronda_id', rondaId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sortOrder = (maxOrderResult.data?.sort_order ?? 0) + 1

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

    const { error } = await getSupabaseAdmin()
      .from('ronda_pt_items')
      .delete()
      .eq('id', itemId)
      .eq('ronda_id', rondaId)

    if (error) throw new Error(error.message)

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

    const { error } = await getSupabaseAdmin()
      .from('ronda_pt_sample_groups')
      .delete()
      .eq('id', groupId)
      .eq('ronda_id', rondaId)

    if (error) throw new Error(error.message)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Grupo de muestra PT eliminado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar el grupo de muestra PT.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}
