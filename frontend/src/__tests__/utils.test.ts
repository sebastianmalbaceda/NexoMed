import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shiftLabel,
  getCurrentShift,
  getShiftWindows,
} from "@/pages/NursePage";
import { getRestrictions } from "@/pages/TCAEPage";
import { parseAllergies, getAllergiesCount } from "@/lib/patientUtils";
import type { Patient } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    dni: "12345678A",
    name: "María",
    surnames: "García López",
    dob: "1975-03-15",
    diagnosis: "Fiebre",
    status: "ESTABLE",
    allergies: [],
    dietRestriction: null,
    isolationRestriction: null,
    mobilityRestriction: null,
    admissionDate: "2025-01-10",
    discharged: false,
    dischargeDate: null,
    bedId: null,
    assignedNurseId: null,
    ...overrides,
  };
}

// ─── shiftLabel ─────────────────────────────────────────────────────────────

describe("shiftLabel", () => {
  it('returns "🌅 Mañana" for hours 7–14', () => {
    expect(shiftLabel(new Date("2025-06-01T07:00:00"))).toBe("🌅 Mañana");
    expect(shiftLabel(new Date("2025-06-01T10:30:00"))).toBe("🌅 Mañana");
    expect(shiftLabel(new Date("2025-06-01T14:59:59"))).toBe("🌅 Mañana");
  });

  it('returns "🌆 Tarde" for hours 15–22', () => {
    expect(shiftLabel(new Date("2025-06-01T15:00:00"))).toBe("🌆 Tarde");
    expect(shiftLabel(new Date("2025-06-01T18:45:00"))).toBe("🌆 Tarde");
    expect(shiftLabel(new Date("2025-06-01T22:59:59"))).toBe("🌆 Tarde");
  });

  it('returns "🌙 Noche" for hours 23–6', () => {
    expect(shiftLabel(new Date("2025-06-01T23:00:00"))).toBe("🌙 Noche");
    expect(shiftLabel(new Date("2025-06-01T02:00:00"))).toBe("🌙 Noche");
    expect(shiftLabel(new Date("2025-06-01T06:59:59"))).toBe("🌙 Noche");
  });
});

// ─── getCurrentShift ────────────────────────────────────────────────────────

describe("getCurrentShift", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'morning' at 08:00", () => {
    vi.setSystemTime(new Date("2025-06-01T08:00:00"));
    expect(getCurrentShift()).toBe("morning");
  });

  it("returns 'afternoon' at 16:00", () => {
    vi.setSystemTime(new Date("2025-06-01T16:00:00"));
    expect(getCurrentShift()).toBe("afternoon");
  });

  it("returns 'night' at 01:00", () => {
    vi.setSystemTime(new Date("2025-06-01T01:00:00"));
    expect(getCurrentShift()).toBe("night");
  });
});

// ─── getShiftWindows ────────────────────────────────────────────────────────

describe("getShiftWindows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns three shift keys", () => {
    vi.setSystemTime(new Date("2025-06-01T10:00:00"));
    const windows = getShiftWindows();
    expect(windows).toHaveProperty("morning");
    expect(windows).toHaveProperty("afternoon");
    expect(windows).toHaveProperty("night");
  });

  it("morning window starts at 07:00 and ends at 14:59:59.999", () => {
    vi.setSystemTime(new Date("2025-06-01T10:00:00"));
    const windows = getShiftWindows();
    expect(windows.morning.start.getHours()).toBe(7);
    expect(windows.morning.start.getMinutes()).toBe(0);
    expect(windows.morning.end.getHours()).toBe(14);
    expect(windows.morning.end.getMinutes()).toBe(59);
  });

  it("afternoon window starts at 15:00 and ends at 22:59:59.999", () => {
    vi.setSystemTime(new Date("2025-06-01T10:00:00"));
    const windows = getShiftWindows();
    expect(windows.afternoon.start.getHours()).toBe(15);
    expect(windows.afternoon.start.getMinutes()).toBe(0);
    expect(windows.afternoon.end.getHours()).toBe(22);
    expect(windows.afternoon.end.getMinutes()).toBe(59);
  });

  it("night window starts at 23:00 and ends next day at 06:59:59.999 (during morning)", () => {
    vi.setSystemTime(new Date("2025-06-01T10:00:00"));
    const windows = getShiftWindows();
    // During morning (00–14): night = yesterday 23:00 → today 06:59
    expect(windows.night.start.getHours()).toBe(23);
    // start should be May 31 (yesterday, since today is June 1)
    expect(windows.night.start.getDate()).toBe(31);
    expect(windows.night.start.getMonth()).toBe(4); // May = 4 (0-indexed)
    expect(windows.night.end.getHours()).toBe(6);
    expect(windows.night.end.getMinutes()).toBe(59);
    expect(windows.night.end.getDate()).toBe(1);
    expect(windows.night.end.getMonth()).toBe(5); // June = 5
  });

  it("night window points to tonight during afternoon", () => {
    vi.setSystemTime(new Date("2025-06-01T16:00:00"));
    const windows = getShiftWindows();
    // During afternoon (15–22): night = tonight 23:00 → tomorrow 06:59
    const today = new Date("2025-06-01T16:00:00");
    expect(windows.night.start.getHours()).toBe(23);
    expect(windows.night.start.getDate()).toBe(today.getDate());
    expect(windows.night.end.getDate()).toBe(today.getDate() + 1);
  });

  it("every window has start < end", () => {
    vi.setSystemTime(new Date("2025-06-01T10:00:00"));
    const windows = getShiftWindows();
    for (const key of ["morning", "afternoon", "night"] as const) {
      expect(windows[key].start.getTime()).toBeLessThan(
        windows[key].end.getTime(),
      );
    }
  });
});

