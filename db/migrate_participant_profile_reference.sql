-- Agrega perfil de participante para soportar referencia (member_special)

alter table if exists ronda_participantes
  add column if not exists participant_profile text not null default 'member';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ronda_participantes_participant_profile_check'
  ) then
    alter table ronda_participantes
      add constraint ronda_participantes_participant_profile_check
      check (participant_profile in ('member', 'member_special'));
  end if;
end $$;

create unique index if not exists ronda_participantes_ronda_reference_uidx
  on ronda_participantes (ronda_id)
  where participant_profile = 'member_special';

comment on column ronda_participantes.participant_profile is
  'Perfil del participante en la ronda: member (participante regular) o member_special (referencia).';
