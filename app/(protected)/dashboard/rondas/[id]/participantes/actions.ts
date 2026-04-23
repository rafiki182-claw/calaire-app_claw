'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireAuth, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { PENDING_PARTICIPANTE_PREFIX } from '@/lib/rondas'
import { findUserByEmail, createWorkOSUser } from '@/lib/workos'

function pageUrl(rondaId: string) {
  return `/dashboard/rondas/${rondaId}/participantes`
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

function pendingLabel(profile: 'member' | 'member_special') {
  return profile === 'member_special' ? 'Referencia (pendiente)' : 'Participante (pendiente)'
}

export async function lookupUserAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const email = parseText(formData, 'email').toLowerCase()

  if (!rondaId || !email) {
    redirect(errorUrl(rondaId, 'El correo es obligatorio.'))
  }

  let targetUrl = errorUrl(rondaId, 'Error al consultar el directorio.')

  try {
    const user = await findUserByEmail(email)

    if (!user) {
      targetUrl = `${pageUrl(rondaId)}?busqueda_email=${encodeURIComponent(email)}&not_found=1`
    } else {
      targetUrl =
        `${pageUrl(rondaId)}?busqueda_email=${encodeURIComponent(email)}` +
        `&found_id=${encodeURIComponent(user.id)}` +
        `&found_email=${encodeURIComponent(user.email)}` +
        `&found_name=${encodeURIComponent(user.displayName)}`
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al consultar el directorio.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function inviteParticipanteAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const workosUserId = parseText(formData, 'workos_user_id')
  const email = parseText(formData, 'email')
  let targetUrl = errorUrl(rondaId, 'Error al agregar el participante.')

  try {
    if (!rondaId || !workosUserId || !email) {
      throw new Error('Datos incompletos para la invitación.')
    }

    const { data: ronda } = await getSupabaseAdmin()
      .from('rondas')
      .select('estado')
      .eq('id', rondaId)
      .single()

    if (ronda?.estado === 'cerrada') {
      throw new Error('No se puede asignar participantes a una ronda cerrada.')
    }

    const { error } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .insert({
        ronda_id: rondaId,
        workos_user_id: workosUserId,
        email,
        participant_profile: 'member',
      })

    if (error) {
      if (error.code === '23505') throw new Error('Este usuario ya está asignado a esta ronda.')
      throw new Error(error.message)
    }

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Participante agregado correctamente.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al agregar el participante.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function createAndInviteAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const email = parseText(formData, 'email').toLowerCase()
  const firstName = parseText(formData, 'first_name') || undefined
  const lastName = parseText(formData, 'last_name') || undefined
  let targetUrl = errorUrl(rondaId, 'Error al crear el usuario.')

  try {
    if (!rondaId || !email) throw new Error('El correo es obligatorio.')

    const { data: ronda } = await getSupabaseAdmin()
      .from('rondas')
      .select('estado')
      .eq('id', rondaId)
      .single()

    if (ronda?.estado === 'cerrada') {
      throw new Error('No se puede asignar participantes a una ronda cerrada.')
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      throw new Error('El usuario ya existe en WorkOS. Use el buscador para agregarlo.')
    }

    const newUser = await createWorkOSUser(email, firstName, lastName)

    const { error } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .insert({
        ronda_id: rondaId,
        workos_user_id: newUser.id,
        email: newUser.email,
        participant_profile: 'member',
      })

    if (error) {
      if (error.code === '23505') throw new Error('Este usuario ya está asignado a esta ronda.')
      throw new Error(error.message)
    }

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, `Usuario ${email} creado e invitado correctamente.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el usuario.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function regenerateSlotAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const participanteId = parseText(formData, 'participante_id')
  let targetUrl = errorUrl(rondaId, 'Error al regenerar el enlace.')

  try {
    if (!rondaId || !participanteId) throw new Error('Datos incompletos.')

    const { data: ronda } = await getSupabaseAdmin()
      .from('rondas')
      .select('estado')
      .eq('id', rondaId)
      .single()

    if (ronda?.estado === 'cerrada') {
      throw new Error('No se puede modificar una ronda cerrada.')
    }

    const { data: participante, error: participanteError } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .select('participant_profile')
      .eq('id', participanteId)
      .eq('ronda_id', rondaId)
      .single()

    if (participanteError || !participante) {
      throw new Error('No se encontró el participante a regenerar.')
    }

    const profile = participante.participant_profile === 'member_special' ? 'member_special' : 'member'
    const newToken = randomBytes(12).toString('hex')
    const { error } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .update({
        workos_user_id: `${PENDING_PARTICIPANTE_PREFIX}${newToken}`,
        email: pendingLabel(profile),
        claimed_at: null,
      })
      .eq('id', participanteId)
      .eq('ronda_id', rondaId)

    if (error) throw new Error(error.message)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Enlace regenerado. El enlace anterior ya no es válido.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al regenerar el enlace.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function removeParticipanteAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  const participanteId = parseText(formData, 'participante_id')
  let targetUrl = errorUrl(rondaId, 'Error al eliminar el participante.')

  try {
    if (!rondaId || !participanteId) throw new Error('Datos incompletos.')

    const { data: ronda } = await getSupabaseAdmin()
      .from('rondas')
      .select('estado')
      .eq('id', rondaId)
      .single()

    if (ronda?.estado === 'cerrada') {
      throw new Error('No se puede modificar la lista de una ronda cerrada.')
    }

    const { error } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .delete()
      .eq('id', participanteId)
      .eq('ronda_id', rondaId)

    if (error) throw new Error(error.message)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Participante eliminado de la ronda.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar el participante.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}

export async function addReferenceSlotAction(formData: FormData) {
  await requireAdmin()

  const rondaId = parseText(formData, 'ronda_id')
  let targetUrl = errorUrl(rondaId, 'Error al crear el enlace de referencia.')

  try {
    if (!rondaId) throw new Error('Datos incompletos.')

    const { data: ronda } = await getSupabaseAdmin()
      .from('rondas')
      .select('estado')
      .eq('id', rondaId)
      .single()

    if (ronda?.estado === 'cerrada') {
      throw new Error('No se puede modificar una ronda cerrada.')
    }

    const { count, error: countError } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .select('id', { count: 'exact', head: true })
      .eq('ronda_id', rondaId)
      .eq('participant_profile', 'member_special')

    if (countError) throw new Error(countError.message)
    if ((count ?? 0) > 0) {
      throw new Error('Esta ronda ya tiene un enlace de referencia.')
    }

    const { error: insertError } = await getSupabaseAdmin()
      .from('ronda_participantes')
      .insert({
        ronda_id: rondaId,
        workos_user_id: `${PENDING_PARTICIPANTE_PREFIX}${randomBytes(12).toString('hex')}`,
        email: pendingLabel('member_special'),
        participant_profile: 'member_special',
      })

    if (insertError) throw new Error(insertError.message)

    revalidatePath(pageUrl(rondaId))
    targetUrl = successUrl(rondaId, 'Referencia agregada con enlace individual.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el enlace de referencia.'
    targetUrl = errorUrl(rondaId, msg)
  }

  redirect(targetUrl)
}
