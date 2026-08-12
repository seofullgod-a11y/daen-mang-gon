-- ═══════════════════════════════════════════════════════
-- CineMax Vertical — ระบบยอดวิว/ถูกใจจริง + คอมเมนต์
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- รันซ้ำได้ ไม่พังของเดิม (idempotent)
-- ═══════════════════════════════════════════════════════

-- ── 1) ตารางสถิติ: ยอดวิว + ยอดถูกใจ ต่อเรื่อง ──────────
create table if not exists public.stats (
  movie_id   text primary key,
  views      bigint not null default 0,
  likes      bigint not null default 0,
  updated_at timestamptz default now()
);

alter table public.stats enable row level security;

drop policy if exists "stats read" on public.stats;
create policy "stats read" on public.stats
  for select using (true);
-- ไม่มี policy insert/update ตรงๆ — แก้ค่าได้ผ่านฟังก์ชันด้านล่างเท่านั้น

-- เพิ่มยอดวิว (+1 เท่านั้น ปลอมค่าไม่ได้)
create or replace function public.inc_view(mid text)
returns void
language sql security definer set search_path = public as $$
  insert into stats (movie_id, views) values (mid, 1)
  on conflict (movie_id)
  do update set views = stats.views + 1, updated_at = now();
$$;

-- เพิ่ม/ลดยอดถูกใจ (บังคับทีละ ±1 และไม่ต่ำกว่า 0)
create or replace function public.inc_like(mid text, delta int)
returns void
language sql security definer set search_path = public as $$
  insert into stats (movie_id, likes)
  values (mid, case when delta >= 0 then 1 else 0 end)
  on conflict (movie_id)
  do update set
    likes = greatest(stats.likes + (case when delta >= 0 then 1 else -1 end), 0),
    updated_at = now();
$$;

grant execute on function public.inc_view(text) to anon, authenticated;
grant execute on function public.inc_like(text, int) to anon, authenticated;

-- ── 2) ตารางคอมเมนต์ ────────────────────────────────────
create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  movie_id   text not null,
  season     int,
  episode    int,
  nick       text not null check (char_length(nick) between 1 and 30),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists comments_movie_idx
  on public.comments (movie_id, created_at desc);

alter table public.comments enable row level security;

drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments
  for select using (true);

drop policy if exists "comments insert" on public.comments;
create policy "comments insert" on public.comments
  for insert with check (
    char_length(body) between 1 and 500
    and char_length(nick) between 1 and 30
  );
-- ไม่มี policy update/delete → แก้/ลบได้จากหลังบ้าน (service_role) เท่านั้น

-- ── 3) สิทธิ์การเข้าถึง (กันเคสโปรเจกต์ที่ default privileges ไม่ครบ) ──
grant select on public.stats to anon, authenticated;
grant select, insert on public.comments to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ── 4) บทความ (SEO) ─────────────────────────────────────
create table if not exists public.articles (
  slug       text primary key,
  title      text not null,
  cover      text,
  excerpt    text,
  body       text not null default '',
  tags       text,
  status     text not null default 'published',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.articles enable row level security;
drop policy if exists "articles read" on public.articles;
create policy "articles read" on public.articles
  for select using (status = 'published');
-- เขียน/แก้/ลบ ผ่านหลังบ้าน (service_role) เท่านั้น

-- ── 5) ตั้งค่าเว็บ + SEO (key/value) ────────────────────
create table if not exists public.settings (
  key   text primary key,
  value text
);
alter table public.settings enable row level security;
drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings
  for select using (true);
-- เขียนผ่านหลังบ้าน (service_role) เท่านั้น

grant select on public.articles to anon, authenticated;
grant select on public.settings to anon, authenticated;

-- แจ้ง PostgREST ให้รีโหลด schema ทันที (ไม่ต้องรอ)
notify pgrst, 'reload schema';
