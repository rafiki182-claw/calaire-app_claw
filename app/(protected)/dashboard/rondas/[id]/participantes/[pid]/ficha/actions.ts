'use server'

import { requireAdminAuth } from '@/lib/auth'
import {
  replaceAcompanantes,
  replaceAnalizadores,
  replaceInstrumentos,
  FICHA_SCALAR_ALLOWLIST,
  type FichaScalarField,
  type AcompananteInput,
  type AnalizadorInput,
  type InstrumentoInput,
  upsertFichaScalars,
} from '@/lib/fichas'

export async function adminGuardarCampoFichaAction(
  fichaId: string,
  field: string,
  value: string | boolean | null
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdminAuth()

  if (!(FICHA_SCALAR_ALLOWLIST as readonly string[]).includes(field)) {
    return { error: 'Campo no permitido' }
  }

  try {
    await upsertFichaScalars(fichaId, field as FichaScalarField, value)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar el campo'
    return { error: `No fue posible guardar el campo: ${msg}` }
  }
}

export async function adminGuardarListasAction(
  fichaId: string,
  acompanantes: AcompananteInput[],
  analizadores: AnalizadorInput[],
  instrumentos: InstrumentoInput[]
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdminAuth()

  try {
    await Promise.all([
      replaceAcompanantes(fichaId, acompanantes),
      replaceAnalizadores(fichaId, analizadores),
      replaceInstrumentos(fichaId, instrumentos),
    ])
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al guardar listas' }
  }
}
