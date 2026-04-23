'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireAuth, isAdmin } from '@/lib/auth'
import {
  CONTAMINANTES,
  PENDING_PARTICIPANTE_PREFIX,
  REPLICAS_OPTIONS,
  type Contaminante,
  type EstadoRonda,
} from '@/lib/rondas'
import { getSupabaseAdmin } from '@/lib/supabase'

type ConfigContaminante = {
  contaminante: Contaminante
  niveles: number
  replicas: 2 | 3
}

async function requireAdmin() {
  const auth = await requireAuth()
  if (!isAdmin(auth)) {
    redirect('/denied?reason=role')
  }

  return auth
}

function parseText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function parseParticipantesPlaneados(formData: FormData) {
  const rawValue = parseText(formData, 'participantes_planeados')
  const value = Number.parseInt(rawValue, 10)

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('Defina un número válido de participantes para la ronda.')
  }

  return value
}

function parseIncludeReference(formData: FormData) {
  return formData.get('include_reference') === 'on'
}

function parseContaminantes(formData: FormData): ConfigContaminante[] {
  const configs: ConfigContaminante[] = []

  for (const contaminante of CONTAMINANTES) {
    const enabled = formData.get(`enabled_${contaminante}`) === 'on'
    if (!enabled) continue

    const nivelesValue = Number.parseInt(parseText(formData, `niveles_${contaminante}`), 10)
    const replicasValue = Number.parseInt(parseText(formData, `replicas_${contaminante}`), 10)

    if (!Number.isInteger(nivelesValue) || nivelesValue < 1) {
      throw new Error(`Defina un número válido de niveles para ${contaminante}.`)
    }

    if (!REPLICAS_OPTIONS.includes(replicasValue as 2 | 3)) {
      throw new Error(`Defina 2 o 3 réplicas para ${contaminante}.`)
    }

    configs.push({
      contaminante,
      niveles: nivelesValue,
      replicas: replicasValue as 2 | 3,
    })
  }

  if (configs.length === 0) {
    throw new Error('Seleccione al menos un contaminante para la ronda.')
  }

  return configs
}

function normalizeCodigo(rawCodigo: string) {
  return rawCodigo.toUpperCase().replace(/\s+/g, '-')
}

function buildErrorUrl(message: string) {
  return `/dashboard?error=${encodeURIComponent(message)}`
}

function buildSuccessUrl(message: string) {
  return `/dashboard?success=${encodeURIComponent(message)}`
}

