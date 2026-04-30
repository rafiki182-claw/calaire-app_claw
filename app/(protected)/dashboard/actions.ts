'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireAuth, isAdmin } from '@/lib/auth'
import {
  CONTAMINANTES,
  PENDING_PARTICIPANTE_PREFIX,
  REPLICAS_OPTIONS,
  createConfiguredRonda,
  deleteRonda,
  reabrirRonda,
  transitionRondaEstado,
  updateRondaConfig,
  type Contaminante,
} from '@/lib/rondas'

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

function buildSuccessUrl(message: string, rondaId?: string) {
  if (rondaId) {
    return `/dashboard/rondas/${rondaId}/configuracion-pt?success=${encodeURIComponent(message)}`
  }
  return `/dashboard?tab=rondas&success=${encodeURIComponent(message)}`
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

    const slots: Array<{
      workosUserId: string
      email: string
      participantProfile: 'member' | 'member_special'
    }> = Array.from({ length: participantesPlaneados }, (_, index) => ({
      workosUserId: `${PENDING_PARTICIPANTE_PREFIX}${randomBytes(12).toString('hex')}`,
      email: `Participante ${String(index + 1).padStart(2, '0')} (pendiente)`,
      participantProfile: 'member',
    }))

    if (includeReference) {
      slots.push({
        workosUserId: `${PENDING_PARTICIPANTE_PREFIX}${randomBytes(12).toString('hex')}`,
        email: 'Referencia (pendiente)',
        participantProfile: 'member_special',
      })
    }

    const rondaId = await createConfiguredRonda(nombre, codigo, contaminantes, slots)

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl(
      includeReference
        ? 'Ronda creada con analitos y enlaces. Configure los niveles PT.'
        : 'Ronda creada con analitos y participantes. Configure los niveles PT.',
      rondaId
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

    await updateRondaConfig(rondaId, nombre, codigo, contaminantes)

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
    const nextState = parseText(formData, 'next_state')

    if (!rondaId || !['activa', 'cerrada'].includes(nextState)) {
      throw new Error('La transición solicitada no es válida.')
    }

    await transitionRondaEstado(rondaId, nextState as 'activa' | 'cerrada')

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

export async function reabrirRondaAction(formData: FormData) {
  await requireAdmin()

  let targetUrl = buildErrorUrl('No fue posible reabrir la ronda.')

  try {
    const rondaId = parseText(formData, 'ronda_id')
    if (!rondaId) throw new Error('No se recibió la ronda.')

    await reabrirRonda(rondaId)

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl('Ronda reabierta correctamente.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible reabrir la ronda.'
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

    const nombre = await deleteRonda(rondaId)

    revalidatePath('/dashboard')
    targetUrl = buildSuccessUrl(`Ronda "${nombre}" eliminada correctamente.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible eliminar la ronda.'
    targetUrl = buildErrorUrl(message)
  }

  redirect(targetUrl)
}
