---
name: generate-tests
description: |
  Usar cuando la tarea implica escribir, generar o corregir tests en el proyecto NexoMed.
  Triggers: "escribe tests para", "genera tests de", "añade test coverage a", "test del endpoint", "test del componente".
  NO usar para tareas de implementación de features que no mencionan tests.
---

# Skill: Generar Tests en NexoMed

## 1. Contexto del proyecto

- **Backend tests:** Jest + Supertest (tests de integración de endpoints)
- **Frontend tests:** Vitest + Testing Library (tests de componentes)
- Archivos backend: `backend/src/__tests__/[entidad].test.ts`
- Archivos frontend: `frontend/src/__tests__/[componente].test.tsx`
- Ejecutar backend: `cd backend && npm run test`
- Ejecutar frontend: `cd frontend && npm run test`

---

## 2. Tests de Backend (Jest + Supertest)

### Estructura obligatoria por endpoint

```typescript
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prismaClient';

describe('[MÉTODO] /api/[ruta]', () => {
  
  beforeEach(async () => {
    // Limpiar datos de prueba
    await prisma.medicación.deleteMany({ where: { patientId: 'test-patient-id' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('debería devolver 200 con datos válidos y autenticación correcta', async () => {
    const res = await request(app)
      .get('/api/ruta')
      .set('Authorization', `Bearer ${validNurseToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('debería devolver 401 sin token de autenticación', async () => {
    const res = await request(app).get('/api/ruta');
    expect(res.status).toBe(401);
  });

  it('debería devolver 403 si el rol no tiene permisos', async () => {
    const res = await request(app)
      .post('/api/ruta-solo-medico')
      .set('Authorization', `Bearer ${tcaeToken}`);
    expect(res.status).toBe(403);
  });

  it('debería devolver 400 con body de request inválido', async () => {
    const res = await request(app)
      .post('/api/ruta')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ campoRequerido: undefined });
    expect(res.status).toBe(400);
  });
});
```

### Casos de test obligatorios para CADA endpoint

1. **Happy path** — petición válida, auth correcta, rol correcto
2. **Sin auth** → 401
3. **Rol incorrecto** → 403 (si el endpoint tiene restricción de rol)
4. **Validación fallida** → 400 con mensaje descriptivo
5. **Recurso no encontrado** → 404 (si aplica)
6. **Conflicto de negocio** → 409 (ej: anti-duplicidad de CareRecord)

### Tokens de prueba (helpers)

Crear `backend/src/__tests__/helpers/auth.ts`:
```typescript
import jwt from 'jsonwebtoken';

export const nurseToken = jwt.sign(
  { id: 'test-nurse-id', role: 'NURSE' },
  process.env.JWT_SECRET!,
  { expiresIn: '8h' }
);

export const doctorToken = jwt.sign(
  { id: 'test-doctor-id', role: 'DOCTOR' },
  process.env.JWT_SECRET!,
  { expiresIn: '8h' }
);

export const tcaeToken = jwt.sign(
  { id: 'test-tcae-id', role: 'TCAE' },
  process.env.JWT_SECRET!,
  { expiresIn: '8h' }
);
```

---

## 3. Tests de Frontend (Vitest + Testing Library)

### Cuándo escribir tests de frontend

Solo para componentes con lógica de negocio relevante (no para componentes puramente visuales).
Componentes prioritarios: `BedMap`, `MedicalSchedule`, `QuickActions`, formularios de administración de medicación.

### Estructura básica

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BedMap from '../components/BedMap';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('BedMap', () => {
  it('debería mostrar las 24 camas de la planta', () => {
    render(<BedMap />, { wrapper });
    expect(screen.getAllByTestId('bed-cell')).toHaveLength(24);
  });

  it('debería mostrar el nombre del paciente en camas ocupadas', async () => {
    // mock de TanStack Query con datos de prueba
    render(<BedMap />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('García López, María')).toBeInTheDocument();
    });
  });
});
```

---

## 4. Reglas de negocio a probar específicamente

Estos comportamientos son críticos y deben tener test dedicado:

- **Recálculo de horarios** (`PUT /api/patients/:id/medications/:medId`): al cambiar `startTime`, verificar que los MedSchedules pendientes se recalculan correctamente.
- **Notificación obligatoria**: al prescribir medicación (DOCTOR), verificar que se crea una Notification para el NURSE asignado.
- **Anti-duplicidad CareRecord**: dos registros del mismo `type` en < 15 min → 409.
- **Expiración de token**: petición con token expirado → 401 (no 403).
- **Acceso por rol al historial**: TCAE intentando acceder al historial clínico completo → 403.

---

## 5. Convenciones de nombres

- Nombres de tests en **español** (consistencia con el equipo).
- Formato: `'debería [comportamiento esperado] cuando [condición]'`
- Ejemplos:
  - `'debería devolver 409 cuando se registra la misma constante en menos de 15 minutos'`
  - `'debería emitir notificación al enfermero cuando el médico prescribe medicación'`
  - `'debería recalcular los horarios del día al cambiar la hora de administración'`
