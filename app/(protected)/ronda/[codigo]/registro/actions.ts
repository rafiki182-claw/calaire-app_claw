'use server'

import { signOut } from '@workos-inc/authkit-nextjs'

import { buildAbsoluteAppUrl } from '@/lib/app-url'
import { requireAuth, isAdmin } from '@/lib/auth'
import { getRondaByCodigo, getRondaParticipantePT, isInvitado } from '@/lib/rondas'
import {
  getOrCreateFicha,
  getFichaByRondaParticipante,
  upsertFichaScalars,
  replaceAcompanantes,
  replaceAnalizadores,
  replaceInstrumentos,
  submitFicha,
  FICHA_SCALAR_ALLOWLIST,
  type FichaScalarField,
  type AcompananteInput,
  type AnalizadorInput,
  type InstrumentoInput,
} from '@/lib/fichas'

async function resolveRondaParticipante(codigoRonda: string) {
  const auth = await requireAuth()
  if (!auth.user) return { error: 'No autenticado' as const }

  const ronda = await getRondaByCodigo(codigoRonda)
  if (!ronda) return { error: 'Ronda no encontrada' as const }

  const invitado = await isInvitado(ronda.id, auth.user.id)
  if (!invitado && !isAdmin(auth)) return { error: 'No autorizado' as const }

  const rp = await getRondaParticipantePT(ronda.id, auth.user.id)
  if (!rp) return { error: 'Participante no encontrado' as const }

  return { auth, ronda, rp }
}

export async function guardarCampoFichaAction(
  codigoRonda: string,
  field: string,
  value: string | boolean | null
): Promise<{ ok?: boolean; error?: string }> {
  const result = await resolveRondaParticipante(codigoRonda)
  if ('error' in result) return { error: result.error }

  if (!(FICHA_SCALAR_ALLOWLIST as readonly string[]).includes(field)) {
    return { error: 'Campo no permitido' }
  }

  const ficha = await getOrCreateFicha(result.rp.id)
  await upsertFichaScalars(ficha.id, field as FichaScalarField, value)
  return { ok: true }
}

export async function guardarListasAction(
  codigoRonda: string,
  acompanantes: AcompananteInput[],
  analizadores: AnalizadorInput[],
  instrumentos: InstrumentoInput[]
): Promise<{ ok?: boolean; error?: string }> {
  const result = await resolveRondaParticipante(codigoRonda)
  if ('error' in result) return { error: result.error }

  const ficha = await getOrCreateFicha(result.rp.id)
  if (ficha.estado !== 'borrador') return { error: 'La ficha ya fue enviada y no puede modificarse' }

  await Promise.all([
    replaceAcompanantes(ficha.id, acompanantes),
    replaceAnalizadores(ficha.id, analizadores),
    replaceInstrumentos(ficha.id, instrumentos),
  ])

  return { ok: true }
}

export async function enviarFichaFinalAction(
  codigoRonda: string
): Promise<{ ok?: boolean; error?: string; errores?: string[] }> {
  const result = await resolveRondaParticipante(codigoRonda)
  if ('error' in result) return { error: result.error }

  const ficha = await getFichaByRondaParticipante(result.rp.id)
  if (!ficha) return { error: 'No existe la ficha de registro' }
  if (ficha.estado !== 'borrador') return { error: 'La ficha ya fue enviada' }

  const errores: string[] = []
  if (!ficha.nombre_laboratorio?.trim()) errores.push('Nombre del laboratorio es requerido')
  if (!ficha.nombre_responsable?.trim()) errores.push('Nombre del responsable es requerido')
  if (!ficha.cargo?.trim()) errores.push('Cargo es requerido')
  if (!ficha.ciudad?.trim()) errores.push('Ciudad es requerida')
  if (!ficha.dec_datos_correctos) errores.push('Debe confirmar que los datos son correctos')
  if (!ficha.dec_acepta_condiciones) errores.push('Debe aceptar las condiciones de participación')
  if (!ficha.dec_compromisos) errores.push('Debe aceptar los compromisos del participante')
  if (!ficha.dec_firma_autorizada) errores.push('Debe confirmar que la firma está autorizada')
  if (!ficha.nombre_firma?.trim()) errores.push('Nombre para la firma es requerido')

  if (errores.length > 0) return { errores }

  await submitFicha(ficha.id)
  return { ok: true }
}

export async function cerrarSesionParticipanteAction() {
  await signOut({ returnTo: buildAbsoluteAppUrl('/login') })
}
