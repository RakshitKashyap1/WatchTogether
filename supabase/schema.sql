create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text,
  created_at timestamptz not null default now()
);

alter table users alter column password_hash drop not null;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  current_media_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists room_members (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'viewer',
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  original_filename text not null,
  hls_path text not null,
  status text not null default 'processing',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_current_media_id_fkey'
  ) then
    alter table rooms
      add constraint rooms_current_media_id_fkey
      foreign key (current_media_id) references media_assets(id) on delete set null;
  end if;
end $$;

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx on chat_messages(room_id, created_at);
