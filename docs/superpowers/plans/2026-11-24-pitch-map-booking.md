# Pitch Map + 2-Screen Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the field list with a top-down SVG pitch map, cut booking to 2 screens, let owners draw their venue map, and rewrite the README.

**Architecture:** Layout data (`Field.layout`, metres) and pure layout helpers live in `packages/shared/domain`; two new mock endpoints (venue availability, save layout) follow the existing handler pattern. One reusable `PitchMap` SVG component (`apps/web/src/features/pitch-map`) is used by the booking flow, venue page and owner editor.

**Tech Stack:** TypeScript, zod 4, vitest, Next.js 16, Tailwind v4, TanStack Query, zustand, next-intl, motion.

**Spec:** `docs/superpowers/specs/2026-11-24-pitch-map-booking-design.md`

## Global Constraints

- `packages/shared` stays platform-free (no DOM, React, Next).
- UI only talks to `api.*`; never imports mock data.
- Every new string exists in both `en.json` and `km.json` (`node scripts/i18n-merge.mjs` passes).
- Touch targets ≥ 44 px; works at 360 px wide; `prefers-reduced-motion` honoured.
- Layout units are metres; plan bounds 0–400 m; pitches are rectangles (0° or 90°).
- `pnpm check` (typecheck, lint, test, build) passes at the end.

## Review Focus

- Persisted drafts from the old 4-step flow (`step` 2 or 3) must not break the new 2-step flow → clamp in `open`.
- A venue whose fields have no layout (owner-created field) must still render → `resolveLayout` auto-places nulls without overlapping saved ones (test in Task 1).
- Maintenance pitches must be visible but not selectable (Task 3 renders them striped + `aria-disabled`).
- Time-first chip with no free pitch at that time → map all grey + a hint line, not an empty screen (Task 4).
- Owner saves overlapping pitches → server 422, editor shows red and disables Save (Tasks 2 + 6).

---

### Task 1: Shared layout domain + schema

**Files:** Create `packages/shared/src/domain/layout.ts`, `packages/shared/src/domain/layout.test.ts`; modify `schemas/field.ts`, `domain/index.ts`, `apps/web/src/features/field3d/scene.ts` (use `pitchSize`).

**Produces:**
- `FieldLayout = z.object({ x, y, w, h })` (numbers, `w,h ≥ 4`, all within 0–400); `Field.layout: FieldLayout.nullable()`.
- `pitchSize(sport, format): { length: number; width: number }` — football by player count 5:30×18, 6:36×22, 7:52×32, 8:60×40, 9:66×44, 10:75×48, 11:100×64; volleyball 4v4 16×8 else 18×9; tennis 23.77×10.97.
- `resolveLayout(fields): Map<string, FieldLayout>` — saved layouts kept; nulls auto-placed below them.
- `autoLayout(fields): Map<string, FieldLayout>` — all pitches, landscape, grouped by sport, biggest first, shelf rows, 4 m gap, row width ≤ max(longest length, 110).
- `findLayoutOverlap(items: {id, layout}[]): [string, string] | null`.
- `planBounds(layouts): { width, height }` (+ 4 m margin).

- [ ] Tests: `pitchSize("football","6v6")` = 36×22; `autoLayout` of 3×6v6+1×10v10 has no overlaps and all inside bounds; `resolveLayout` keeps a saved layout exactly and places a null one with no overlap; `findLayoutOverlap` returns the pair for touching-inside rects and null for 4 m apart.
- [ ] Run `pnpm test` → FAIL, implement, → PASS, commit.

### Task 2: Mock API — layout in seed, venue availability, save layout

**Files:** modify `schemas/booking.ts` (`VenueAvailability`), `schemas/venue.ts` or `field.ts` (`SaveLayoutDto = { items: {fieldId, layout}[] }`), `mock/seed-data.ts` (`layout?` on `FieldSeed`, showcase venue `chbar-ampov-football-city`), `mock/seed.ts` (seed `layout` via explicit or `autoLayout`), `mock/db.ts` (`MOCK_DB_VERSION = 6`), `mock/handlers/venues.ts`, `mock/handlers/owner.ts` (new fields default `layout: null`), `api/services.ts` (`venues.dayAvailability(venueId, date)`, `owner.saveLayout(venueId, dto)`), `apps/web/src/lib/query.ts` (`qk.venueAvailability`).

- [ ] Test (in `layout.test.ts` via `createApiClient` mock mode like `domain.test.ts`): `dayAvailability` returns one entry per field; `saveLayout` with overlapping items rejects `validation_failed`; valid save round-trips through `venues.get`.
- [ ] Implement, PASS, commit.

### Task 3: `PitchMap` SVG component

**Files:** Create `apps/web/src/features/pitch-map/pitch-map.tsx`, `pitch-markings.tsx`.

**Produces:** `<PitchMap fields layouts? selectedId status? dimSport? onSelect? compact? editable? />` where `status: Record<fieldId, "free" | "full" | "closed">`. viewBox = `planBounds`; each pitch `<g role="radio" tabIndex aria-checked aria-label="Field A, 6v6, free">`; Enter/Space selects; surface colour per `Surface`; football/volleyball/tennis markings oriented along the long side; indoor = dashed roof outline; label = name + format, font clamped.

- [ ] Verify visually in Task 4 screenshots; commit.

### Task 4: Booking flow → 2 screens

**Files:** rewrite `features/booking/booking-flow.tsx` (split `step-pick.tsx`, `step-confirm.tsx`), modify `draft-store.ts` (`step` 0|1, clamp, `wantedStart: string | null`), `slot-picker.tsx` (accept preset range), i18n keys under `booking.*`, `apps/web/scripts/e2e-booking.mjs`.

- [ ] Pick screen per spec (sport chips, date strip, start-time chips, map, selected pitch card with 3D sheet, slot grid; single-pitch venues skip map). Confirm screen (summary + mini map, opponent, folded extras, payment).
- [ ] Update e2e to: login → tap pitch on map → pick slots → Continue → Pay → receipt → cancel. Run against `pnpm build && pnpm start` → PASS. Commit.

### Task 5: Venue page map + Book again

**Files:** modify `features/venues/venue-detail.tsx` (map + selected card replaces `FieldRow` list), `features/booking/booking-detail.tsx` ("Book again" link), i18n.

- [ ] Screenshot `/en/venues/chbar-ampov-football-city` at 390 and 1440 → map visible, no overflow. Commit.

### Task 6: Owner layout editor

**Files:** Create `app/[locale]/owner/venues/[id]/layout/page.tsx`, `features/owner/layout-editor.tsx`; modify `owner-venues.tsx` (link), i18n.

- [ ] Drag (pointer events, 1 m snap), arrows 1 m / Shift 5 m, rotate (swap w/h), length/width inputs, Auto-arrange, Save (disabled + red when `findLayoutOverlap`). Screenshot as owner. Commit.

### Task 7: Assets, docs, README

- [ ] `node apps/web/scripts/render-assets.mjs --only fields` and venue photos for the showcase venue.
- [ ] Update `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` (layout column jsonb, 2 endpoints).
- [ ] Rewrite `README.md` (overview, screenshots in `docs/images/`, features, booking flow, structure, run, demo accounts, backend handoff, roadmap).
- [ ] `pnpm check` → PASS. Commit and push.
