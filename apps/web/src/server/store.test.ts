import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHEMA } from "./store";

const squash = (sql: string): string => sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();

describe("database schema", () => {
  it("db/schema.sql documents exactly what the app creates on start-up", () => {
    const file = readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");
    const statements = file.split(";").map(squash).filter(Boolean);
    expect(statements).toEqual(SCHEMA.map(squash));
  });

  it("keeps overlapping live bookings out at the database level", () => {
    const table = SCHEMA.find((s) => s.includes("CREATE TABLE")) ?? "";
    expect(table).toMatch(/EXCLUDE USING gist \(\s*field_id WITH =, date WITH =, int4range\(start_min, end_min\) WITH &&\s*\) WHERE \(status <> 'cancelled'\)/);
  });
});
