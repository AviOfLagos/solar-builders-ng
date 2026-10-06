import "server-only";
import postgres, { type TransactionSql } from "postgres";
import { customAlphabet } from "nanoid";
import { createHash } from "crypto";

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

-- v2: Google/Apple sign-in, gift card holds, refunds, deadlines, squads, leads, ledger, rate limits
alter table users alter column password_hash drop not null;
alter table users add column if not exists google_sub text unique;
alter table users add column if not exists apple_sub text unique;
alter table orders add column if not exists gift_code text;
alter table orders add column if not exists lead_id text;
alter table orders add column if not exists refunded int not null default 0;
alter table orders add column if not exists status_at timestamptz not null default now();
create index if not exists orders_status_idx on orders(status, created_at);
alter table pools add column if not exists kind text not null default 'public';
alter table pools add column if not exists deadline timestamptz;
alter table pools add column if not exists extended boolean not null default false;
alter table pools add column if not exists ended_at timestamptz;
update pools set deadline = created_at + interval '30 days' where deadline is null;
alter table contributions add column if not exists refunded int not null default 0;
alter table contributions add column if not exists piece text;
alter table contributions add column if not exists share_id text;
alter table contributions add column if not exists user_id text;
create table if not exists shares (
  id text primary key,
  pool_id text not null references pools(id) on delete cascade,
  name text not null default '',
  amount int not null,
  status text not null default 'open',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shares_pool_idx on shares(pool_id);
create table if not exists leads (
  id text primary key,
  user_id text references users(id) on delete set null,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  consent boolean not null default false,
  source text not null default '',
  items jsonb not null default '[]',
  total int not null default 0,
  order_id text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_updated_idx on leads(updated_at desc);
create index if not exists leads_user_idx on leads(user_id, updated_at desc) where user_id is not null and order_id is null;
create table if not exists ledger (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null,
  amount int not null,
  ref text not null default '',
  pi_id text,
  note text not null default ''
);
create index if not exists ledger_ref_idx on ledger(ref);
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);
create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
create table if not exists paystack_cards (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  authorization_code text not null,
  signature text not null,
  email text not null,
  brand text not null default '',
  last4 text not null default '',
  exp_month int not null default 0,
  exp_year int not null default 0,
  bank text not null default '',
  nickname text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, signature)
);
create table if not exists devices (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  platform text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists devices_user_idx on devices(user_id);
create table if not exists password_resets (
  user_id text primary key references users(id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null
);
alter table users add column if not exists deleted_at timestamptz;
-- v4: brand feature requests are leads with a note
alter table leads add column if not exists note text not null default '';
-- v5: first-party page views and clicks (no cookies, no personal data)
create table if not exists events (
  id bigserial primary key,
  at timestamptz not null default now(),
  sid text not null default '',
  kind text not null,
  path text not null default '',
  name text not null default '',
  ref text not null default ''
);
create index if not exists events_at_idx on events(at);
-- v5: lead follow-up status for the admin and the WhatsApp pipeline
alter table leads add column if not exists status text not null default 'new';
alter table leads add column if not exists needs_human boolean not null default false;
-- v6: where a visit came from: utm source|medium|campaign
alter table events add column if not exists utm text not null default '';
-- v6: editable pricing. scope is default | floor | brand | category | product
create table if not exists price_rules (
  scope text not null,
  key text not null default '',
  markup double precision,
  fixed int,
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  primary key (scope, key)
);
-- v7: fulfilment. suppliers, purchase orders, installers, jobs, commission payouts
create table if not exists suppliers (
  id text primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  brands text[] not null default '{}',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists purchase_orders (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  supplier_id text references suppliers(id) on delete set null,
  status text not null default 'draft',
  items jsonb not null default '[]',
  cost int not null default 0,
  delivery_cost int not null default 0,
  ship_to text not null default 'us',
  note text not null default '',
  sent_at timestamptz,
  confirmed_at timestamptz,
  expected_at date,
  delivered_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists po_order_idx on purchase_orders(order_id);
create table if not exists installers (
  id text primary key,
  name text not null,
  phone text not null default '',
  email text not null default '',
  areas text not null default '',
  rate int not null default 0,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists order_jobs (
  id text primary key,
  order_id text not null unique references orders(id) on delete cascade,
  installer_id text references installers(id) on delete set null,
  status text not null default 'assigned',
  job_date date,
  fee int not null default 0,
  photo_url text not null default '',
  note text not null default '',
  assigned_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists commission_payouts (
  order_id text primary key references orders(id) on delete cascade,
  status text not null default 'approved',
  paid_at timestamptz,
  ref text not null default '',
  updated_at timestamptz not null default now()
);
-- v8: outreach pipeline and a log of every message the assistant or team sends
create table if not exists prospects (
  id text primary key,
  name text not null,
  kind text not null default 'distributor',
  email text not null default '',
  phone text not null default '',
  instagram text not null default '',
  linkedin text not null default '',
  website text not null default '',
  status text not null default 'new',
  notes text not null default '',
  last_contacted_at timestamptz,
  follow_up_on date,
  stop boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists outbound_log (
  id text primary key,
  at timestamptz not null default now(),
  kind text not null,
  recipient text not null,
  subject text not null default '',
  body text not null default '',
  actor text not null default '',
  ref text not null default '',
  sent boolean not null default false
);
create index if not exists outbound_at_idx on outbound_log(at);
-- v9: one-time codes that hand a website Google sign-in to the phone app
create table if not exists app_codes (
  code_hash text primary key,
  state_hash text not null,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false
);
-- v10: verified emails
alter table users add column if not exists email_verified_at timestamptz;
create table if not exists email_tokens (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
`;

const SCHEMA_VERSION = createHash("sha1").update(SCHEMA).digest("hex").slice(0, 12);

/**
 * Creates and migrates tables on first use. Runs once per schema change: a lock stops two
 * cold starts migrating at the same time, and the schema's hash is stored when done.
 */
async function migrate(s: Sql) {
  await s.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(727274)`;
    await tx.unsafe(`create table if not exists settings (key text primary key, value text not null, updated_at timestamptz not null default now())`);
    const [v] = await tx`select value from settings where key = 'schema_version'`;
    if (v?.value === SCHEMA_VERSION) return;
    await tx.unsafe(SCHEMA);
    await tx`insert into settings (key, value) values ('schema_version', ${SCHEMA_VERSION}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  });
}

export async function db() {
  const s = sql();
  g.__schema ??= migrate(s).catch((e) => { g.__schema = undefined; throw e; });
  await g.__schema;
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Tx = TransactionSql<{}>;
