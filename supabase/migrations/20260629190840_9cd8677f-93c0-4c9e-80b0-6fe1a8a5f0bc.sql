
create table if not exists public.atelier_rooms (
  board         text primary key,
  image_url     text,
  image_locked  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.atelier_notes (
  id          uuid primary key default gen_random_uuid(),
  board       text not null,
  team        text not null default '__tpl__',
  tpl         uuid,
  x           real not null default 0.06,
  y           real not null default 0.06,
  w           real not null default 0.13,
  h           real not null default 0.16,
  text        text not null default '',
  color       int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists atelier_notes_board_team_idx on public.atelier_notes(board, team);
create unique index if not exists atelier_notes_copy_uidx
  on public.atelier_notes(board, team, tpl) where tpl is not null;

alter table public.atelier_notes replica identity full;

grant select, insert, update, delete on public.atelier_rooms to anon, authenticated;
grant all on public.atelier_rooms to service_role;
grant select, insert, update, delete on public.atelier_notes to anon, authenticated;
grant all on public.atelier_notes to service_role;

alter table public.atelier_rooms enable row level security;
alter table public.atelier_notes enable row level security;

create policy "atelier_rooms anon access" on public.atelier_rooms for all to anon using (true) with check (true);
create policy "atelier_rooms auth access" on public.atelier_rooms for all to authenticated using (true) with check (true);
create policy "atelier_notes anon access" on public.atelier_notes for all to anon using (true) with check (true);
create policy "atelier_notes auth access" on public.atelier_notes for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.atelier_rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.atelier_notes;
exception when duplicate_object then null; end $$;

create policy "atelier images read"   on storage.objects for select to anon, authenticated using (bucket_id = 'atelier');
create policy "atelier images upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'atelier');
