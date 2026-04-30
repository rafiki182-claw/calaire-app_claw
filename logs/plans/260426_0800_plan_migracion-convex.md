# Plan: Migración Supabase → Convex

**Created**: 2026-04-26 08:00
**Updated**: 2026-04-26 09:33
**Status**: in_progress
**Slug**: migracion-convex

## Objetivo

Reemplazar Supabase (usado únicamente como Postgres) por Convex como capa de datos. Auth (WorkOS) no se toca. Sin storage, realtime ni edge functions involucrados.

## Contexto clave

- 8 tablas relacionales: `rondas`, `ronda_contaminantes`, `ronda_participantes`, `ronda_pt_items`, `ronda_pt_sample_groups`, `envios_pt`, `envios`, `fichas_registro` (+ 3 sublistas)
- ~40 funciones en `lib/rondas.ts` (1270 líneas) y `lib/fichas.ts` (269 líneas)
- Server Actions en `app/` llaman esas funciones — quedan casi igual
- Auth: WorkOS (`lib/auth.ts`, `@workos-inc/authkit-nextjs`) — sin cambios
- RLS en Supabase era `always true` — no hay equivalente necesario

## Diferencias clave a resolver

| Supabase | Convex |
|---|---|
| UUIDs como PKs | `Id<"tabla">` tipado |
| JOINs SQL | Múltiples queries encadenadas |
| `upsert` con `onConflict` | Busca por índice → patch/insert |
| Triggers `updated_at` | Setear manualmente en mutación |
| UNIQUE constraints SQL | Índices Convex + validación en mutación |
| FK ON DELETE CASCADE | Cascada manual en mutaciones |

## Fases

### Fase 0: Rama nueva ✅
| # | Acción | Notas |
|---|--------|-------|
| 0.1 | `git checkout -b feat/convex-migration` | Rama de trabajo |

### Fase 1: Setup Convex ✅
| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 1.1 | `package.json` | Instalar `convex` | `npm install convex` |
| 1.2 | `convex/` | Inicializar proyecto | `npx convex dev --once` |
| 1.3 | `.env.local` | Agregar `NEXT_PUBLIC_CONVEX_URL` | Desde dashboard Convex |
| 1.4 | `.env.example` | Documentar nuevas vars | Reemplazar SUPABASE_* |
| 1.5 | `app/layout.tsx` | Agregar `ConvexClientProvider` | Wrapper en root layout |

### Fase 2: Schema Convex (8 tablas)
| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 2.1 | `convex/schema.ts` | Definir todas las tablas | Mapear tipos SQL → Convex validators |
| 2.2 | — | Índices por campos de búsqueda frecuente | `by_ronda_id`, `by_participante`, etc. |

### Fase 3: Funciones Convex
| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 3.1 | `convex/rondas.ts` | Queries y mutations de rondas/participantes/envíos | ~30 funciones |
| 3.2 | `convex/fichas.ts` | Queries y mutations de fichas y sublistas | ~10 funciones |
| 3.3 | `convex/pt.ts` | Lógica PT: upsert, submit, resultados | ~8 funciones |

### Fase 4: Actualizar capa de acceso
| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 4.1 | `lib/supabase.ts` | Eliminar | Reemplazar por cliente Convex |
| 4.2 | `lib/rondas.ts` | Reescribir para llamar funciones Convex | Mantener mismas firmas públicas |
| 4.3 | `lib/fichas.ts` | Reescribir para llamar funciones Convex | Mantener mismas firmas públicas |
| 4.4 | `app/**/actions.ts` | Ajustar imports si cambian firmas | 7 archivos de Server Actions |

### Fase 5: Migración de datos
| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 5.1 | `scripts/export-supabase.ts` | Exportar datos a JSON | Correr contra Supabase prod |
| 5.2 | `convex/seed.ts` | Importar JSON a Convex | Correr en dev/prod |

### Fase 6: Limpieza
| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 6.1 | `package.json` | Eliminar `@supabase/supabase-js` | |
| 6.2 | `.env.local` / `.env.example` | Eliminar variables `SUPABASE_*` | |
| 6.3 | `db/*.sql` | Archivar o eliminar | Reemplazados por schema Convex |
| 6.4 | `lib/supabase.ts` | Eliminar | |

## Log de Ejecución

- [x] Fase 0 iniciada — rama `feat/convex-migration` creada
- [x] Fase 1 iniciada — Convex instalado, ConvexClientProvider configurado
- [x] Fase 2 completada — convex/schema.ts con 11 tablas y 24 índices
- [x] Fase 3 completada — convex/rondas.ts (~30 funciones), convex/fichas.ts (~11 funciones), convex/pt.ts (~17 funciones). TypeScript limpio.
- [ ] Fase 4 pendiente
- [ ] Fase 5 pendiente
- [ ] Fase 6 pendiente
