import "server-only";
import postgres from "postgres";
import {
  currencySchema,
  type ActivityEvent,
  type ActualPayout,
  type CurrencyCode,
  type Money,
  type Settings,
  type Tone,
} from "@/types";
import type { ClaimResult, Json, ReminderLogEntry, Store, StoredRates } from "./store";

type Sql = postgres.Sql;

interface ActivityRow {
  id: string;
  kind: ActivityEvent["kind"];
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  at: Date;
  amount: Money | null;
}

interface RateRow {
  currency: CurrencyCode;
  rate: string;
  on_date: string;
  fetched_on: string;
}

const CURRENCIES = currencySchema.options;

export function createSqlClient(url: string): Sql {
  // Neon's pooled URL goes through PgBouncer, which cannot keep prepared statements.
  return postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
}

// Interfaces have no index signature, so round-trip through JSON to get a plain value.
function toJson(sql: Sql, value: object): postgres.Parameter {
  return sql.json(JSON.parse(JSON.stringify(value)) as Json);
}

function toActivityEvent(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    kind: row.kind,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    clientName: row.client_name,
    at: row.at.toISOString(),
    ...(row.amount ? { amount: row.amount } : {}),
  };
}

export function createPostgresStore(sql: Sql): Store {
  return {
    async claim(requestId, bodyHash): Promise<ClaimResult> {
      const inserted = await sql`
        insert into idempotency_requests (request_id, body_hash, status)
        values (${requestId}, ${bodyHash}, 'in_progress')
        on conflict (request_id) do nothing
        returning request_id`;
      if (inserted.length > 0) return { kind: "new" };

      const [existing] = await sql<{ body_hash: string; status: string; result: Json | null }[]>`
        select body_hash, status, result from idempotency_requests where request_id = ${requestId}`;
      if (existing.body_hash !== bodyHash) return { kind: "conflict" };
      if (existing.status === "completed" && existing.result !== null) {
        return { kind: "replay", result: existing.result };
      }
      return { kind: "in_progress" };
    },

    async complete(requestId, result): Promise<void> {
      await sql`
        update idempotency_requests
        set status = 'completed', result = ${sql.json(result)}
        where request_id = ${requestId}`;
    },

    async isProcessed(eventId): Promise<boolean> {
      const rows = await sql`select 1 from webhook_events where event_id = ${eventId}`;
      return rows.length > 0;
    },

    async markProcessed(eventId): Promise<boolean> {
      const inserted = await sql`
        insert into webhook_events (event_id) values (${eventId})
        on conflict (event_id) do nothing
        returning event_id`;
      return inserted.length > 0;
    },

    async addActivity(event): Promise<void> {
      await sql`
        insert into activity_events (id, kind, invoice_id, invoice_number, client_name, at, amount)
        values (
          ${event.id}, ${event.kind}, ${event.invoiceId}, ${event.invoiceNumber},
          ${event.clientName}, ${event.at}, ${event.amount ? toJson(sql, event.amount) : null}
        )
        on conflict (id) do nothing`;
    },

    async latestActivity(limit): Promise<ActivityEvent[]> {
      const rows = await sql<ActivityRow[]>`
        select id, kind, invoice_id, invoice_number, client_name, at, amount
        from activity_events order by at desc limit ${limit}`;
      return rows.map(toActivityEvent);
    },

    async logReminder(entry): Promise<void> {
      await sql`
        insert into reminder_log (invoice_id, tone, sent_at)
        values (${entry.invoiceId}, ${entry.tone}, ${entry.sentAt})`;
    },

    async reminderHistory(invoiceId): Promise<ReminderLogEntry[]> {
      const rows = await sql<{ tone: Tone; sent_at: Date }[]>`
        select tone, sent_at from reminder_log where invoice_id = ${invoiceId} order by sent_at`;
      return rows.map((row) => ({ invoiceId, tone: row.tone, sentAt: row.sent_at.toISOString() }));
    },

    async getSettings(): Promise<Settings | null> {
      const [row] = await sql<{ value: Settings }[]>`select value from settings where id = 1`;
      return row?.value ?? null;
    },

    async saveSettings(settings): Promise<void> {
      await sql`
        insert into settings (id, value) values (1, ${toJson(sql, settings)})
        on conflict (id) do update set value = excluded.value, updated_at = now()`;
    },

    async hitRateLimit(key, windowSeconds): Promise<number> {
      const [row] = await sql<{ count: number }[]>`
        insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
        on conflict (key) do update set
          count = case
            when rate_limits.window_start + make_interval(secs => ${windowSeconds}) <= now() then 1
            else rate_limits.count + 1
          end,
          window_start = case
            when rate_limits.window_start + make_interval(secs => ${windowSeconds}) <= now() then now()
            else rate_limits.window_start
          end
        returning count`;
      return row.count;
    },

    async getCached(key): Promise<Json | null> {
      const [row] = await sql<{ value: Json }[]>`
        select value from cache_entries where key = ${key} and expires_at > now()`;
      return row?.value ?? null;
    },

    async putCached(key, value, ttlSeconds): Promise<void> {
      await sql`delete from cache_entries where expires_at <= now()`;
      await sql`
        insert into cache_entries (key, value, expires_at)
        values (${key}, ${sql.json(value)}, now() + make_interval(secs => ${ttlSeconds}))
        on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at`;
    },

    async getLatestRates(): Promise<StoredRates | null> {
      const rows = await sql<RateRow[]>`
        select currency, rate, to_char(on_date, 'YYYY-MM-DD') as on_date,
          to_char(fetched_on, 'YYYY-MM-DD') as fetched_on
        from exchange_rates
        where on_date = (select max(on_date) from exchange_rates)`;
      if (rows.length < CURRENCIES.length) return null;

      const rates = Object.fromEntries(rows.map((row) => [row.currency, Number(row.rate)]));
      return {
        rates: rates as Record<CurrencyCode, number>,
        onDate: rows[0].on_date,
        fetchedOn: rows.map((row) => row.fetched_on).reduce((a, b) => (a > b ? a : b)),
      };
    },

    async putRates(stored): Promise<void> {
      for (const currency of CURRENCIES) {
        await sql`
          insert into exchange_rates (currency, on_date, fetched_on, rate)
          values (${currency}, ${stored.onDate}, ${stored.fetchedOn}, ${stored.rates[currency]})
          on conflict (currency, on_date) do update set
            rate = excluded.rate, fetched_on = excluded.fetched_on`;
      }
    },

    async getActualPayout(invoiceId): Promise<ActualPayout | null> {
      const [row] = await sql<{ payout: ActualPayout }[]>`
        select payout from actual_payouts where invoice_id = ${invoiceId}`;
      return row?.payout ?? null;
    },

    async putActualPayout(invoiceId, payout): Promise<void> {
      await sql`
        insert into actual_payouts (invoice_id, payout) values (${invoiceId}, ${toJson(sql, payout)})
        on conflict (invoice_id) do update set payout = excluded.payout, fetched_at = now()`;
    },

    async ping(): Promise<void> {
      await sql`select 1`;
    },
  };
}
