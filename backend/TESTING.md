# 🧪 Tests — Backend NexoMed

> **Total**: 13 suites · 84 tests · 0 fallos  
> **Ejecutar**: `cd backend && npm run test`  
> **Modo**: `--runInBand` (secuencial, BD compartida)

---

## 📊 Tabla de Tests

| # | Archivo | Tests | Tipo | Endpoints | Cobertura SPEC |
|---|---------|:-----:|------|-----------|----------------|
| 1 | `auth.test.ts` | 4 | 🔴 Integración BD real | `POST /api/auth/login` | SYS-RF3 |
| 2 | `authorization.test.ts` ⭐ | 30 | 🔴 Integración BD real | `POST /medications`, `PUT .../deactivate`, `POST .../administer`, `POST /patients`, `PUT .../discharge`, `POST /cares` | SYS-RF1, SYS-RF3, SYS-RF4, MED-RF2, ENF-RF2, TCAE-RF1, TCAE-RF3 |
| 3 | `beds.test.ts` | 2 | 🔴 Integración BD real | `GET /api/beds`, `PUT /api/beds/:id/assign` | SYS-RF4 |
| 4 | `careRecords.test.ts` | 3 | 🔴 Integración BD real | `POST /api/cares` | SYS-RF2, ENF-RF4, TCAE-RF1 |
| 5 | `diagnosticTests.test.ts` | 2 | 🟢 Unitario (mocks) | `GET /api/tests`, `GET /api/tests/:patientId` | SYS-RF7, MED-RF3 |
| 6 | `drugs.test.ts` | 5 | 🔴 Integración BD real | `GET /api/drugs/search`, `GET /api/drugs/:nregistro` | MED-RF2 (CIMA) |
| 7 | `incidents.test.ts` | 6 | 🔴 Integración BD real | `GET /api/incidents`, `GET .../:patientId`, `POST /api/incidents` | SYS-RF8, TCAE-RF3 |
| 8 | `medicationSchedule.test.ts` ⭐ | 11 | 🔴 Integración BD real | `PUT .../schedule`, `POST .../administer`, `PUT .../deactivate` | SYS-RF1, ENF-RF2, ENF-RF3, MED-RF2 |
| 9 | `medications.test.ts` | 3 | 🔴 Integración BD real | `GET /api/medications/:patientId`, `POST /api/medications` | SYS-RF1, MED-RF2 |
| 10 | `notifications.test.ts` | 6 | 🔴 Integración BD real | `GET /api/notifications`, `PUT .../:id/read`, `PUT .../read-all`, `GET .../stream` (SSE) | ENF-RF3, MED-RF2 |
| 11 | `patients.test.ts` | 3 | 🔴 Integración BD real | `GET /api/patients`, `GET /api/patients/:id` | SYS-RF3, SYS-RF4 |
| 12 | `schedule.test.ts` | 4 | 🟢 Unitario (mocks) | `GET /api/schedule?date=&shift=&nurseId=` | SYS-RF5, SYS-RF6 |
| 13 | `users.test.ts` | 3 | 🔴 Integración BD real | `GET /api/users/nurses` | SYS-RF5 |

---

## 🔍 Detalle por Archivo

### 1. `auth.test.ts` — 4 tests
Autenticación JWT: login con credenciales válidas, email inválido, password faltante, credenciales incorrectas.

### 2. `authorization.test.ts` ⭐ — 30 tests
**Control de acceso exhaustivo por rol (DOCTOR / NURSE / TCAE / sin token):**
- **Prescribir medicación**: DOCTOR ✅ | NURSE ❌ 403 | TCAE ❌ 403
- **Suspender medicación**: DOCTOR ✅ | NURSE ❌ 403 | TCAE ❌ 403
- **Administrar dosis**: NURSE/DOCTOR ✅ (en turno) | NURSE ❌ 403 (fuera de turno) | TCAE ❌ 403
- **Alta de paciente**: DOCTOR ✅ | NURSE ✅ | TCAE ❌ 403
- **Baja de paciente**: DOCTOR ✅ | NURSE ✅ | TCAE ❌ 403
- **Registrar cuidados**: DOCTOR ✅ | NURSE ✅ | TCAE ✅
- **Sin token → 401** en 8 endpoints distintos
- **TCAE → 403** en endpoints de DOCTOR y NURSE

