import { describe, expect, it } from "vitest";
import { formatHours } from "./labels.js";

describe("formatHours", () => {
  it("mostra travessão quando não há horas registradas", () => {
    expect(formatHours(0)).toBe("—");
  });

  it("omite os minutos quando são zero", () => {
    expect(formatHours(12)).toBe("12h");
  });

  it("converte a fração em minutos", () => {
    expect(formatHours(12.5)).toBe("12h30");
    expect(formatHours(1.25)).toBe("1h15");
  });
});
