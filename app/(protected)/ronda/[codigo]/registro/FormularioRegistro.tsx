'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { FichaCompleta, AcompananteInput, AnalizadorInput, InstrumentoInput } from '@/lib/fichas'
import type { EstadoRonda } from '@/lib/rondas'
import {
  guardarCampoFichaAction,
  guardarListasAction,
  enviarFichaFinalAction,
  cerrarSesionParticipanteAction,
} from './actions'

const ANALITOS = ['CO', 'SO2', 'O3', 'NO', 'NO2'] as const

type Props = {
  codigoRonda: string
  rondaCodigo: string
  rondaEstado: EstadoRonda
  participanteCodigo: string | null
  ficha: FichaCompleta
  soloLectura: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function FieldSaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') return <span className="text-xs text-[var(--foreground-muted)]">Guardando…</span>
  if (state === 'saved') return <span className="text-xs text-emerald-600">✓ Guardado</span>
  if (state === 'error') return <span className="text-xs text-rose-600">Error al guardar</span>
  return null
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-[var(--border)] pb-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{description}</p>}
    </div>
  )
}

export default function FormularioRegistro({ codigoRonda, rondaCodigo, rondaEstado, participanteCodigo, ficha: fichaInicial, soloLectura }: Props) {
  const [fieldStates, setFieldStates] = useState<Record<string, SaveState>>({})

  // Dynamic lists
  const [acompanantes, setAcompanantes] = useState<AcompananteInput[]>(
    fichaInicial.acompanantes.map(({ sort_order, nombre_completo, documento_identidad, rol }) => ({
      sort_order, nombre_completo, documento_identidad, rol,
    }))
  )
  const [analizadores, setAnalizadores] = useState<AnalizadorInput[]>(
    fichaInicial.analizadores.map(({ sort_order, analito, fabricante, modelo, numero_serie, metodo_epa, fecha_ultima_calibracion, tipo_verificacion, incertidumbre_declarada, unidad_salida }) => ({
      sort_order, analito, fabricante, modelo, numero_serie, metodo_epa, fecha_ultima_calibracion, tipo_verificacion, incertidumbre_declarada, unidad_salida,
    }))
  )
  const [instrumentos, setInstrumentos] = useState<InstrumentoInput[]>(
    fichaInicial.instrumentos.map(({ sort_order, equipo, marca_modelo, numero_serie, cantidad }) => ({
      sort_order, equipo, marca_modelo, numero_serie, cantidad,
    }))
  )

  const [listSaving, setListSaving] = useState(false)
  const [listSaved, setListSaved] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrores, setSubmitErrores] = useState<string[]>([])
  const [enviado, setEnviado] = useState(fichaInicial.estado === 'enviado')

  const disabled = soloLectura || enviado
  const puedeCargarDatos = rondaEstado === 'activa' && enviado

  const handleBlur = useCallback(
    async (field: string, value: string) => {
      if (disabled) return
      setFieldStates((prev) => ({ ...prev, [field]: 'saving' }))
      const result = await guardarCampoFichaAction(codigoRonda, field, value || null)
      setFieldStates((prev) => ({ ...prev, [field]: result.ok ? 'saved' : 'error' }))
    },
    [codigoRonda, disabled]
  )

  const handleCheckboxChange = useCallback(
    async (field: string, checked: boolean) => {
      if (disabled) return
      setFieldStates((prev) => ({ ...prev, [field]: 'saving' }))
      const result = await guardarCampoFichaAction(codigoRonda, field, checked)
      setFieldStates((prev) => ({ ...prev, [field]: result.ok ? 'saved' : 'error' }))
    },
    [codigoRonda, disabled]
  )

  const handleGuardarListas = async () => {
    setListSaving(true)
    setListSaved(false)
    setListError(null)
    const result = await guardarListasAction(codigoRonda, acompanantes, analizadores, instrumentos)
    setListSaving(false)
    if (result.ok) setListSaved(true)
    else setListError(result.error ?? 'Error al guardar listas')
  }

  const handleEnviar = async () => {
    setSubmitting(true)
    setSubmitError(null)
    setSubmitErrores([])
    const result = await enviarFichaFinalAction(codigoRonda)
    setSubmitting(false)
    if (result.ok) {
      setEnviado(true)
    } else if (result.errores) {
      setSubmitErrores(result.errores)
    } else {
      setSubmitError(result.error ?? 'Error al enviar')
    }
  }

  const inputClass = `rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-0 w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`
  const labelClass = 'grid gap-1 text-sm text-[var(--foreground-muted)]'

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">

        {/* Encabezado */}
        <header className="header-bar px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                F-PSEA-05A v0.1
              </p>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">
                Hoja de Registro del Participante
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--foreground-muted)]">
                <span>Ronda: <strong className="text-[var(--foreground)]">{rondaCodigo}</strong></span>
                {participanteCodigo && (
                  <span>Participante: <strong className="text-[var(--foreground)]">{participanteCodigo}</strong></span>
                )}
              </div>
              {enviado && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800">
                  Ficha enviada ✓
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link href="/dashboard" className="btn-outline">
                Volver
              </Link>
              {puedeCargarDatos ? (
                <Link href={`/ronda/${codigoRonda}`} className="btn-primary">
                  Cargar datos →
                </Link>
              ) : (
                <span
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]"
                  title={enviado ? 'La carga se habilita cuando la ronda esté activa.' : 'Envíe la ficha para habilitar la carga de datos.'}
                >
                  Cargar datos
                </span>
              )}
              <form action={cerrarSesionParticipanteAction}>
                <button type="submit" className="btn-outline">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Sección 2: Datos del participante */}
        <section className="card grid gap-5 p-6">
          <SectionHeader
            title="Datos del participante"
            description="Información del laboratorio responsable de los ensayos."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ['nombre_laboratorio', 'Nombre del laboratorio'],
              ['nombre_responsable', 'Nombre del responsable'],
              ['cargo', 'Cargo'],
              ['ciudad', 'Ciudad'],
              ['departamento', 'Departamento'],
              ['telefono', 'Teléfono'],
            ] as const).map(([field, label]) => (
              <label key={field} className={labelClass}>
                <span className="flex items-center justify-between">
                  {label}
                  <FieldSaveIndicator state={fieldStates[field] ?? 'idle'} />
                </span>
                <input
                  type="text"
                  className={inputClass}
                  defaultValue={fichaInicial[field] ?? ''}
                  disabled={disabled}
                  onBlur={(e) => handleBlur(field, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        {/* Sección 3: Personal acompañante */}
        <section className="card grid gap-5 p-6">
          <SectionHeader
            title="Personal acompañante"
            description="Personas adicionales que participarán en la ronda de ensayo."
          />
          {acompanantes.length === 0 && (
            <p className="text-sm text-[var(--foreground-muted)]">Sin acompañantes registrados.</p>
          )}
          <div className="grid gap-3">
            {acompanantes.map((item, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-3">
                <label className={labelClass}>
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={item.nombre_completo}
                    disabled={disabled}
                    onChange={(e) => {
                      setAcompanantes((prev) => prev.map((a, i) => i === idx ? { ...a, nombre_completo: e.target.value } : a))
                      setListSaved(false)
                    }}
                  />
                </label>
                <label className={labelClass}>
                  <span>Documento de identidad</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={item.documento_identidad}
                    disabled={disabled}
                    onChange={(e) => {
                      setAcompanantes((prev) => prev.map((a, i) => i === idx ? { ...a, documento_identidad: e.target.value } : a))
                      setListSaved(false)
                    }}
                  />
                </label>
                <label className={labelClass}>
                  <span className="flex items-center justify-between">
                    Rol
                    {!disabled && (
                      <button
                        type="button"
                        className="text-xs text-rose-500 hover:text-rose-700"
                        onClick={() => {
                          setAcompanantes((prev) => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, sort_order: i + 1 })))
                          setListSaved(false)
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </span>
                  <input
                    type="text"
                    className={inputClass}
                    value={item.rol}
                    disabled={disabled}
                    onChange={(e) => {
                      setAcompanantes((prev) => prev.map((a, i) => i === idx ? { ...a, rol: e.target.value } : a))
                      setListSaved(false)
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
          {!disabled && (
            <button
              type="button"
              className="btn-outline self-start"
              onClick={() => {
                setAcompanantes((prev) => [...prev, { sort_order: prev.length + 1, nombre_completo: '', documento_identidad: '', rol: '' }])
                setListSaved(false)
              }}
            >
              + Agregar acompañante
            </button>
          )}
        </section>

        {/* Sección 4: Analizadores declarados */}
        <section className="card grid gap-5 p-6">
          <SectionHeader
            title="Analizadores declarados"
            description="Equipos analizadores que se utilizarán durante la ronda."
          />
          {analizadores.length === 0 && (
            <p className="text-sm text-[var(--foreground-muted)]">Sin analizadores registrados.</p>
          )}
          <div className="grid gap-4">
            {analizadores.map((item, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                    Analizador {idx + 1}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      className="text-xs text-rose-500 hover:text-rose-700"
                      onClick={() => {
                        setAnalizadores((prev) => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, sort_order: i + 1 })))
                        setListSaved(false)
                      }}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className={labelClass}>
                    <span>Analito</span>
                    <select
                      className={inputClass}
                      value={item.analito}
                      disabled={disabled}
                      onChange={(e) => {
                        setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, analito: e.target.value } : a))
                        setListSaved(false)
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {ANALITOS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Fabricante</span>
                    <input type="text" className={inputClass} value={item.fabricante} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, fabricante: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Modelo</span>
                    <input type="text" className={inputClass} value={item.modelo} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, modelo: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Número de serie</span>
                    <input type="text" className={inputClass} value={item.numero_serie} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, numero_serie: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Método EPA</span>
                    <input type="text" className={inputClass} value={item.metodo_epa} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, metodo_epa: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Fecha última calibración</span>
                    <input type="date" className={inputClass} value={item.fecha_ultima_calibracion ?? ''} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, fecha_ultima_calibracion: e.target.value || null } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Tipo de verificación</span>
                    <input type="text" className={inputClass} value={item.tipo_verificacion} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, tipo_verificacion: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Incertidumbre declarada</span>
                    <input type="text" className={inputClass} value={item.incertidumbre_declarada} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, incertidumbre_declarada: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                  <label className={labelClass}>
                    <span>Unidad de salida</span>
                    <input type="text" className={inputClass} value={item.unidad_salida} disabled={disabled}
                      onChange={(e) => { setAnalizadores((prev) => prev.map((a, i) => i === idx ? { ...a, unidad_salida: e.target.value } : a)); setListSaved(false) }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          {!disabled && (
            <button
              type="button"
              className="btn-outline self-start"
              onClick={() => {
                setAnalizadores((prev) => [
                  ...prev,
                  { sort_order: prev.length + 1, analito: '', fabricante: '', modelo: '', numero_serie: '', metodo_epa: '', fecha_ultima_calibracion: null, tipo_verificacion: '', incertidumbre_declarada: '', unidad_salida: '' },
                ])
                setListSaved(false)
              }}
            >
              + Agregar analizador
            </button>
          )}
        </section>

        {/* Sección 5: Instrumentos auxiliares */}
        <section className="card grid gap-5 p-6">
          <SectionHeader
            title="Instrumentos auxiliares"
            description="Equipos de apoyo utilizados en la ronda."
          />
          {instrumentos.length === 0 && (
            <p className="text-sm text-[var(--foreground-muted)]">Sin instrumentos registrados.</p>
          )}
          <div className="grid gap-3">
            {instrumentos.map((item, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-4">
                <label className={labelClass}>
                  <span>Equipo</span>
                  <input type="text" className={inputClass} value={item.equipo} disabled={disabled}
                    onChange={(e) => { setInstrumentos((prev) => prev.map((a, i) => i === idx ? { ...a, equipo: e.target.value } : a)); setListSaved(false) }} />
                </label>
                <label className={labelClass}>
                  <span>Marca / Modelo</span>
                  <input type="text" className={inputClass} value={item.marca_modelo} disabled={disabled}
                    onChange={(e) => { setInstrumentos((prev) => prev.map((a, i) => i === idx ? { ...a, marca_modelo: e.target.value } : a)); setListSaved(false) }} />
                </label>
                <label className={labelClass}>
                  <span>Número de serie</span>
                  <input type="text" className={inputClass} value={item.numero_serie} disabled={disabled}
                    onChange={(e) => { setInstrumentos((prev) => prev.map((a, i) => i === idx ? { ...a, numero_serie: e.target.value } : a)); setListSaved(false) }} />
                </label>
                <label className={labelClass}>
                  <span className="flex items-center justify-between">
                    Cantidad
                    {!disabled && (
                      <button type="button" className="text-xs text-rose-500 hover:text-rose-700"
                        onClick={() => { setInstrumentos((prev) => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, sort_order: i + 1 }))); setListSaved(false) }}>
                        Quitar
                      </button>
                    )}
                  </span>
                  <input type="number" min="1" className={inputClass} value={item.cantidad} disabled={disabled}
                    onChange={(e) => { setInstrumentos((prev) => prev.map((a, i) => i === idx ? { ...a, cantidad: Number(e.target.value) || 1 } : a)); setListSaved(false) }} />
                </label>
              </div>
            ))}
          </div>
          {!disabled && (
            <button
              type="button"
              className="btn-outline self-start"
              onClick={() => {
                setInstrumentos((prev) => [...prev, { sort_order: prev.length + 1, equipo: '', marca_modelo: '', numero_serie: '', cantidad: 1 }])
                setListSaved(false)
              }}
            >
              + Agregar instrumento
            </button>
          )}
        </section>

        {/* Sección 6: Logística */}
        <section className="card grid gap-5 p-6">
          <SectionHeader title="Logística" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              <span className="flex items-center justify-between">
                Medio de transporte
                <FieldSaveIndicator state={fieldStates['transporte'] ?? 'idle'} />
              </span>
              <input type="text" className={inputClass} defaultValue={fichaInicial.transporte ?? ''}
                disabled={disabled}
                onBlur={(e) => handleBlur('transporte', e.target.value)} />
            </label>
            <label className={labelClass}>
              <span className="flex items-center justify-between">
                Hora estimada de llegada
                <FieldSaveIndicator state={fieldStates['hora_llegada'] ?? 'idle'} />
              </span>
              <input type="time" className={inputClass} defaultValue={fichaInicial.hora_llegada ?? ''}
                disabled={disabled}
                onBlur={(e) => handleBlur('hora_llegada', e.target.value)} />
            </label>
          </div>
          <label className="inline-flex items-center gap-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border)]"
              defaultChecked={fichaInicial.estacionamiento}
              disabled={disabled}
              onChange={(e) => handleCheckboxChange('estacionamiento', e.target.checked)}
            />
            <span>Requiere estacionamiento</span>
            <FieldSaveIndicator state={fieldStates['estacionamiento'] ?? 'idle'} />
          </label>
          <label className={labelClass}>
            <span className="flex items-center justify-between">
              Observaciones de logística
              <FieldSaveIndicator state={fieldStates['observaciones'] ?? 'idle'} />
            </span>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              defaultValue={fichaInicial.observaciones ?? ''}
              disabled={disabled}
              onBlur={(e) => handleBlur('observaciones', e.target.value)}
            />
          </label>
        </section>

        {/* Sección 7: Declaraciones */}
        <section className="card grid gap-5 p-6">
          <SectionHeader
            title="Declaraciones"
            description="El participante declara y acepta las siguientes condiciones."
          />
          <div className="grid gap-4">
            {([
              ['dec_datos_correctos', 'Los datos consignados en esta ficha son correctos y verificables.'],
              ['dec_acepta_condiciones', 'Acepto las condiciones de participación en la ronda de ensayo de aptitud.'],
              ['dec_compromisos', 'Me comprometo a seguir los procedimientos establecidos durante el ensayo.'],
              ['dec_firma_autorizada', 'La firma registrada está autorizada por la dirección del laboratorio.'],
            ] as const).map(([field, texto]) => (
              <label key={field} className="flex items-start gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                  defaultChecked={fichaInicial[field]}
                  disabled={disabled}
                  onChange={(e) => handleCheckboxChange(field, e.target.checked)}
                />
                <span className="flex-1">{texto}</span>
                <FieldSaveIndicator state={fieldStates[field] ?? 'idle'} />
              </label>
            ))}
          </div>
          <label className={labelClass}>
            <span className="flex items-center justify-between">
              Nombre para la firma
              <FieldSaveIndicator state={fieldStates['nombre_firma'] ?? 'idle'} />
            </span>
            <input
              type="text"
              className={inputClass}
              defaultValue={fichaInicial.nombre_firma ?? ''}
              disabled={disabled}
              onBlur={(e) => handleBlur('nombre_firma', e.target.value)}
            />
          </label>
        </section>

        {/* Sección 8: Acciones */}
        {!soloLectura && (
          <section className="card grid gap-5 p-6">
            <SectionHeader title="Acciones" />

            {/* Guardar listas */}
            {!enviado && (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className="btn-outline"
                  disabled={listSaving}
                  onClick={handleGuardarListas}
                >
                  {listSaving ? 'Guardando…' : 'Guardar listas'}
                </button>
                {listSaved && <span className="text-sm text-emerald-600">✓ Listas guardadas</span>}
                {listError && <span className="text-sm text-rose-600">{listError}</span>}
              </div>
            )}

            {/* Submit */}
            {enviado ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Ficha enviada correctamente. Todos los campos están bloqueados.
              </div>
            ) : (
              <div className="grid gap-4">
                {submitErrores.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <p className="font-semibold mb-2">Complete los siguientes campos obligatorios:</p>
                    <ul className="list-inside list-disc space-y-1">
                      {submitErrores.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
                {submitError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submitting}
                    onClick={handleEnviar}
                  >
                    {submitting ? 'Enviando…' : 'Enviar ficha →'}
                  </button>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    El envío bloqueará el formulario de forma permanente.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