export async function createRondaAction(formData: FormData) {
  await requireAdmin()

  let targetUrl = buildErrorUrl('No fue posible crear la ronda.')

  try {
    const nombre = parseText(formData, 'nombre')
    const codigo = normalizeCodigo(parseText(formData, 'codigo'))
    const participantesPlaneados = parseParticipantesPlaneados(formData)
    const includeReference = parseIncludeReference(formData)
    const contaminantes = parseContaminantes(formData)

    if (!nombre) {
      throw new Error('El nombre de la ronda es obligatorio.')
    }

    if (!codigo) {
      throw new Error('El código de la ronda es obligatorio.')
    }

    const { data: ronda, error: rondaError } = await getSupabaseAdmin()
      .from('rondas')
      .insert({ nombre, codigo, estado: 'borrador' satisfies EstadoRonda })
      .select('id')
      .single()

    if (rondaError || !ronda) {
      throw new Error(rondaError?.message ?? 'No fue posible crear la ronda.')
    }

    const { error: configError } = await getSupabaseAdmin()
      .from('ronda_contaminantes')
      .insert(
        contaminantes.map((item) => ({
          ronda_id: ronda.id,
          contaminante: item.contaminante,
          niveles: item.niveles,
          replicas: item.replicas,
        }))
      )

    if (configError) {
      await getSupabaseAdmin().from('rondas').delete().eq('id', ronda.id)
      throw new Error(configError.message)
    }

    const slots: Array<{
      ronda_id: string
      workos_user_id: string
      email: string
      participant_profile: 'member' | 'member_special'
    }> = Array.from({ length: participantesPlaneados }, (_, index) => ({
      ronda_id: ronda.id,
      workos_user_id: `${PENDING_PARTICIPANTE_PREFIX}${randomBytes(12).toString('hex')}`,
      email: `Participante ${String(index + 1).padStart(2, '0')} (pendiente)`,
      participant_profile: 'member',
    }))

    if (includeReference) {
      slots.push({
        ronda_id: ronda.id,
        workos_user_id: `${PENDING_PARTICIPANTE_PREFIX}${randomBytes(12).toString('hex')}`,
        email: 'Referencia (pendiente)',
        participant_profile: 'member_special',
      })
    }

    const { error: participantError } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .insert(slots)

    if (participantError) {
      await getSupabaseAdmin().from('ronda_contaminantes').delete().eq('ronda_id', ronda.id)
      await getSupabaseAdmin().from('rondas').delete().eq('id', ronda.id)
      throw new Error(participantError.message)
    }

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl(
      includeReference
        ? 'Ronda creada con enlaces listos (incluye referencia).'
        : 'Ronda creada en borrador con enlaces de acceso listos para envío.'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible crear la ronda.'
    targetUrl = buildErrorUrl(message)
  }

  redirect(targetUrl)
}

export async function updateRondaAction(formData: FormData) {
  await requireAdmin()

  let targetUrl = buildErrorUrl('No fue posible actualizar la ronda.')

  try {
    const rondaId = parseText(formData, 'ronda_id')
    const nombre = parseText(formData, 'nombre')
    const codigo = normalizeCodigo(parseText(formData, 'codigo'))
    const contaminantes = parseContaminantes(formData)

    if (!rondaId) {
      throw new Error('No se recibió la ronda a editar.')
    }

    if (!nombre || !codigo) {
      throw new Error('Nombre y código son obligatorios.')
    }

    const { data: ronda, error: rondaError } = await getSupabaseAdmin()
      .from('rondas')
      .select('id, estado')
      .eq('id', rondaId)
      .single()

    if (rondaError || !ronda) {
      throw new Error('La ronda no existe.')
    }

    if (ronda.estado !== 'borrador') {
      throw new Error('Solo se puede editar la configuración de rondas en borrador.')
    }

    const { error: updateError } = await getSupabaseAdmin()
      .from('rondas')
      .update({ nombre, codigo })
      .eq('id', rondaId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    const { error: deleteError } = await getSupabaseAdmin()
      .from('ronda_contaminantes')
      .delete()
      .eq('ronda_id', rondaId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    const { error: insertError } = await getSupabaseAdmin()
      .from('ronda_contaminantes')
      .insert(
        contaminantes.map((item) => ({
          ronda_id: rondaId,
          contaminante: item.contaminante,
          niveles: item.niveles,
          replicas: item.replicas,
        }))
      )

    if (insertError) {
      throw new Error(insertError.message)
    }

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl('Configuración de ronda actualizada.')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No fue posible actualizar la ronda.'
    targetUrl = buildErrorUrl(message)
  }

  redirect(targetUrl)
}

export async function changeRondaStatusAction(formData: FormData) {
  await requireAdmin()

  let targetUrl = buildErrorUrl('No fue posible cambiar el estado.')

  try {
    const rondaId = parseText(formData, 'ronda_id')
    const nextState = parseText(formData, 'next_state') as EstadoRonda

    if (!rondaId || !['activa', 'cerrada'].includes(nextState)) {
      throw new Error('La transición solicitada no es válida.')
    }

    const { data: ronda, error: rondaError } = await getSupabaseAdmin()
      .from('rondas')
      .select('id, estado')
      .eq('id', rondaId)
      .single()

    if (rondaError || !ronda) {
      throw new Error('La ronda no existe.')
    }

    if (ronda.estado === 'cerrada') {
      throw new Error('Las rondas cerradas no admiten nuevas transiciones.')
    }

    if (ronda.estado === 'borrador' && nextState !== 'activa') {
      throw new Error('Una ronda en borrador solo puede pasar a activa.')
    }

    if (ronda.estado === 'activa' && nextState !== 'cerrada') {
      throw new Error('Una ronda activa solo puede pasar a cerrada.')
    }

    const { error: updateError } = await getSupabaseAdmin()
      .from('rondas')
      .update({ estado: nextState })
      .eq('id', rondaId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl(
      nextState === 'activa'
        ? 'Ronda publicada y disponible para asignaciones.'
        : 'Ronda cerrada correctamente.'
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No fue posible cambiar el estado.'
    targetUrl = buildErrorUrl(message)
  }

  redirect(targetUrl)
}

export async function deleteRondaAction(formData: FormData) {
  await requireAdmin()

  let targetUrl = buildErrorUrl('No fue posible eliminar la ronda.')

  try {
    const rondaId = parseText(formData, 'ronda_id')

    if (!rondaId) {
      throw new Error('No se recibió la ronda a eliminar.')
    }

    const { data: ronda, error: rondaError } = await getSupabaseAdmin()
      .from('rondas')
      .select('id, nombre')
      .eq('id', rondaId)
      .single()

    if (rondaError || !ronda) {
      throw new Error('La ronda no existe.')
    }

    const { error: deleteError } = await getSupabaseAdmin()
      .from('rondas')
      .delete()
      .eq('id', rondaId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl(`Ronda "${ronda.nombre}" eliminada correctamente.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible eliminar la ronda.'
    targetUrl = buildErrorUrl(message)
  }

  redirect(targetUrl)
}
