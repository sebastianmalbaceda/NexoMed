import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/hospital/Sidebar";

// ─── Mock auth store ────────────────────────────────────────────────────────

const mockIsAuthenticated = vi.fn();
let _user: {
  id: string;
  name: string;
  role: import("@/lib/types").Role;
} | null = {
  id: "u1",
  name: "Test Nurse",
  role: "NURSE",
};

vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: _user,
  }),
}));

// Helpers to change mock user between tests
function setMockUser(
  user: { id: string; name: string; role: import("@/lib/types").Role } | null,
) {
  _user = user;
}

// Clean DOM between tests to avoid accumulated renders
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── ProtectedRoute ─────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
  it("renders children when authenticated and no role restriction", () => {
    mockIsAuthenticated.mockReturnValue(true);
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <p>Protected Content</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Protected Content")).toBeTruthy();
  });

  it("redirects to /login when not authenticated", () => {
    mockIsAuthenticated.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <p>Protected Content</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    // Navigate redirects away, children should NOT be in the DOM
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children when user role is in allowedRoles", () => {
    mockIsAuthenticated.mockReturnValue(true);
    setMockUser({ id: "u1", name: "Test Nurse", role: "NURSE" });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["NURSE", "DOCTOR"]}>
          <p>Nurse Content</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Nurse Content")).toBeTruthy();
  });

  it("redirects to /dashboard when user role is not in allowedRoles", () => {
    mockIsAuthenticated.mockReturnValue(true);
    setMockUser({ id: "u1", name: "Test Nurse", role: "NURSE" });
    render(
      <MemoryRouter initialEntries={["/doctor"]}>
        <ProtectedRoute allowedRoles={["DOCTOR"]}>
          <p>Doctor Only Content</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    // Navigate redirects to /dashboard, children should not be visible
    expect(screen.queryByText("Doctor Only Content")).toBeNull();
  });
});

// ─── ErrorBoundary ──────────────────────────────────────────────────────────

// Component that throws an error
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <p>All good</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeTruthy();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Should show the error message
    expect(screen.getByText("Algo salió mal")).toBeTruthy();
    expect(screen.getByText("Test error message")).toBeTruthy();
    expect(screen.getByText("Recargar página")).toBeTruthy();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>Custom error UI</p>}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error UI")).toBeTruthy();
    expect(screen.queryByText("Algo salió mal")).toBeNull();
  });
});

// ─── Sidebar ────────────────────────────────────────────────────────────────

describe("Sidebar", () => {
  beforeEach(() => {
    setMockUser({ id: "u1", name: "Test Nurse", role: "NURSE" });
  });

  it("renders the NexoMed branding", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("NexoMed")).toBeTruthy();
    expect(screen.getByText("Gestión Clínica")).toBeTruthy();
  });

  it("renders navigation items for NURSE role", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    // By default mockUser is NURSE, so nurse-specific items should appear
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Vista Enfermero")).toBeTruthy();
    expect(screen.getByText("Mapa de Camas")).toBeTruthy();
    // Doctor-only item should NOT be visible for NURSE
    expect(screen.queryByText("Vista Médico")).toBeNull();
  });

  it("shows doctor-only items when user is DOCTOR", () => {
    setMockUser({ id: "u2", name: "Test Doctor", role: "DOCTOR" });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    // Doctor should see both patient-related and doctor-only items
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Vista Médico")).toBeTruthy();
    expect(screen.queryByText("Vista Enfermero")).toBeNull();
  });

  it("renders hospital info section", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Planta Única")).toBeTruthy();
    expect(screen.getByText("12 hab. · 24 camas")).toBeTruthy();
  });

  it("renders the menu section heading", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Menú")).toBeTruthy();
  });
});
