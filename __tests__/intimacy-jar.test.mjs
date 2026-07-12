import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, it, expect } from "vitest";
import { validateItem, categoryLabel, randomUntried, averageRating, CATEGORIES } from "../src/logic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));
const indexHtml = readFileSync(join(__dirname, "../src/index.html"), "utf-8");
const migration = readFileSync(join(__dirname, "../migrations/001_init.sql"), "utf-8");

const VALID_STORAGE   = ["kv", "db", "none"];
const VALID_AUDIENCES = ["everyone", "adults", "children"];

describe("manifest.json", () => {
  it("has required string fields", () => {
    for (const field of ["id", "name", "version", "description", "entrypoint", "runtime", "icon"]) {
      expect(manifest[field], `missing field: ${field}`).toBeTruthy();
    }
  });
  it("entrypoint is index.html", () => expect(manifest.entrypoint).toBe("index.html"));
  it("runtime is static",        () => expect(manifest.runtime).toBe("static"));
  it("storage is declared and valid", () => {
    expect(manifest.storage, "storage field is required").toBeTruthy();
    expect(VALID_STORAGE).toContain(manifest.storage);
  });
  it("version follows semver", () => expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/));
  it("permissions.default_audience is valid", () => {
    expect(VALID_AUDIENCES).toContain(manifest.permissions.default_audience);
  });
  it("permissions.requires_approval is boolean", () => {
    expect(typeof manifest.permissions.requires_approval).toBe("boolean");
  });
  it("data_access has reads and writes arrays", () => {
    expect(Array.isArray(manifest.data_access.reads)).toBe(true);
    expect(Array.isArray(manifest.data_access.writes)).toBe(true);
  });
  it("audience is adults (age-gated)", () => {
    expect(manifest.permissions.default_audience).toBe("adults");
  });
  it("ai_access is not declared (private app)", () => {
    expect(manifest.ai_access).toBeUndefined();
  });
  it("requires reciprocal pairing and protects item mutations", () => {
    expect(manifest.row_policies.jar_items).toMatchObject({
      kind: "couple_scoped",
      require_reciprocal: true,
      updates_via_endpoint_only: true,
      delete_owner_only: true,
      column_write_acls: {
        tried_at: { writable_by: [], actions: ["insert"] },
        rating: { writable_by: [], actions: ["insert"] },
        tried_note: { writable_by: [], actions: ["insert"] },
      },
      insert_max_lengths: { title: 200, notes: 2000 },
    });
    expect(manifest.couple_item_state).toMatchObject({
      table: "jar_items",
      require_reciprocal: true,
      min_rating: 1,
      max_rating: 5,
    });
  });
});

describe("security and schema hardening", () => {
  it("does not interpolate database item ids into inline JavaScript handlers", () => {
    expect(indexHtml).not.toMatch(/onclick="(?:openRateModal|deleteItem)\('\$\{esc\(item\.id\)\}'\)"/);
    expect(indexHtml).toContain('data-item-id="${esc(item.id)}"');
    expect(indexHtml).toContain('addEventListener("click", handleItemAction)');
  });

  it("checks DB responses and uses the trusted state endpoint", () => {
    expect(indexHtml).toContain("if (!res.ok || payload.error)");
    expect(indexHtml).toContain(`/api/couple-item-state`);
    expect(indexHtml).not.toContain("UPDATE app_intimacy_jar__jar_items");
  });

  it("constrains persisted values and indexes the initial load query", () => {
    expect(migration).toMatch(/rating IS NULL OR rating BETWEEN 1 AND 5/);
    expect(migration).toMatch(/category IN \('romantic', 'playful', 'adventurous', 'intimate', 'other'\)/);
    expect(migration).toMatch(/length\(id\) BETWEEN 1 AND 100/);
    expect(migration).toMatch(/CREATE INDEX IF NOT EXISTS app_intimacy_jar__idx_items_creator_created/);
  });
});

describe("validateItem", () => {
  it("rejects empty string",      () => expect(validateItem("").valid).toBe(false));
  it("rejects whitespace only",   () => expect(validateItem("   ").valid).toBe(false));
  it("rejects title over 200 chars", () => expect(validateItem("x".repeat(201)).valid).toBe(false));
  it("accepts a valid title and trims it", () => {
    const r = validateItem("  Candlelit dinner at home  ");
    expect(r.valid).toBe(true);
    expect(r.trimmed).toBe("Candlelit dinner at home");
  });
  it("accepts exactly 200 chars", () => expect(validateItem("x".repeat(200)).valid).toBe(true));
});

describe("categoryLabel", () => {
  it("returns label for known category", () => expect(categoryLabel("romantic")).toContain("Romantic"));
  it("returns raw value for unknown category", () => expect(categoryLabel("unknown")).toBe("unknown"));
  it("covers all CATEGORIES", () => {
    for (const c of CATEGORIES) {
      expect(categoryLabel(c.value)).toBe(c.label);
    }
  });
});

describe("randomUntried", () => {
  it("returns null for empty array",         () => expect(randomUntried([])).toBeNull());
  it("returns null when all items are tried", () => {
    const items = [
      { id: "1", tried_at: "2024-01-01" },
      { id: "2", tried_at: "2024-01-02" },
    ];
    expect(randomUntried(items)).toBeNull();
  });
  it("never returns a tried item", () => {
    const items = [
      { id: "1", tried_at: "2024-01-01" },
      { id: "2", tried_at: null },
      { id: "3", tried_at: null },
    ];
    for (let i = 0; i < 20; i++) {
      const result = randomUntried(items);
      expect(result?.tried_at).toBeNull();
    }
  });
  it("returns the only untried item deterministically", () => {
    const items = [
      { id: "1", tried_at: "2024-01-01" },
      { id: "2", tried_at: null },
    ];
    expect(randomUntried(items)?.id).toBe("2");
  });
});

describe("averageRating", () => {
  it("returns null for empty array",             () => expect(averageRating([])).toBeNull());
  it("returns null when no items are tried",     () => {
    expect(averageRating([{ tried_at: null, rating: null }])).toBeNull();
  });
  it("returns null when tried but unrated",      () => {
    expect(averageRating([{ tried_at: "2024-01-01", rating: null }])).toBeNull();
  });
  it("returns correct average for rated items",  () => {
    const items = [
      { tried_at: "2024-01-01", rating: 4 },
      { tried_at: "2024-01-02", rating: 2 },
    ];
    expect(averageRating(items)).toBe(3);
  });
  it("ignores untried items in average",         () => {
    const items = [
      { tried_at: "2024-01-01", rating: 5 },
      { tried_at: null,         rating: null },
    ];
    expect(averageRating(items)).toBe(5);
  });
});
