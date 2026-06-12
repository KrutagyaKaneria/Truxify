create table if not exists processed_batches (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  user_id uuid not null,
  event_count int not null default 0,
  processed_at timestamptz not null default now()
);

create index if not exists idx_processed_batches_user_id
on processed_batches (user_id);

create index if not exists idx_processed_batches_processed_at
on processed_batches (processed_at);
