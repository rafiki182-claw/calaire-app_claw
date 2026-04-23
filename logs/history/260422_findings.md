# Technical Finding / Milestone

**Context**: Autenticación multi-proveedor + Panel Laboratorio de Referencia

## The Discovery

### 1. Por qué Microsoft OAuth no funcionaba para USC

La USC (Universidad Santiago de Cali) tiene Azure AD pero su tenant de Microsoft bloquea el acceso de apps externas. WorkOS "demo credentials" usa su propia app de Azure registrada — que USC no ha autorizado. El error "We couldn't find a Microsoft account" en la pantalla de Microsoft es síntoma de esto. **Solución**: Email OTP (Magic Auth) en WorkOS funciona para cualquier correo sin depender del proveedor.

### 2. Por qué el chequeo de `member_special` estaba roto

El chequeo `isMemberSpecialRole(role)` en `claimParticipanteToken` comparaba contra `auth.role` de WorkOS. Sin embargo, WorkOS solo asigna roles dentro de organizaciones. Esta app no tiene organización configurada en WorkOS, por lo que `auth.role` siempre llega `null`. El chequeo nunca podía pasar — nadie hubiera podido reclamar un slot de referencia. La fuente de verdad real es `participant_profile` en la BD.

### 3. Separación FormularioRonda / FormularioReferencia

Se creó `FormularioReferencia.tsx` como componente separado (mismo código, distinto archivo) para permitir divergencia futura. La bifurcación ocurre en `page.tsx` según `participantePT?.participant_profile === 'member_special'`.

## Key Files Affected

- `lib/rondas.ts` — removido `MEMBER_SPECIAL_ROLES`, `isMemberSpecialRole`, y chequeo `role-mismatch`
- `app/(protected)/ronda/[codigo]/page.tsx` — bifurcación de componente + removido redirect `reference-role`
- `app/(protected)/ronda/[codigo]/FormularioReferencia.tsx` — componente nuevo
