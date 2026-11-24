/**
 * Fills the database with the same demo data the web app's mock uses
 * (packages/shared/src/mock/seed.ts), with dates relative to today.
 * DESTRUCTIVE: empties every table first.
 * Run with: pnpm --filter @pitchkh/api db:seed
 */
import { seedDb } from "@pitchkh/shared/mock";
import bcrypt from "bcryptjs";
import { sql as dsql } from "drizzle-orm";
import { loadEnvFile } from "../load-env";
import { createDb, type Database } from "./client";
import * as t from "./schema";

const date = (iso: string): Date => new Date(iso);

export async function seed(db: Database, now = new Date()): Promise<void> {
  const mock = seedDb(now);
  // Every demo account shares one password; hash each distinct one once.
  const hashes = new Map<string, string>();
  for (const password of new Set(Object.values(mock.passwords))) hashes.set(password, await bcrypt.hash(password, 10));

  await db.transaction(async (tx) => {
    await tx.execute(dsql`TRUNCATE password_resets, payments, users, refresh_tokens, venues, fields, bookings, availability_blocks, favorites, notifications, reports, telegram_links CASCADE`);
    await tx.insert(t.users).values(mock.users.map((u) => ({ ...u, passwordHash: hashes.get(mock.passwords[u.id] ?? "") ?? "", createdAt: date(u.createdAt) })));
    await tx.insert(t.venues).values(mock.venues.map((v) => ({ ...v, createdAt: date(v.createdAt) })));
    await tx.insert(t.fields).values(mock.fields);
    // Insert in start order so the no-overlap constraint sees the same data the mock accepted.
    const bookings = [...mock.bookings].sort((a, b) => a.startAt.localeCompare(b.startAt));
    for (let i = 0; i < bookings.length; i += 200) {
      await tx.insert(t.bookings).values(bookings.slice(i, i + 200).map((b) => ({ ...b, startAt: date(b.startAt), endAt: date(b.endAt), createdAt: date(b.createdAt), cancelledAt: b.cancelledAt ? date(b.cancelledAt) : null, paymentDueAt: b.paymentDueAt ? date(b.paymentDueAt) : null })));
    }
    if (mock.blocks.length) await tx.insert(t.blocks).values(mock.blocks);
    if (mock.favorites.length) await tx.insert(t.favorites).values(mock.favorites.map((f) => ({ ...f, createdAt: date(f.createdAt) })));
    if (mock.notifications.length) await tx.insert(t.notifications).values(mock.notifications.map((n) => ({ ...n, createdAt: date(n.createdAt) })));
    if (mock.reports.length) await tx.insert(t.reports).values(mock.reports.map((r) => ({ ...r, createdAt: date(r.createdAt) })));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnvFile();
  const { sql, db } = createDb();
  await seed(db);
  const [{ count }] = (await sql`SELECT count(*)::int AS count FROM bookings`) as unknown as [{ count: number }];
  console.log(`seeded demo data (${count} bookings)`);
  await sql.end();
}
