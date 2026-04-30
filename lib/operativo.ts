import type { Ronda, ParticipanteRondaResumen } from '@/lib/rondas'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EstadoOperativo = {
  label: string
  color: 'amber' | 'blue' | 'emerald' | 'slate' | 'violet'
  accion: string
  accionHref: string
}

export type KpiMetrica = {
  label: string
  value: number
  href: string
  /** true when value > 0 and represents something missing / incomplete */
  negative: boolean
}

export type AttentionItem = {
  id: string
  message: string
  href: string
  count: number
  severity: 'warning' | 'info'
}

// ---------------------------------------------------------------------------
// derivarEstadoOperativo — cascading priority logic
// ---------------------------------------------------------------------------

export function derivarEstadoOperativo(
  ronda: Ronda,
  participantes: ParticipanteRondaResumen[]
): EstadoOperativo {
  const base = `/dashboard/rondas/${ronda.id}`

  if (ronda.estado === 'borrador') {
    return {
      label: 'Preparar ronda',
      color: 'amber',
      accion: 'Configurar',
      accionHref: base,
    }
  }

  if (ronda.estado === 'cerrada') {
    return {
      label: 'Cerrada',
      color: 'slate',
      accion: 'Ver',
      accionHref: base,
    }
  }

  // --- active round checks ---

  if (ronda.contaminantes.length === 0) {
    return {
      label: 'Falta config. PT',
      color: 'amber',
      accion: 'Configurar PT',
      accionHref: `${base}/configuracion-pt`,
    }
  }

  const sinReclamar = participantes.filter((p) => p.estado === 'pendiente').length
  if (sinReclamar > 0) {
    return {
      label: 'Invitar participantes',
      color: 'blue',
      accion: 'Ver participantes',
      accionHref: `${base}/participantes`,
    }
  }

  const fichasPendientes = participantes.filter((p) => p.ficha_estado !== 'enviado').length
  if (fichasPendientes > 0) {
    return {
      label: 'Esperando fichas',
      color: 'violet',
      accion: 'Ver participantes',
      accionHref: `${base}/participantes`,
    }
  }

  const hayEnviosPT = participantes.some((p) => p.envios_pt_count > 0)
  if (hayEnviosPT) {
    return {
      label: 'Lista para exportar',
      color: 'emerald',
      accion: 'Ver resultados',
      accionHref: `${base}/resultados`,
    }
  }

  return {
    label: 'Recibiendo resultados',
    color: 'blue',
    accion: 'Ver',
    accionHref: base,
  }
}

// ---------------------------------------------------------------------------
// buildAttentionItems — actionable alerts for the work tray
// ---------------------------------------------------------------------------

export function buildAttentionItems(
  rondas: Ronda[],
  participantesRondasActivas: ParticipanteRondaResumen[][]
): AttentionItem[] {
  const items: AttentionItem[] = []

  const rondasActivas = rondas.filter((r) => r.estado === 'activa')

  // Rounds without PT configuration
  const rondasSinConfigPT = rondasActivas.filter((r) => r.contaminantes.length === 0)
  if (rondasSinConfigPT.length > 0) {
    items.push({
      id: 'rondas-sin-config-pt',
      message: `${rondasSinConfigPT.length === 1 ? '1 ronda activa' : `${rondasSinConfigPT.length} rondas activas`} sin configuración PT`,
      href: '/dashboard?tab=rondas',
      count: rondasSinConfigPT.length,
      severity: 'warning',
    })
  }

  // Unclaimed invitation links
  const enlacesSinReclamar = participantesRondasActivas
    .flat()
    .filter((p) => p.estado === 'pendiente').length
  if (enlacesSinReclamar > 0) {
    items.push({
      id: 'cupos-sin-reclamar',
      message: `${enlacesSinReclamar} ${enlacesSinReclamar === 1 ? 'cupo sin reclamar' : 'cupos sin reclamar'} en rondas activas`,
      href: '/dashboard?tab=participantes',
      count: enlacesSinReclamar,
      severity: 'info',
    })
  }

  // Pending fichas
  const fichasPendientes = participantesRondasActivas
    .flat()
    .filter((p) => p.estado !== 'pendiente' && p.ficha_estado !== 'enviado').length
  if (fichasPendientes > 0) {
    items.push({
      id: 'fichas-pendientes',
      message: `${fichasPendientes} ${fichasPendientes === 1 ? 'ficha pendiente' : 'fichas pendientes'} de envío`,
      href: '/dashboard?tab=participantes',
      count: fichasPendientes,
      severity: 'warning',
    })
  }

  // Draft rounds
  const borrador = rondas.filter((r) => r.estado === 'borrador').length
  if (borrador > 0) {
    items.push({
      id: 'rondas-en-borrador',
      message: `${borrador} ${borrador === 1 ? 'ronda en borrador' : 'rondas en borrador'} — publicar cuando esté lista`,
      href: '/dashboard?tab=rondas',
      count: borrador,
      severity: 'info',
    })
  }

  return items
}
