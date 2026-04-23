'use server'

import { isAdmin, requireAuth } from '@/lib/auth'
import {
  getEstadoEnvioPTParticipante,
  getRonda,
  getRondaParticipantePT,
  isInvitado,
  listPTItems,
  listPTSampleGroups,
  submitFinalPT,
  upsertEnvioPT,
} from '@/lib/rondas'

export async function guardarEnvioAction(
  rondaId: string,
  ptItemId: string,
  sampleGroupId: string,
  d1: number,
  d2: number,
  d3: number,
  meanValue: number,
  sdValue: number,
  ux: number,
  uxExp: number,
): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAuth()
  if (!auth.user) return { error: 'No autenticado' }

  const ronda = await getRonda(rondaId)
  if (!ronda) return { error: 'La ronda no existe o ya no está disponible.' }
  if (ronda.estado !== 'activa') return { error: 'La ronda no admite cambios en este momento.' }

  if (!isAdmin(auth)) {
    const invitado = await isInvitado(rondaId, auth.user.id)
    if (!invitado) return { error: 'No tienes acceso a esta ronda.' }
  }

  const estadoEnvio = await getEstadoEnvioPTParticipante(rondaId, auth.user.id)
  if (estadoEnvio.enviado) {
    return { error: 'Ya enviaste tus resultados finales. Solo puedes consultarlos.' }
  }

  const participante = await getRondaParticipantePT(rondaId, auth.user.id)
  if (!participante) {
    return { error: 'No fue posible encontrar la asignación del participante para esta ronda.' }
  }
  if (!participante.participant_code || participante.replicate_code == null) {
    return {
      error:
        'Aún no tienes código PT o código de réplica asignado. Contacta al coordinador para continuar.',
    }
  }

  const [items, sampleGroups] = await Promise.all([listPTItems(rondaId), listPTSampleGroups(rondaId)])
  if (!items.some((item) => item.id === ptItemId)) {
    return { error: 'La combinación de corrida PT no pertenece a esta ronda.' }
  }
  if (!sampleGroups.some((group) => group.id === sampleGroupId)) {
    return { error: 'El grupo de muestra no pertenece a esta ronda.' }
  }

  if (!Number.isFinite(d1) || !Number.isFinite(d2) || !Number.isFinite(d3)) {
    return { error: 'Los tres datos individuales deben ser números válidos.' }
  }
  if (!Number.isFinite(meanValue)) {
    return { error: 'El promedio debe ser un número válido.' }
  }
  if (!Number.isFinite(sdValue) || sdValue < 0) {
    return { error: 'La desviación estándar debe ser un número válido mayor o igual a cero.' }
  }
  if (!Number.isFinite(ux) || ux < 0) {
    return { error: 'u(x) debe ser un número válido mayor o igual a cero.' }
  }
  if (!Number.isFinite(uxExp) || uxExp < 0) {
    return { error: 'u(x) exp debe ser un número válido mayor o igual a cero.' }
  }

  try {
    await upsertEnvioPT(rondaId, participante.id, ptItemId, sampleGroupId, d1, d2, d3, meanValue, sdValue, ux, uxExp)
    return { ok: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No fue posible guardar el envío PT.',
    }
  }
}

export async function enviarInformeFinalAction(
  rondaId: string
): Promise<{ ok?: boolean; error?: string; submittedAt?: string }> {
  const auth = await requireAuth()
  if (!auth.user) return { error: 'No autenticado' }

  const ronda = await getRonda(rondaId)
  if (!ronda) return { error: 'La ronda no existe o ya no está disponible.' }
  if (ronda.estado !== 'activa') {
    return { error: 'La ronda no admite envíos finales en este momento.' }
  }

  if (!isAdmin(auth)) {
    const invitado = await isInvitado(rondaId, auth.user.id)
    if (!invitado) return { error: 'No tienes acceso a esta ronda.' }
  }

  const participante = await getRondaParticipantePT(rondaId, auth.user.id)
  if (!participante) {
    return { error: 'No fue posible encontrar la asignación del participante para esta ronda.' }
  }
  if (!participante.participant_code || participante.replicate_code == null) {
    return {
      error:
        'No puedes enviar el informe final sin código PT y código de réplica asignados por coordinación.',
    }
  }

  const estadoEnvio = await getEstadoEnvioPTParticipante(rondaId, auth.user.id)

  if (estadoEnvio.enviado) {
    return {
      ok: true,
      submittedAt: estadoEnvio.enviados_at ?? undefined,
    }
  }

  if (!estadoEnvio.completo) {
    return {
      error: `Debes completar y guardar todas las combinaciones PT antes de enviar el informe (${estadoEnvio.total_guardado}/${estadoEnvio.total_esperado}).`,
    }
  }

  try {
    const submittedAt = await submitFinalPT(rondaId, auth.user.id)
    return { ok: true, submittedAt }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No fue posible enviar el informe final PT.',
    }
  }
}
