'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireAuth, isAdmin } from '@/lib/auth'
import { getRonda, transitionRondaEstado, reabrirRonda } from '@/lib/rondas'

function pageUrl(rondaId: string) {
  return `/dashboard/rondas/${rondaId}`
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

export async function activarRondaAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  let targetUrl = errorUrl(rondaId, 'Error al activar la ronda.')

  try {
    if (!rondaId) throw new Error('Datos incompletos.')

    const ronda = await getRonda(rondaId)
    if (!ronda) throw new Error('Ronda no encontrada.')
    if (ronda.estado !== 'borrador') {
      throw new Error('Solo se puede activar una ronda en borrador.')
    }

    await transitionRondaEstado(rondaId, 'activa')

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Ronda activada correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al activar la ronda.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function cerrarRondaAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const confirm = parseText(formData, 'confirm')
  let targetUrl = errorUrl(rondaId, 'Error al cerrar la ronda.')

  if (!rondaId) {
    redirect(errorUrl(rondaId, 'Datos incompletos.'))
  }
  if (confirm !== '1') {
    redirect(`${pageUrl(rondaId)}?confirm_cerrar=1`)
  }

  try {
    const ronda = await getRonda(rondaId)
    if (!ronda) throw new Error('Ronda no encontrada.')
    if (ronda.estado !== 'activa') {
      throw new Error('Solo se puede cerrar una ronda activa.')
    }

    await transitionRondaEstado(rondaId, 'cerrada')

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Ronda cerrada correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al cerrar la ronda.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function reabrirRondaAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const confirm = parseText(formData, 'confirm')
  let targetUrl = errorUrl(rondaId, 'Error al reabrir la ronda.')

  if (!rondaId) {
    redirect(errorUrl(rondaId, 'Datos incompletos.'))
  }
  if (confirm !== '1') {
    redirect(`${pageUrl(rondaId)}?confirm_reabrir=1`)
  }

  try {
    const ronda = await getRonda(rondaId)
    if (!ronda) throw new Error('Ronda no encontrada.')
    if (ronda.estado !== 'cerrada') {
      throw new Error('Solo se puede reabrir una ronda cerrada.')
    }

    await reabrirRonda(rondaId)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Ronda reabierta correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al reabrir la ronda.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}
