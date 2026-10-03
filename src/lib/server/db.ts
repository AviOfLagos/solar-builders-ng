import "server-only";
import postgres from "postgres";
import { customAlphabet } from "nanoid";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __sql?: Sql; __schema?: Promise<void> };

export function dbConfigured() {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export function sql(): Sql {
  if (!g.__sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__sql = postgres(url, { ssl: local ? false : "require", max: local ? 5 : 1, idle_timeout: 20, prepare: false });
  }
  return g.__sql;
}

/** Short, unambiguous public codes for shareable links. */
export const code = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
export const id = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

const SCHEMA = `
create table if not exists users (
  id text primary key,
  email text unique not null,
  name text not null default '',
  phone text not null default '',
  password_hash text not null,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);
create table if not exists stores (
  id text primary key,
  user_id text unique not null references users(id) on delete cascade,
  slug text unique not null,
  name text not null,
  bio text not null default '',
  kind text not null default 'affiliate',
  commission_bps int not null default 50,
  whatsapp text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists builds (
  id text primary key,
  user_id text references users(id) on delete set null,
  store_id text references stores(id) on delete set null,
  title text not null default '',
  note text not null default '',
  items jsonb not null,
  views int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists pools (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  store_id text references stores(id) on delete set null,
  title text not null,
  story text not null default '',
  occasion text not null default '',
  items jsonb not null,
  goal int not null,
  raised int not null default 0,
  status text not null default 'open',
  delivery jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists contributions (
  id text primary key,
  pool_id text not null references pools(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  message text not null default '',
  amount int not null,
  anonymous boolean not null default false,
  pi_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table if not exists orders (
  id text primary key,
  pi_id text unique,
  user_id text references users(id) on delete set null,
  store_id text references stores(id) on delete set null,
  pool_id text references pools(id) on delete set null,
  items jsonb not null,
  subtotal int not null,
  gift_card_used int not null default 0,
  total_paid int not null,
  commission int not null default 0,
  buyer jsonb not null,
  delivery jsonb not null,
  recipient jsonb,
  installer boolean not null default false,
  status text not null default 'pending',
  source text not null default 'web',
  created_at timestamptz not null default now()
);
create table if not exists gift_cards (
  code text primary key,
  amount int not null,
  balance int not null,
  from_name text not null default '',
  from_email text not null default '',
  to_name text not null default '',
  to_email text not null default '',
  message text not null default '',
  pi_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table if not exists finance_requests (
  id text primary key,
  user_id text references users(id) on delete set null,
  name text not null,
  phone text not null,
  email text not null default '',
  employment text not null default '',
  income_band text not null default '',
  items jsonb not null,
  total int not null,
  down_pct int not null,
  months int not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create table if not exists subscribers (
  email text primary key,
  source text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists orders_store_idx on orders(store_id);
create index if not exists orders_user_idx on orders(user_id);
create index if not exists contributions_pool_idx on contributions(pool_id);
`;

/** Creates tables on first use. Idempotent, so it is safe on every cold start. */
export async function db() {
  const s = sql();
  g.__schema ??= s.unsafe(SCHEMA).then(() => undefined).catch((e) => { g.__schema = undefined; throw e; });
  await g.__schema;
  return s;
}
