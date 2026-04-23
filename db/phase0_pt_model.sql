-- ============================================================
-- CALAIRE-APP — Propuesta SQL Fase 0 para modelo PT
-- Estado: diseno aprobado, no aplicar en produccion sin migracion de Fase 1
-- Contrato externo de referencia: summary_n13.csv
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ampliacion de participantes por ronda
-- ------------------------------------------------------------
alter table ronda_participantes
  add column if not exists participant_profile text not null default 'member',
  add column if not exists participant_code text,
  add column if not exists replicate_code integer,
  add column if not exists claimed_at timestamptz;

alter table ronda_participantes
  add constraint ronda_participantes_participant_profile_check
  check (participant_profile in ('member', 'member_special'));

create unique index if not exists ronda_participantes_ronda_participant_code_uidx
  on ronda_participantes (ronda_id, participant_code)
  where participant_code is not null;

create unique index if not exists ronda_participantes_ronda_replicate_code_uidx
  on ronda_participantes (ronda_id, replicate_code)
  where replicate_code is not null;

create unique index if not exists ronda_participantes_ronda_reference_uidx
  on ronda_participantes (ronda_id)
  where participant_profile = 'member_special';

alter table ronda_participantes
  add constraint ronda_participantes_replicate_code_check
  check (replicate_code is null or replicate_code >= 1);

comment on column ronda_participantes.participant_code is
  'Codigo analitico exportable como participant_id dentro de una ronda PT.';

comment on column ronda_participantes.participant_profile is
  'Perfil del participante en la ronda: member (participante regular) o member_special (referencia).';

comment on column ronda_participantes.replicate_code is
  'Codigo entero exportable como replicate dentro de una ronda PT.';

comment on column ronda_participantes.claimed_at is
  'Marca de tiempo de reclamo del cupo PT por el usuario real.';

-- ------------------------------------------------------------
-- 2) Configuracion PT por corrida y nivel
-- ------------------------------------------------------------
create table if not exists ronda_pt_items (
  id           uuid primary key default gen_random_uuid(),
  ronda_id     uuid not null references rondas(id) on delete cascade,
  contaminante text not null check (contaminante in ('CO','SO2','O3','NO','NO2')),
  run_code     text not null,
  level_label  text not null,
  sort_order   integer not null check (sort_order >= 1),
  created_at   timestamptz not null default now(),
  unique (ronda_id, contaminante, run_code),
  unique (ronda_id, contaminante, level_label),
  unique (ronda_id, contaminante, sort_order),
  check (btrim(run_code) <> ''),
  check (btrim(level_label) <> '')
);

alter table ronda_pt_items enable row level security;

create policy "admin_all_ronda_pt_items" on ronda_pt_items
  for all using (true) with check (true);

comment on table ronda_pt_items is
  'Configuracion PT por contaminante y corrida. Cada fila define una pareja run + level.';

-- ------------------------------------------------------------
-- 3) Catalogo de grupos de muestra por ronda
-- ------------------------------------------------------------
create table if not exists ronda_pt_sample_groups (
  id           uuid primary key default gen_random_uuid(),
  ronda_id     uuid not null references rondas(id) on delete cascade,
  sample_group text not null,
  sort_order   integer not null check (sort_order >= 1),
  created_at   timestamptz not null default now(),
  unique (ronda_id, sample_group),
  unique (ronda_id, sort_order),
  check (btrim(sample_group) <> '')
);

alter table ronda_pt_sample_groups enable row level security;

create policy "admin_all_ronda_pt_sample_groups" on ronda_pt_sample_groups
  for all using (true) with check (true);

comment on table ronda_pt_sample_groups is
  'Grupos de muestra reutilizados por todas las corridas PT de una ronda.';

-- ------------------------------------------------------------
-- 4) Captura PT por participante
-- ------------------------------------------------------------
create table if not exists envios_pt (
  id                   uuid primary key default gen_random_uuid(),
  ronda_id             uuid not null references rondas(id) on delete cascade,
  ronda_participante_id uuid not null references ronda_participantes(id) on delete cascade,
  pt_item_id           uuid not null references ronda_pt_items(id) on delete cascade,
  sample_group_id      uuid not null references ronda_pt_sample_groups(id) on delete cascade,
  d1                   double precision,
  d2                   double precision,
  d3                   double precision,
  mean_value           double precision not null,
  sd_value             double precision not null check (sd_value >= 0),
  ux                   double precision,
  ux_exp               double precision,
  draft_saved_at       timestamptz not null default now(),
  final_submitted_at   timestamptz,
  updated_at           timestamptz not null default now(),
  unique (ronda_participante_id, pt_item_id, sample_group_id)
);

alter table envios_pt enable row level security;

create policy "participante_sus_envios_pt" on envios_pt
  for all using (true) with check (true);

create policy "admin_all_envios_pt" on envios_pt
  for all using (true) with check (true);

create trigger envios_pt_updated_at
  before update on envios_pt
  for each row execute function set_updated_at();

create index if not exists envios_pt_ronda_idx on envios_pt (ronda_id);
create index if not exists envios_pt_participante_idx on envios_pt (ronda_participante_id);
create index if not exists envios_pt_item_idx on envios_pt (pt_item_id);

comment on table envios_pt is
  'Resultados PT capturados por participante para una combinacion exacta de corrida y grupo de muestra.';

comment on column envios_pt.mean_value is
  'Valor principal exportado al CSV PT.';

comment on column envios_pt.sd_value is
  'Dispersion o incertidumbre exportada al CSV PT.';

comment on column envios_pt.final_submitted_at is
  'Marca de envio final del informe PT. Debe quedar alineada en todas las filas del participante.';
