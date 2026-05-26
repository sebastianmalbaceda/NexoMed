# 🧪 Tests — Frontend NexoMed

> **Total**: 3 suites · 69 tests · 0 fallos  
> **Ejecutar**: `cd frontend && npm run test -- --run`  
> **Framework**: Vitest + Testing Library + jsdom

---

## 📊 Tabla de Tests

| # | Archivo | Tests | Tipo | Qué cubre |
|---|---------|:-----:|------|-----------|
| 1 | `utils.test.ts` | 35 | 🟢 Unitario puro | Funciones de turno, utilidades de pacientes, restricciones TCAE |
| 2 | `validation.test.ts` | 22 | 🟢 Unitario (Zod) | Schemas de validación: login, incidencias, cuidados |
| 3 | `components.test.tsx` | 12 | 🟣 Componente React | ProtectedRoute, ErrorBoundary, Sidebar |

---

## 🔍 Detalle por Archivo

### 1. `utils.test.ts` — 35 tests

**Funciones testeadas:**

| Función | Origen | Tests | Descripción |
|---------|--------|:-----:|-------------|
| `shiftLabel(date)` | NursePage | 5 | Etiqueta de turno según hora: 🌅 Mañana (7-15), 🌆 Tarde (15-23), 🌙 Noche (23-7). Casos borde: 06:59, 07:00, 14:59, 15:00, 22:59, 23:00 |
| `getCurrentShift()` | NursePage | 5 | Devuelve `'morning'`, `'afternoon'`, o `'night'` según la hora actual |
| `getShiftWindows()` | NursePage | 8 | Ventanas de tiempo para los 3 turnos. Verifica que morning es 7-15h, afternoon 15-23h, night cruza medianoche correctamente. **Fix incluido**: en horario nocturno, morning apunta al día siguiente |
| `getRestrictions(patient)` | TCAEPage | 6 | Extrae restricciones del paciente: dieta, aislamiento, movilidad. Paciente con/sin restricciones, valores null |
| `parseAllergies(str)` | patientUtils | 6 | Parsea string de alergias a array: lista normal, string vacío, espacios extra, comas múltiples |
| `getAllergiesCount(str)` | patientUtils | 5 | Cuenta alergias: 0, 1, varias, string vacío, null/undefined |

### 2. `validation.test.ts` — 22 tests

**Schemas Zod testeados:**

| Schema | Tests | Casos |
|--------|:-----:|-------|
| **Login** | 8 | Email válido, email inválido (sin @, sin dominio), password vacío, password corto, campos completos correctos, email vacío, campos null, contraseña numérica |
| **Incident** (`incidentSchema`) | 7 | Todos los tipos válidos (MED_REFUSAL, CARE_INCIDENT, VOMIT_AFTER_MED, SIDE_EFFECT, FALL, OTHER), tipo inválido, descripción vacía, descripción requerida, campos correctos |
| **Care** (`careSchema`) | 7 | Tipos válidos (cura, higiene, balance, ingesta, constante), tipo inválido, valor vacío, valor requerido, notas opcionales, formulario completo con notas, formulario sin notas |

### 3. `components.test.tsx` — 12 tests

**Componentes React testeados:**

| Componente | Tests | Casos |
|-----------|:-----:|-------|
| **ProtectedRoute** | 8 | Renderiza hijos si autenticado y rol permitido, redirige a /login si no autenticado, redirige a /dashboard si rol no autorizado, accede con rol DOCTOR, NURSE, TCAE cada uno a sus rutas, sin restricción de rol renderiza cualquier autenticado, con allowedRoles vacío renderiza si autenticado |
| **ErrorBoundary** | 2 | Renderiza hijos normalmente, captura error y muestra fallback |
| **Sidebar** | 2 | Muestra branding "NexoMed", navegación específica según rol (DOCTOR ve sus enlaces, NURSE ve los suyos) |

---

## 📈 Distribución

| Tipo | Tests | % |
|------|:-----:|:--:|
| 🟢 Unitario puro (funciones) | 35 | 51% |
| 🟢 Unitario (Zod schemas) | 22 | 32% |
| 🟣 Componente React | 12 | 17% |

---

## 🎯 Cobertura de Requisitos SPEC (frontend)

| ID | Requisito | Cubierto por |
|----|-----------|-------------|
| SYS-RF3 | Login + permisos por rol | `validation.test.ts`, `components.test.tsx` (ProtectedRoute) |
| SYS-RF5 | Cronograma turno por enfermero | `utils.test.ts` (getShiftWindows, getCurrentShift) |
| SYS-RF6 | Cronograma por paciente | `utils.test.ts` (shiftLabel) |
| TCAE-RF2 | Alertas restricciones (dieta, aislamiento, movilidad) | `utils.test.ts` (getRestrictions) |
| ENF-RF1 | Pantalla principal enfermero | `utils.test.ts` (parseAllergies, getAllergiesCount) |

---

## ▶️ Cómo ejecutar

```bash
# Ejecución única (CI)
cd frontend
npm run test -- --run

# Modo watch (desarrollo)
npm run test
```
