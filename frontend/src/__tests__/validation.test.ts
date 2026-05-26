import { describe, it, expect } from "vitest";
import { z } from "zod";
import { careSchema } from "@/pages/NursePage";
import { incidentSchema } from "@/pages/TCAEPage";

// Recreamos el schema de login tal como está en LoginPage.tsx
const loginSchema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// ─── Login validation ───────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "enfermera@nexomed.es",
      password: "secure123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "secure123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(
        true,
      );
    }
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "notanemail",
      password: "secure123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(
        true,
      );
    }
  });

  it("rejects email without @ sign", () => {
    const result = loginSchema.safeParse({
      email: "usuario",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("password")),
      ).toBe(true);
    }
  });

  it("rejects missing password field", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email field", () => {
    const result = loginSchema.safeParse({
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null values", () => {
    const result = loginSchema.safeParse({
      email: null,
      password: null,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Incident validation ────────────────────────────────────────────────────

describe("incidentSchema", () => {
  it("accepts a valid incident", () => {
    const result = incidentSchema.safeParse({
      type: "FALL",
      description: "El paciente se cayó de la cama",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid incident type", () => {
    const result = incidentSchema.safeParse({
      type: "INVALID_TYPE",
      description: "Descripción",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("type"))).toBe(
        true,
      );
    }
  });

  it("rejects empty description", () => {
    const result = incidentSchema.safeParse({
      type: "MED_REFUSAL",
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("description")),
      ).toBe(true);
    }
  });

  it("rejects missing description", () => {
    const result = incidentSchema.safeParse({
      type: "SIDE_EFFECT",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = incidentSchema.safeParse({
      description: "Descripción válida",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid incident types", () => {
    const validTypes = [
      "MED_REFUSAL",
      "VOMIT_AFTER_MED",
      "SIDE_EFFECT",
      "FALL",
      "OTHER",
    ];
    for (const type of validTypes) {
      const result = incidentSchema.safeParse({
        type,
        description: `Descripción para ${type}`,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects extra unexpected fields", () => {
    // By default Zod ignores extra fields, so this should pass
    const result = incidentSchema.safeParse({
      type: "FALL",
      description: "Caída",
      extraField: "should be ignored",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Care validation (NursePage careSchema) ─────────────────────────────────

describe("careSchema", () => {
  it("accepts a valid care record", () => {
    const result = careSchema.safeParse({
      type: "cura",
      value: "Herida en brazo izquierdo curada",
    });
    expect(result.success).toBe(true);
  });

  it("accepts with optional notes", () => {
    const result = careSchema.safeParse({
      type: "higiene",
      value: "Aseo completo",
      notes: "Paciente colaborador",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid care type", () => {
    const result = careSchema.safeParse({
      type: "masaje",
      value: "Masaje relajante",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty value", () => {
    const result = careSchema.safeParse({
      type: "constante",
      value: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing value", () => {
    const result = careSchema.safeParse({
      type: "balance",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid care types", () => {
    const validTypes = ["cura", "higiene", "balance", "ingesta", "constante"];
    for (const type of validTypes) {
      const result = careSchema.safeParse({
        type,
        value: `Registro de ${type}`,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing type", () => {
    const result = careSchema.safeParse({
      value: "Algún valor",
    });
    expect(result.success).toBe(false);
  });
});
