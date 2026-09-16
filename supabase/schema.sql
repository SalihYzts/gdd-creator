-- GDD Creator — Supabase şeması
-- Supabase panelinde SQL Editor → bu dosyanın tamamını yapıştır → Run.
-- Tekrar çalıştırılabilir (idempotent).

-- ============ TABLOLAR ============

-- Kullanıcı profili (auth.users'ın herkese açık yüzü — davet ederken e-posta aramak için)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- GDD projeleri. Doküman gövdesi tek bir jsonb: uygulama modeliyle birebir.
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Adsız Proje',
  genre       text,
  data        jsonb not null default '{}'::jsonb,   -- sections, answers, extras
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Üyelikler: kim hangi projede, hangi rolde
create table if not exists public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','editor','viewer')),
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Davetler: henüz kaydolmamış olabilecek kişiler için e-posta bazlı
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('editor','viewer')),
  invited_by  uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists idx_members_user    on public.project_members(user_id);
create index if not exists idx_projects_owner  on public.projects(owner_id);
create index if not exists idx_invites_email   on public.invites(lower(email));

-- ============ YARDIMCI FONKSİYONLAR ============
-- RLS içinde alt sorgu kullanmak sonsuz özyinelemeye yol açar.
-- security definer fonksiyonlar RLS'i atlayarak bu döngüyü kırar.

create or replace function public.has_project_access(p_project uuid, p_user uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.projects   where id = p_project and owner_id = p_user
    union all
    select 1 from public.project_members where project_id = p_project and user_id = p_user
  );
$$;

create or replace function public.can_edit_project(p_project uuid, p_user uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.projects where id = p_project and owner_id = p_user
    union all
    select 1 from public.project_members
      where project_id = p_project and user_id = p_user and role in ('owner','editor')
  );
$$;

create or replace function public.is_project_owner(p_project uuid, p_user uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.projects where id = p_project and owner_id = p_user);
$$;

-- ============ RLS ============

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.invites         enable row level security;

-- profiles: herkes okur (davet ederken e-postadan kişi bulmak için), kendi satırını yazar
drop policy if exists "profil oku" on public.profiles;
create policy "profil oku" on public.profiles for select using (true);

drop policy if exists "kendi profilini yaz" on public.profiles;
create policy "kendi profilini yaz" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "kendi profilini guncelle" on public.profiles;
create policy "kendi profilini guncelle" on public.profiles for update using (auth.uid() = id);

-- projects
-- NOT: owner_id kontrolu politikada DOGRUDAN yapilir. Yalnizca stable fonksiyona
-- birakilirsa, INSERT ... RETURNING sirasinda ifade kendi yazdigi satiri goremez
-- (statement snapshot eski kalir) ve 42501 hatasi alinir. Ayrica bu kisa devre hizlidir.
drop policy if exists "erisimi olan okur" on public.projects;
create policy "erisimi olan okur" on public.projects for select
  using (owner_id = auth.uid() or public.has_project_access(id, auth.uid()));

drop policy if exists "kendi projesini olusturur" on public.projects;
create policy "kendi projesini olusturur" on public.projects for insert
  with check (auth.uid() = owner_id);

drop policy if exists "duzenleyen guncelller" on public.projects;
create policy "duzenleyen guncelller" on public.projects for update
  using (owner_id = auth.uid() or public.can_edit_project(id, auth.uid()))
  with check (owner_id = auth.uid() or public.can_edit_project(id, auth.uid()));

drop policy if exists "sahibi siler" on public.projects;
create policy "sahibi siler" on public.projects for delete
  using (auth.uid() = owner_id);

-- project_members
drop policy if exists "uyeleri gor" on public.project_members;
create policy "uyeleri gor" on public.project_members for select
  using (user_id = auth.uid() or public.has_project_access(project_id, auth.uid()));

drop policy if exists "sahibi uye ekler" on public.project_members;
create policy "sahibi uye ekler" on public.project_members for insert
  with check (public.is_project_owner(project_id, auth.uid()) or auth.uid() = user_id);

drop policy if exists "sahibi uye cikarir" on public.project_members;
create policy "sahibi uye cikarir" on public.project_members for delete
  using (public.is_project_owner(project_id, auth.uid()) or auth.uid() = user_id);

drop policy if exists "sahibi rol degistirir" on public.project_members;
create policy "sahibi rol degistirir" on public.project_members for update
  using (public.is_project_owner(project_id, auth.uid()));

-- invites: proje sahibi yönetir; davet edilen kendi e-postasına geleni görür
drop policy if exists "davetleri gor" on public.invites;
create policy "davetleri gor" on public.invites for select
  using (
    invited_by = auth.uid()
    or public.has_project_access(project_id, auth.uid())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "sahibi davet eder" on public.invites;
create policy "sahibi davet eder" on public.invites for insert
  with check (public.is_project_owner(project_id, auth.uid()) and auth.uid() = invited_by);

drop policy if exists "sahibi daveti siler" on public.invites;
create policy "sahibi daveti siler" on public.invites for delete
  using (
    public.is_project_owner(project_id, auth.uid())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "davet kabul" on public.invites;
create policy "davet kabul" on public.invites for update
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ============ TETİKLEYİCİLER ============

-- Yeni kullanıcı kaydolunca profil satırı aç
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Proje oluşturulunca sahibini üye yap
create or replace function public.handle_new_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- updated_at otomatik
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists on_project_updated on public.projects;
create trigger on_project_updated
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ============ DAVET KABULÜ ============
-- Kullanıcı giriş yaptığında çağrılır: e-postasına gelen bekleyen davetleri üyeliğe çevirir.
-- Donus tipi degistigi icin once dusurulmeli: create or replace, RETURNS TABLE
-- sutun adlarini degistirmeye izin vermez (42P13).
drop function if exists public.accept_my_invites();

-- NOT: cikis parametreleri out_ onekli. Duz 'project_id/role' kullanilirsa
-- CTE icindeki ayni adli sutunlarla cakisir: 42702 "column reference is ambiguous".
create or replace function public.accept_my_invites()
returns table (out_project_id uuid, out_role text)
language plpgsql security definer set search_path = public as $$
declare
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  my_id    uuid := auth.uid();
begin
  if my_id is null or my_email = '' then return; end if;

  return query
  with kabul as (
    update public.invites i
       set accepted_at = now()
     where lower(i.email) = my_email
       and i.accepted_at is null
    returning i.project_id as pid, i.role as rol
  ), uyelik as (
    insert into public.project_members (project_id, user_id, role)
    select k.pid, my_id, k.rol from kabul k
    on conflict (project_id, user_id) do update set role = excluded.role
    returning public.project_members.project_id as pid, public.project_members.role as rol
  )
  select u.pid, u.rol from uyelik u;
end; $$;

-- Proje sahibinin üyeleri e-postasıyla birlikte listelemesi
create or replace function public.project_members_detail(p_project uuid)
returns table (user_id uuid, email text, full_name text, avatar_url text, role text, pending boolean)
language sql security definer stable set search_path = public as $$
  select m.user_id, p.email, p.full_name, p.avatar_url, m.role, false
    from public.project_members m
    join public.profiles p on p.id = m.user_id
   where m.project_id = p_project
     and public.has_project_access(p_project, auth.uid())
  union all
  select null::uuid, i.email, null, null, i.role, true
    from public.invites i
   where i.project_id = p_project
     and i.accepted_at is null
     and public.has_project_access(p_project, auth.uid());
$$;

grant execute on function public.accept_my_invites()          to authenticated;
grant execute on function public.project_members_detail(uuid) to authenticated;
