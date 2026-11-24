# Pitch map + 2-screen booking: design

Status: approved in conversation (2026-11-24). Layout source: **option A, owners draw it**.

## Why

Players told us three things about booking:

1. **Too many steps.** Today: Field → Time → Details → Pay (4 screens).
2. **Hard to know which pitch is which.** Pitches are a text list ("Field A · Outdoor, front"),
   so at a big venue you can't tell where "Field B" actually is.
3. **Venues are big and mixed.** One location can have many football pitches of different
   sizes (e.g. three 6v6 stacked next to one 10v10), and some locations mix sports.

Success: a player opens a venue, *sees* the real layout, taps a pitch (or a time), and is paying
on the second screen.

## Goals

- A top-down **pitch map** of each venue, pitches drawn at true relative size and position.
- Booking in **2 screens**: ① Pick (sport, day, pitch, time together) ② Confirm & pay.
- Two ways into screen ①: **pitch first** (tap pitch → see its free times) or **time first**
  (tap a start time → map shows which pitches are free then).
- The same map on the **venue page**, so people see the layout before booking.
- Owners place pitches on the map in the **owner dashboard** (drag, rotate, auto-arrange).
- A showcase venue matching the sketch (3 × 6v6 + 1 × 10v10 + more).
- README rewritten so the project is easy to understand; docs updated so the future backend
  knows the new fields and endpoints.

## Non-goals

- No real backend (the user builds it later). Everything goes through the existing mock server,
  and the API contract is updated so the backend can match it.
- No free-form shapes (pitches are rectangles, 0° or 90°). No pinch-zoom (map fits the width;
  very tall plans scroll with the page).
- No zone/building drawing on the map. Indoor pitches get a roof outline instead.

## Anti-goals (it fails even if it "works")

- The map is a pretty picture you can't use with a keyboard or screen reader.
- The map makes small phones (360 px) worse: pitches too small to tap.
- Booking a venue with one pitch gets *more* steps than before.

## Approaches considered

| | Approach | Trade-off | Picked |
|---|---|---|---|
| A | Owners draw the layout; app auto-arranges as a starting point | Accurate; needs a layout editor | **Yes** (user chose) |
| B | Auto-layout only, no editor | Faster to build; map doesn't match the real venue | No |

Rendering: **SVG** (not canvas/three.js). Crisp at any size, accessible (`role="radio"` per pitch),
tiny bundle, easy hit-testing. The 3D viewer stays for "look around" a single pitch.

## Data (packages/shared)

- `Field.layout: { x, y, w, h } | null`, in **metres**, origin top-left of the venue plan.
  The longer side is the pitch length; `h > w` means the pitch is drawn vertically.
  `null` = not placed yet → the map auto-arranges it.
- `pitchSize(sport, format)` moves from `field3d/scene.ts` into `domain/` and gains the
  in-between football sizes (6v6, 8v8, 9v9, 10v10).
- `autoLayout(fields)` in `domain/layout.ts`: packs unplaced pitches into rows by sport, biggest
  first, 4 m gaps. `resolveLayout(fields)` = saved layouts + auto-placed rest.
- `findLayoutOverlap(items)` for validation.
- New endpoint `GET /venues/:id/availability?date=` → `{ venueId, date, fields: Availability[] }`
  (one call to colour the whole map).
- New endpoint `PUT /owner/venues/:id/layout` body `{ items: [{ fieldId, layout }] }` →
  `VenueDetail`; 422 `validation_failed` if pitches overlap or leave the 0–400 m plan.
- Seed: every venue gets an auto layout; showcase venue **"Chbar Ampov Football City"**
  (3 × 6v6 left, 10v10 centre, 3 × 5v5 indoor hall right) with a hand-drawn layout.
  `MOCK_DB_VERSION` bumps so browsers re-seed.

## UI

### Screen ① Pick (`/book/[slug]`)
- Header: back, venue name, 2-step progress.
- Sport chips (only if the venue has >1 sport); other sports fade on the map.
- Date strip (existing).
- **Start-time chips** ("Any time", 06:00, 07:00 …) — the time-first path.
- **Pitch map**: green = free (at the chosen time, or has free slots that day), grey = full,
  striped = maintenance, ring + check = selected. Label: name + format.
- Below the map, the **selected pitch card**: name, format, surface, indoor/outdoor, price,
  "See in 3D" (opens a sheet with the existing viewer).
- Then the **slot grid** for that pitch (existing tap start → end), pre-filled if a start-time
  chip was chosen.
- One-pitch venues: no map, pitch pre-selected.
- Sticky bar: pitch · day · time · price, **Continue**.

### Screen ② Confirm & pay
- Summary card with a mini map highlighting the chosen pitch.
- Opponent: "I have one / Find me one" (+ level).
- "Players & extras" folded (team size, referee, water, ball, bibs, note) with defaults.
- Payment method, then **Pay $X** in the sticky bar.

### Venue page
- "Fields" section becomes the map + selected pitch card ("Book this pitch", "See in 3D").
  The 3D viewer below follows the selected pitch.

### Owner dashboard
- New page `/owner/venues/[id]/layout`, linked from each venue ("Edit pitch map").
- Drag pitches (pointer, snaps to 1 m), arrow keys move 1 m (Shift = 5 m), rotate 90°,
  length/width inputs, **Auto-arrange**, **Save**. Overlaps are shown in red and block saving.

### Other improvements
- **Book again** on a past booking → `/book/[slug]?field=…` with the pitch pre-selected.
- English + Khmer strings for everything new.

## Left to the builder (my calls)

- Exact colours come from existing theme tokens (`--primary`, `--pitch`, etc.).
- Label font size scales with the pitch and is clamped so it stays readable.
- Hourly start-time chips (not every 30 min) to keep the row short.
- e2e script updated to the 2-screen flow; new unit tests for layout helpers.
