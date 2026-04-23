-- ============================================================
-- CALAIRE-APP — Schema Supabase
-- Ejecutar en el SQL Editor del proyecto Supabase
-- ============================================================

-- Habilitar extensión uuid
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- rondas
-- ------------------------------------------------------------
create table if not exists rondas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  estado      text not null default 'borrador' check (estado in ('borrador','activa','cerrada')),
  created_at  timestamptz not null default now()
);

alter table rondas enable row level security;

-- Solo admin puede ver/modificar rondas (rol evaluado en app-layer)
create policy "admin_all_rondas" on rondas
  for all using (true) with check (true);

-- ------------------------------------------------------------
-- ronda_contaminantes
-- ------------------------------------------------------------
create table if not exists ronda_contaminantes (
  id           uuid primary key default gen_random_uuid(),
  ronda_id     uuid not null references rondas(id) on delete cascade,
  contaminante text not null check (contaminante in ('CO','SO2','O3','NO','NO2')),
  niveles      integer not null check (niveles >= 1),
  replicas     integer not null default 2 check (replicas in (2,3)),
  unique (ronda_id, contaminante)
);

alter table ronda_contaminantes enable row level security;

create policy "admin_all_contaminantes" on ronda_contaminantes
  for all using (true) with check (true);

-- ------------------------------------------------------------
-- ronda_participantes
-- ------------------------------------------------------------
create table if not exists ronda_participantes (
  id               uuid primary key default gen_random_uuid(),
  ronda_id         uuid not null references rondas(id) on delete cascade,
  workos_user_id   text not null,
  email            text not null,
  invitado_at      timestamptz not null default now(),
  participant_profile text not null default 'member' check (participant_profile in ('member', 'member_special')),
  participant_code text,
  replicate_code   integer,
  claimed_at       timestamptz,
  unique (ronda_id, workos_user_id)
);

alter table ronda_participantes enable row level security;

-- Participante puede ver sus propias asignaciones (validado por workos_user_id en app-layer)
create policy "participante_sus_asignaciones" on ronda_participantes
  for select using (true);

create policy "admin_gestiona_participantes" on ronda_participantes
  for all using (true) with check (true);

-- Indices y constraints para codigos PT
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

comment on column ronda_participantes.participant_profile is
  'Perfil del participante en la ronda: member (participante regular) o member_special (referencia).';

comment on column ronda_participantes.participant_code is
  'Codigo analitico exportable como participant_id dentro de una ronda PT.';

comment on column ronda_participantes.replicate_code is
  'Codigo entero exportable como replicate dentro de una ronda PT.';

comment on column ronda_participantes.claimed_at is
  'Marca de tiempo de reclamo del cupo PT por el usuario real.';

-- ------------------------------------------------------------
-- ronda_pt_items
-- ------------------------------------------------------------
create table if not exists ronda_pt_items (
  id          uuid primary key default gen_random_uuid(),
  ronda_id    uuid not null references rondas(id) on delete cascade,
  contaminante text not null check (contaminante in ('CO','SO2','O3','NO','NO2')),
  run_code    text not null,
  level_label text not null,
  sort_order  integer not null check (sort_order >= 1),
  created_at  timestamptz not null default now(),
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
-- ronda_pt_sample_groups
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
-- envios_pt
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

-- ------------------------------------------------------------
-- envios
-- ------------------------------------------------------------
create table if not exists envios (
  id              uuid primary key default gen_random_uuid(),
  ronda_id        uuid not null references rondas(id) on delete cascade,
  workos_user_id  text not null,
  contaminante    text not null check (contaminante in ('CO','SO2','O3','NO','NO2')),
  nivel           integer not null check (nivel >= 1),
  valores         float[] not null,
  promedio        float,
  incertidumbre   float,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (ronda_id, workos_user_id, contaminante, nivel)
);

alter table envios enable row level security;

create policy "participante_sus_envios" on envios
  for all using (true) with check (true);

-- Trigger: actualiza updated_at en cada modificación
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger envios_updated_at
  before update on envios
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Índices y constraints para ronda_participantes
-- ------------------------------------------------------------
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
  add column if not exists participant_profile text not null default 'member';

alter table ronda_participantes
  add constraint ronda_participantes_participant_profile_check
  check (participant_profile in ('member', 'member_special'));

alter table ronda_participantes
  add constraint ronda_participantes_replicate_code_check
  check (replicate_code is null or replicate_code >= 1);

comment on column ronda_participantes.participant_profile is
  'Perfil del participante en la ronda: member (participante regular) o member_special (referencia).';

comment on column ronda_participantes.participant_code is
  'Codigo analitico exportable como participant_id dentro de una ronda PT.';

comment on column ronda_participantes.replicate_code is
  'Codigo entero exportable como replicate dentro de una ronda PT.';

comment on column ronda_participantes.claimed_at is
  'Marca de tiempo de reclamo del cupo PT por el usuario real.';

-- ------------------------------------------------------------
-- ronda_pt_items
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
-- ronda_pt_sample_groups
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
-- envios_pt
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