// ─── getRestrictions ────────────────────────────────────────────────────────

describe("getRestrictions", () => {
  it("returns empty array for a stable patient with no issues", () => {
    const p = makePatient({ diagnosis: "Cefalea leve" });
    expect(getRestrictions(p)).toEqual([]);
  });

  it("detects diabetic diet from diagnosis keywords", () => {
    const p = makePatient({ diagnosis: "Diabetes tipo 2" });
    const r = getRestrictions(p);
    expect(
      r.some((x) => x.type === "diet" && x.label === "Dieta diabética"),
    ).toBe(true);
  });

  it("detects hyposodic diet from cardiac/hypertension keywords", () => {
    const p = makePatient({ diagnosis: "Hipertensión arterial" });
    const r = getRestrictions(p);
    expect(
      r.some((x) => x.type === "diet" && x.label === "Dieta hiposódica"),
    ).toBe(true);
  });

  it("detects hypoproteic diet from renal keywords", () => {
    const p = makePatient({ diagnosis: "Insuficiencia renal crónica" });
    const r = getRestrictions(p);
    expect(
      r.some((x) => x.type === "diet" && x.label === "Dieta hipoproteica"),
    ).toBe(true);
  });

  it("flags allergies as diet restriction when no other diet detected", () => {
    const p = makePatient({
      diagnosis: "Cefalea",
      allergies: ["Penicilina"],
    });
    const r = getRestrictions(p);
    expect(
      r.some((x) => x.type === "diet" && x.label.includes("Penicilina")),
    ).toBe(true);
  });

  it("uses explicit diet restriction when present", () => {
    const p = makePatient({
      dietRestriction: "Dieta blanda",
      diagnosis: "Diabetes tipo 2", // would otherwise trigger diabetic
    });
    const r = getRestrictions(p);
    expect(r.some((x) => x.type === "diet" && x.label === "Dieta blanda")).toBe(
      true,
    );
  });

  it("detects contact isolation from infection keywords", () => {
    const p = makePatient({ diagnosis: "Neumonía bacteriana" });
    const r = getRestrictions(p);
    expect(
      r.some(
        (x) => x.type === "isolation" && x.label === "Aislamiento de contacto",
      ),
    ).toBe(true);
  });

  it("detects respiratory isolation from tuberculosis keywords", () => {
    const p = makePatient({ diagnosis: "Tuberculosis pulmonar" });
    const r = getRestrictions(p);
    expect(
      r.some(
        (x) => x.type === "isolation" && x.label === "Aislamiento respiratorio",
      ),
    ).toBe(true);
  });

  it("uses explicit isolation restriction when present", () => {
    const p = makePatient({
      isolationRestriction: "Aislamiento protector",
      diagnosis: "Neutropenia",
    });
    const r = getRestrictions(p);
    expect(
      r.some(
        (x) => x.type === "isolation" && x.label === "Aislamiento protector",
      ),
    ).toBe(true);
  });

  it("detects assisted mobility from fracture/surgery keywords", () => {
    const p = makePatient({ diagnosis: "Fractura de cadera" });
    const r = getRestrictions(p);
    expect(
      r.some(
        (x) => x.type === "mobility" && x.label === "Movilización asistida",
      ),
    ).toBe(true);
  });

  it("detects relative rest from thrombosis keywords", () => {
    const p = makePatient({ diagnosis: "Trombosis venosa profunda" });
    const r = getRestrictions(p);
    expect(
      r.some((x) => x.type === "mobility" && x.label === "Reposo relativo"),
    ).toBe(true);
  });

  it("uses explicit mobility restriction when present", () => {
    const p = makePatient({
      mobilityRestriction: "Reposo absoluto",
      diagnosis: "Fractura de cadera",
    });
    const r = getRestrictions(p);
    expect(
      r.some((x) => x.type === "mobility" && x.label === "Reposo absoluto"),
    ).toBe(true);
  });
});

// ─── parseAllergies ─────────────────────────────────────────────────────────

describe("parseAllergies", () => {
  it("returns empty array for null", () => {
    expect(parseAllergies(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseAllergies(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(parseAllergies([])).toEqual([]);
  });

  it("filters out empty strings", () => {
    expect(parseAllergies(["Penicilina", "", "  ", "Ibuprofeno"])).toEqual([
      "Penicilina",
      "Ibuprofeno",
    ]);
  });

  it("trims whitespace", () => {
    expect(parseAllergies(["  Penicilina  ", " Ibuprofeno "])).toEqual([
      "Penicilina",
      "Ibuprofeno",
    ]);
  });

  it("returns empty when all items are blank/empty after trim", () => {
    expect(parseAllergies(["  ", "", "   "])).toEqual([]);
  });
});

// ─── getAllergiesCount ──────────────────────────────────────────────────────

describe("getAllergiesCount", () => {
  it("returns 0 for null", () => {
    expect(getAllergiesCount(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(getAllergiesCount(undefined)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(getAllergiesCount([])).toBe(0);
  });

  it("counts valid allergies only", () => {
    expect(getAllergiesCount(["Penicilina", "", "Ibuprofeno", "  "])).toBe(2);
  });

  it("returns correct count for single allergy", () => {
    expect(getAllergiesCount(["Penicilina"])).toBe(1);
  });
});
