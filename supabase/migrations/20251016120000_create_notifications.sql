-- Create notifications table for in-app alerts
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  link text,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- RLS: users can read, insert and update their own notifications
create policy if not exists "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for faster listing by user and recency
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);