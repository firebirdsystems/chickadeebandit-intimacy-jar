import { describe, it, expect } from "vitest";
import { validateItem, categoryLabel, randomUntried, averageRating } from "../src/logic.js";

describe("validateItem", () => {
  it("rejects empty/whitespace/over-long titles", () => {
    expect(validateItem("").valid).toBe(false);
    expect(validateItem("  ").valid).toBe(false);
    expect(validateItem("x".repeat(201)).valid).toBe(false);
  });

  it("accepts and trims a valid title", () => {
    expect(validateItem("  Stargazing  ")).toEqual({ valid: true, trimmed: "Stargazing" });
  });
});

describe("categoryLabel", () => {
  it("maps known values and falls back to the raw value", () => {
    expect(categoryLabel("romantic")).toBe("Romantic 🌹");
    expect(categoryLabel("nope")).toBe("nope");
  });
});

describe("randomUntried", () => {
  it("returns null when every item was tried", () => {
    expect(randomUntried([{ tried_at: "2026-01-01" }])).toBeNull();
    expect(randomUntried([])).toBeNull();
  });

  it("only ever picks untried items", () => {
    const items = [
      { id: 1, tried_at: "2026-01-01" },
      { id: 2, tried_at: null },
      { id: 3 },
    ];
    for (let i = 0; i < 20; i++) {
      const pick = randomUntried(items);
      expect([2, 3]).toContain(pick.id);
    }
  });
});

describe("averageRating", () => {
  it("returns null when nothing is both tried and rated", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([{ tried_at: "x", rating: null }])).toBeNull();
    expect(averageRating([{ rating: 5 }])).toBeNull();
  });

  it("averages only tried+rated items", () => {
    const items = [
      { tried_at: "x", rating: 5 },
      { tried_at: "x", rating: 2 },
      { tried_at: "x", rating: null },
      { rating: 1 },
    ];
    expect(averageRating(items)).toBe(3.5);
  });
});