### 3. `beds.test.ts` — 2 tests
Mapa de camas: listado ordenado (≥6 camas del seed), validación de patientId obligatorio al asignar.

### 4. `careRecords.test.ts` — 3 tests
Registro de cuidados: creación exitosa (201), anti-duplicidad 15 min (409), acceso TCAE permitido.

### 5. `diagnosticTests.test.ts` — 2 tests
Pruebas diagnósticas: vista global con filtros (status/type/fecha), vista por paciente con serialización correcta.

### 6. `drugs.test.ts` — 5 tests
API CIMA/AEMPS: búsqueda de medicamentos, validación de término (≥2 chars), protección auth, consulta por nº registro, tolerancia a fallos de CIMA.

### 7. `incidents.test.ts` — 6 tests
Incidencias: listado global, listado por paciente (existente e inexistente), creación con campos obligatorios, protección 401.

### 8. `medicationSchedule.test.ts` ⭐ — 11 tests
**Reglas de negocio críticas:**
- **Recálculo de horarios**: cambiar `startTime` recalcula pendientes sin alterar administrados
- **Notificación**: recalcular y suspender generan notificación al enfermero asignado
- **Administrar**: marcar dosis (200), doble administración (409), fuera de turno (403), medicación suspendida (409)
- **Suspender**: DOCTOR sí (200), NURSE no (403), elimina horarios pendientes

### 9. `medications.test.ts` — 3 tests
Medicación: listado de activas por paciente, campos obligatorios (400), restricción NURSE (403).

### 10. `notifications.test.ts` — 6 tests
Notificaciones: listado por usuario, marcar leída (404/200), marcar todas leídas, SSE stream con token.

### 11. `patients.test.ts` — 3 tests
Pacientes: listado con auth (200), protección 401, paciente inexistente (404).

### 12. `schedule.test.ts` — 4 tests
Cronograma: agregación medication + careRecord ordenados, turno inválido (400), filtro nurseId propagado a Prisma, UUID inválido (400).

### 13. `users.test.ts` — 3 tests
Usuarios: listado de enfermeros, estructura correcta, protección 401.

---

## 📈 Tipos de Test

| Tipo | Archivos | Tests | % |
|------|:--------:|:-----:|:--:|
| 🔴 Integración BD real | 11 | 78 | 93% |
| 🟢 Unitario con mocks | 2 | 6 | 7% |

---

## 🎯 Cobertura de Requisitos SPEC

| ID | Requisito | Cubierto por |
|----|-----------|-------------|
| SYS-RF1 | Pauta médica, administrar, recálculo horarios | `medications`, `medicationSchedule`, `authorization` |
| SYS-RF2 | Curas, constantes, anti-duplicidad | `careRecords` |
| SYS-RF3 | Login por rol, permisos personalizados | `auth`, `authorization`, `patients` |
| SYS-RF4 | Mapa de camas, altas/bajas | `beds`, `patients`, `authorization` |
| SYS-RF5 | Cronograma turno por enfermero | `schedule`, `users` |
| SYS-RF6 | Cronograma por paciente | `schedule` |
| SYS-RF7 | Pruebas diagnósticas | `diagnosticTests` |
| SYS-RF8 | Módulo de incidencias | `incidents` |
| ENF-RF1 | Pantalla principal enfermero | `patients` (datos) |
| ENF-RF2 | Cambiar hora con recálculo | `medicationSchedule` |
| ENF-RF3 | Notificación cambio medicación | `medicationSchedule`, `notifications` |
| ENF-RF4 | Registrar cuidados sin duplicar | `careRecords` |
| MED-RF1 | Historial clínico centralizado | `patients` |
| MED-RF2 | Prescribir/retirar + notificar | `medicationSchedule`, `medications`, `authorization` |
| MED-RF3 | Programar pruebas diagnósticas | `diagnosticTests` |
| TCAE-RF1 | Registro higiene/ingesta/balance | `careRecords`, `authorization` |
| TCAE-RF2 | Alertas de restricciones | Frontend (`utils.test.ts`) |
| TCAE-RF3 | Ver estado medicación + incidencias | `authorization`, `incidents` |
| TCAE-RF4 | Historial constantes turnos anteriores | `careRecords` |
