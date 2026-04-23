# Session State: CALAIRE-EA

**Last Updated**: 2026-04-22

## Session Objective

Resolver autenticación multi-proveedor (UNAL/Google, USC/Microsoft) y crear panel exclusivo para laboratorio de referencia.

## Current State

- [x] Email OTP (Magic Auth) activado en WorkOS dashboard — funciona para cualquier correo independiente del proveedor
- [x] Eliminado chequeo `role-mismatch` de `claimParticipanteToken` en `lib/rondas.ts`
- [x] Tipo de retorno de `claimParticipanteToken` actualizado — removido `'role-mismatch'`
- [x] Eliminado redirect a `/denied?reason=reference-role` en `app/(protected)/ronda/[codigo]/page.tsx`
- [x] Creado `FormularioReferencia.tsx` — componente exclusivo para referencia (mismo funcionamiento, separado)
- [x] Página de ronda renderiza `FormularioReferencia` si `participant_profile === 'member_special'`, sino `FormularioRonda`
- [ ] **PENDIENTE**: Ejecutar migración `db/migrate_envios_pt_nuevos_campos.sql` en Supabase (de sesión anterior)
- [ ] **PENDIENTE**: Probar flujo completo referencia (reclama token → ve FormularioReferencia)

## Critical Technical Context

- **WorkOS sin organización**: `auth.role` siempre llega `null`. El rol `member_special` NUNCA viene de WorkOS. La fuente de verdad del perfil de referencia es `participant_profile` en la tabla `ronda_participantes` de Supabase.
- **`member_special`** sigue siendo el valor en BD — constraint `check (participant_profile in ('member', 'member_special'))`. No se renombró a `referencia` porque requería migración SQL. Quedó pendiente decidirlo.
- **Microsoft OAuth / USC**: La USC sí tiene Azure AD pero su tenant bloquea apps externas. Microsoft OAuth (demo credentials) no sirve para ellos. Solución: Email OTP.
- **`FormularioReferencia.tsx`** tiene badge violeta "Laboratorio de Referencia" en el encabezado como única diferencia visual por ahora.
- El índice único `ronda_participantes_ronda_reference_uidx` garantiza una sola referencia por ronda.

## Key Files

- `lib/rondas.ts` — `claimParticipanteToken` (sin chequeo de rol), `ParticipantePerfil`, `normalizeParticipantProfile`
- `app/(protected)/ronda/[codigo]/page.tsx` — bifurcación `FormularioReferencia` vs `FormularioRonda`
- `app/(protected)/ronda/[codigo]/FormularioReferencia.tsx` — panel exclusivo referencia (NUEVO)
- `app/(protected)/ronda/[codigo]/FormularioRonda.tsx` — panel participante regular
- `db/migrate_envios_pt_nuevos_campos.sql` — migración pendiente de ejecutar en Supabase

## Next Steps

1. Probar flujo referencia: entrar con OTP → reclamar token de referencia → confirmar que aparece badge violeta
2. Decidir si renombrar `member_special` → `referencia` en BD (requiere migración + actualizar constraint y código)
3. Ejecutar migración `db/migrate_envios_pt_nuevos_campos.sql` en Supabase SQL Editor
