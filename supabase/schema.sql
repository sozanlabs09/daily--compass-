
-- ============================================
-- Daily Compass
-- Database Schema and Row Level Security
-- ============================================

create extension if not exists pgcrypto;

-- --------------------------------------------
-- 1. Updated-at function
-- --------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------
-- 2. Profiles
-- --------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  plan text not null default 'free'
    check (plan in ('free', 'premium')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------
-- 3. User settings
-- --------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light'
    check (theme in ('light', 'dark', 'system')),
  language text not null default 'en'
    check (language in ('en', 'ar')),
  week_starts_on integer not null default 6
    check (week_starts_on in (0, 1, 6)),
  time_format text not null default '12h'
    check (time_format in ('12h', '24h')),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------
-- 4. Subjects
-- --------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null
    check (char_length(trim(name)) between 1 and 100),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- --------------------------------------------
-- 5. Tasks
-- --------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  subject_id uuid,
  title text not null
    check (char_length(trim(title)) between 1 and 500),
  description text not null default '',
  due_date date,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'completed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_subject_owner_fk
    foreign key (subject_id, user_id)
    references public.subjects(id, user_id)
);

-- Clear a task's subject reference before deleting that subject.
create or replace function public.clear_subject_from_tasks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tasks
  set subject_id = null
  where subject_id = old.id
    and user_id = old.user_id;

  return old;
end;
$$;

revoke all on function public.clear_subject_from_tasks() from public;
revoke all on function public.clear_subject_from_tasks() from anon;
revoke all on function public.clear_subject_from_tasks() from authenticated;

create trigger clear_subject_before_delete
before delete on public.subjects
for each row
execute function public.clear_subject_from_tasks();

-- --------------------------------------------
-- 6. Books
-- --------------------------------------------

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  title text not null
    check (char_length(trim(title)) between 1 and 200),
  author text,
  status text not null default 'to_read'
    check (status in ('to_read', 'reading', 'completed', 'on_hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------
-- 7. Habits
-- --------------------------------------------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null
    check (char_length(trim(name)) between 1 and 120),
  frequency text not null default 'daily'
    check (frequency in ('daily', 'weekly', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- --------------------------------------------
-- 8. Habit logs
-- --------------------------------------------

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  habit_id uuid not null,
  completed_on date not null,
  created_at timestamptz not null default now(),

  constraint habit_logs_owner_fk
    foreign key (habit_id, user_id)
    references public.habits(id, user_id)
    on delete cascade,

  unique (habit_id, completed_on)
);

-- --------------------------------------------
-- 9. Notebooks
-- --------------------------------------------

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  title text not null
    check (char_length(trim(title)) between 1 and 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- --------------------------------------------
-- 10. Notebook pages
-- --------------------------------------------

create table public.notebook_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  title text not null default 'Untitled page',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (notebook_id, user_id)
    references public.notebooks(id, user_id)
    on delete cascade,

  unique (id, user_id)
);

-- --------------------------------------------
-- 11. Sticky notes
-- --------------------------------------------

create table public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  page_id uuid not null,
  content text not null
    check (char_length(trim(content)) between 1 and 500),
  color text not null default 'yellow',
  created_at timestamptz not null default now(),

  foreign key (page_id, user_id)
    references public.notebook_pages(id, user_id)
    on delete cascade
);

-- --------------------------------------------
-- 12. Calendar events
-- --------------------------------------------

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  title text not null
    check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

-- --------------------------------------------
-- 13. Create profile and settings for new users
-- --------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- --------------------------------------------
-- 14. Enable Row Level Security
-- --------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.books enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.notebooks enable row level security;
alter table public.notebook_pages enable row level security;
alter table public.sticky_notes enable row level security;
alter table public.calendar_events enable row level security;

-- --------------------------------------------
-- 15. Profile policies
-- --------------------------------------------

create policy "Read own profile"
on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy "Update own profile"
on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- --------------------------------------------
-- 16. Settings policies
-- --------------------------------------------

create policy "Manage own settings"
on public.user_settings
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- --------------------------------------------
-- 17. User-owned table policies
-- --------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'subjects',
    'tasks',
    'books',
    'habits',
    'habit_logs',
    'notebooks',
    'notebook_pages',
    'sticky_notes',
    'calendar_events'
  ]
  loop
    execute format(
      'create policy %I on public.%I
       for all to authenticated
       using (user_id = (select auth.uid()))
       with check (user_id = (select auth.uid()))',
      'Manage own ' || table_name,
      table_name
    );
  end loop;
end;
$$;

-- --------------------------------------------
-- 18. Table permissions
-- --------------------------------------------

revoke all on public.profiles from anon, authenticated;

revoke all on
  public.user_settings,
  public.subjects,
  public.tasks,
  public.books,
  public.habits,
  public.habit_logs,
  public.notebooks,
  public.notebook_pages,
  public.sticky_notes,
  public.calendar_events
from anon, authenticated;

grant select on public.profiles to authenticated;

grant update (display_name, avatar_url)
on public.profiles to authenticated;

grant select, insert, update, delete
on public.user_settings,
   public.subjects,
   public.tasks,
   public.books,
   public.habits,
   public.habit_logs,
   public.notebooks,
   public.notebook_pages,
   public.sticky_notes,
   public.calendar_events
to authenticated;

-- --------------------------------------------
-- 19. Updated-at triggers
-- --------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_settings',
    'subjects',
    'tasks',
    'books',
    'habits',
    'notebooks',
    'notebook_pages',
    'calendar_events'
  ]
  loop
    execute format(
      'create trigger set_updated_at
       before update on public.%I
       for each row
       execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

-- --------------------------------------------
-- 20. Performance indexes
-- --------------------------------------------

create index subjects_user_id_idx
on public.subjects(user_id);

create index tasks_user_due_date_idx
on public.tasks(user_id, due_date);

create index tasks_user_status_idx
on public.tasks(user_id, status);

create index tasks_subject_owner_idx
on public.tasks(subject_id, user_id);

create index books_user_id_idx
on public.books(user_id);

create index habits_user_id_idx
on public.habits(user_id);

create index habit_logs_user_date_idx
on public.habit_logs(user_id, completed_on);

create index habit_logs_habit_owner_idx
on public.habit_logs(habit_id, user_id);

create index notebooks_user_id_idx
on public.notebooks(user_id);

create index notebook_pages_notebook_owner_idx
on public.notebook_pages(notebook_id, user_id);

create index sticky_notes_page_owner_idx
on public.sticky_notes(page_id, user_id);

create index calendar_events_user_start_idx
on public.calendar_events(user_id, starts_at);
