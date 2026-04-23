-- ============================================================
-- Migración: nuevos campos de captura PT en envios_pt
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table envios_pt
  add column if not exists d1          double precision,
  add column if not exists d2          double precision,
  add column if not exists d3          double precision,
  add column if not exists u_mean      double precision,
  add column if not exists u_expandida double precision;

comment on column envios_pt.d1 is 'Primer dato individual reportado por el participante.';
comment on column envios_pt.d2 is 'Segundo dato individual reportado por el participante.';
comment on column envios_pt.d3 is 'Tercer dato individual reportado por el participante.';
comment on column envios_pt.u_mean is 'Incertidumbre estimada del promedio reportada por el participante.';
comment on column envios_pt.u_expandida is 'Incertidumbre expandida reportada por el participante.';

-- Renombrar columnas u_mean → ux y u_expandida → ux_exp
alter table envios_pt rename column u_mean to ux;
alter table envios_pt rename column u_expandida to ux_exp;
