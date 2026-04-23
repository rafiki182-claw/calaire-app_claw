# Plan: Rediseño UI CALAIRE-EA — "Institutional Gold"

**Created**: 2026-04-21 16:36
**Updated**: 2026-04-21 16:36
**Status**: approved
**Slug**: rediseno-ui-institutional-gold

## Objetivo

Llevar el lenguaje visual de pt_app (aplicativo R/Shiny hermano) a calaire-app (Next.js). El acento dorado `#FDB913` se convierte en la identidad de marca única que unifica ambas herramientas del ecosistema CALAIRE-EA.

**Referencia visual**: https://w421.shinyapps.io/pt_app/
**Fuente de diseño**: `/home/w182/w421/pt_app/www/appR.css` (1457 líneas)

## Dirección estética: "Institutional Gold"

- **Acento único**: `#FDB913` — headers, focus rings, botones CTA, barras de progreso, bordes activos
- **Tipografía**: DM Sans (body/UI) + JetBrains Mono (datos numéricos)
- **Fondo**: `#F4F5F7` (gris cálido, no azul-frío)
- **Cards**: `12px` border-radius, sombra `sm` → `md` en hover, borde izq. dorado en KPI
- **Headers**: borde inferior `4px solid #FDB913` + fondo blanco
- **Botones primarios**: gradiente `#FDB913 → #E5A610`, texto `#111827`
- **Focus rings**: `rgba(253,185,19,0.4)` en lugar de azul

## Paleta de colores

| Variable | Valor | Uso |
|----------|-------|-----|
| `--pt-primary` | `#FDB913` | Acento principal |
| `--pt-primary-dark` | `#E5A610` | Hover de primario |
| `--pt-primary-light` | `#FFD54F` | Tono claro |
| `--pt-primary-subtle` | `#FFF8E6` | Fondos sutiles |
| `--background` | `#F4F5F7` | Fondo de página |
| `--surface` | `#FFFFFF` | Superficies/cards |
| `--surface-muted` | `#F5F6F7` | Fondos muted |
| `--border` | `#D1D5DB` | Bordes por defecto |
| `--foreground` | `#111827` | Texto principal |
| `--foreground-muted` | `#6B7280` | Texto secundario |
| `--success` | `#00B050` | Estado positivo |
| `--warning` | `#ECC94B` | Estado advertencia |
| `--danger` | `#E53E3E` | Estado error |

## Fases

### Fase 1: Tipografía y sistema base

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 1.1 | `app/layout.tsx` | Modificar | Cambiar Geist → DM_Sans + JetBrains_Mono via next/font/google |
| 1.2 | `app/globals.css` | Reescribir | CSS vars completas, utilidades `.card`, `.btn-primary`, `.btn-outline`, `.header-bar`, `.card-accent`, `.numeric`, scrollbar dorado, focus ring dorado, selección dorada |

### Fase 2: Login y layout global

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 2.1 | `app/login/page.tsx` | Modificar | Card con `border-l-4 var(--pt-primary)`, botón `.btn-primary`, fondo `var(--background)` |

### Fase 3: Dashboard admin

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 3.1 | `app/(protected)/dashboard/page.tsx` | Modificar | Header con `border-b-4`, fondo sin gradiente azul, botones dorados, cards con acento, badges de estado mejorados |

### Fase 4: Páginas de ronda (admin)

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 4.1 | `app/(protected)/dashboard/rondas/[id]/participantes/page.tsx` | Modificar | Header con borde dorado, tabla con header dorado, botones dorados |
| 4.2 | `app/(protected)/dashboard/rondas/[id]/resultados/page.tsx` | Modificar | KPI cards con `.card-accent`, tabla con header dorado, datos numéricos con `.numeric`, btn exportar dorado |

### Fase 5: Formulario participante

| # | Archivo | Acción | Notas |
|---|---------|--------|-------|
| 5.1 | `app/(protected)/ronda/[codigo]/FormularioRonda.tsx` | Modificar | Progress bar dorada, inputs con focus dorado, btn submit dorado, KPI cards con `.card-accent`, screen éxito con check dorado |

### Fase 6: Verificación

| # | Acción |
|---|--------|
| 6.1 | `npm run dev` — arrancar servidor |
| 6.2 | Revisar `/login`, `/dashboard`, `/participantes`, `/resultados`, `/ronda/[codigo]` |
| 6.3 | Verificar focus rings dorados en inputs |
| 6.4 | Verificar JetBrains Mono en celdas numéricas |
| 6.5 | `npm run build` — sin errores de tipos TypeScript |

## Log de Ejecución

- [x] Fase 1 — Sistema base (globals.css + layout.tsx)
- [x] Fase 2 — Login
- [x] Fase 3 — Dashboard
- [x] Fase 4 — Páginas de ronda
- [x] Fase 5 — Formulario participante
- [ ] Fase 6 — Verificación visual completa
