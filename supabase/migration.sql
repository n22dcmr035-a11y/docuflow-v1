-- DocuFlow Database Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  storage_path text not null,
  parsed_html text,
  word_count integer default 0,
  cover_color text default '#b5d5e0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  document_id uuid references documents on delete cascade not null,
  scroll_pct integer default 0 check (scroll_pct between 0 and 100),
  last_read timestamptz default now(),
  unique (user_id, document_id)
);

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  document_id uuid references documents on delete cascade not null,
  highlighted_text text not null,
  position jsonb not null,
  color text default 'yellow' check (color in ('yellow', 'green', 'blue', 'pink')),
  note_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table documents enable row level security;
alter table reading_progress enable row level security;
alter table annotations enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Users own their documents" on documents;
drop policy if exists "Users own their progress" on reading_progress;
drop policy if exists "Users own their annotations" on annotations;

create policy "Users own their documents"
  on documents for all using (auth.uid() = user_id);

create policy "Users own their progress"
  on reading_progress for all using (auth.uid() = user_id);

create policy "Users own their annotations"
  on annotations for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Storage bucket (run separately if storage isn't created yet)
-- ─────────────────────────────────────────────────────────────

-- Insert the 'documents' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload/access their own files
drop policy if exists "Users upload their own files" on storage.objects;
create policy "Users upload their own files"
  on storage.objects for all
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
