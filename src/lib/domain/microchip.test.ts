import { describe, expect, it } from "vitest";
import {
  BRAZIL_MICROCHIP_DATABASES,
  formatMicrochip,
  isValidIsoMicrochip,
  MICROCHIP_GUIDE_STEPS,
  normalizeMicrochip,
} from "./microchip";

describe("microchip domain utilities", () => {
  it("normalizes and validates 15-digit ISO microchip numbers", () => {
    expect(normalizeMicrochip("981.098.102.345.678")).toBe("981098102345678");
    expect(normalizeMicrochip(" 981 098 102 345 678 ")).toBe("981098102345678");
    expect(normalizeMicrochip(null)).toBe("");
    expect(normalizeMicrochip(undefined)).toBe("");

    expect(isValidIsoMicrochip("981098102345678")).toBe(true);
    expect(isValidIsoMicrochip("981 098 102 345 678")).toBe(true);
    expect(isValidIsoMicrochip("12345")).toBe(false);
    expect(isValidIsoMicrochip("")).toBe(false);
    expect(isValidIsoMicrochip("abc123456789012")).toBe(false);
  });

  it("formats 15-digit microchips with grouped spaces", () => {
    expect(formatMicrochip("981098102345678")).toBe("981 098 102 345 678");
    expect(formatMicrochip("981-098-102-345-678")).toBe("981 098 102 345 678");
    expect(formatMicrochip("custom-chip-123")).toBe("custom-chip-123");
    expect(formatMicrochip(null)).toBe("");
  });

  it("includes Abrasp and SIRAA databases in the national list", () => {
    const ids = BRAZIL_MICROCHIP_DATABASES.map((db) => db.id);
    expect(ids).toContain("siraa");
    expect(ids).toContain("abrasp");
    expect(ids).toContain("petmaxx");

    const siraa = BRAZIL_MICROCHIP_DATABASES.find((db) => db.id === "siraa");
    expect(siraa?.url).toBe("https://www.siraa.org");

    const abrasp = BRAZIL_MICROCHIP_DATABASES.find((db) => db.id === "abrasp");
    expect(abrasp?.url).toBe("https://abrasp.org.br");
  });

  it("provides helpful step-by-step instructions for finders", () => {
    expect(MICROCHIP_GUIDE_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(MICROCHIP_GUIDE_STEPS[0].title).toContain("clínica");
  });
});
