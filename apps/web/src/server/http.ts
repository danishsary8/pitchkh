import "server-only";
import { NextResponse } from "next/server";

export const json = (body: unknown, status = 200): NextResponse => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export const fail = (status: number, error: string, extra?: Record<string, unknown>): NextResponse => json({ error, ...extra }, status);

/** Reads a JSON body of at most `limit` bytes; null if missing, too big or not JSON. */
export async function readJson(request: Request, limit = 8_000): Promise<unknown> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > limit) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Small per-IP limiter against button mashing and casual abuse. It lives in
 * one server instance's memory, so it is a speed bump, not a wall.
 */
const hits = new Map<string, number[]>();
export function rateLimited(request: Request, key: string, max: number, windowMs: number): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

/** One line of JSON per event, searchable in Vercel's logs. */
export const log = (level: "info" | "warn" | "error", msg: string, data: Record<string, unknown> = {}): void => {
  const line = JSON.stringify({ level, msg, ...data });
  if (level === "error") console.error(line);
  else console.log(line);
};
