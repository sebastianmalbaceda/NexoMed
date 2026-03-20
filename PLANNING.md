# PLANNING.md — Tareas Activas NexoMed

> Actualizado: Marzo 2026 | Sprint actual: **Sprint 1 — Cimientos y Setup**

---

## Instrucciones para agentes IA

Este archivo es la fuente de verdad del estado de implementación. Antes de escribir código, lee este archivo para saber qué está hecho, qué está en curso y qué queda pendiente. Al completar una tarea, márcala con `[x]`. Al encontrar una tarea bloqueada, añade `⚠️ BLOQUEADA:` con la razón.

---

## Sprint 1 — Cimientos y Setup

### ✅ Completado

- [x] Firma del contrato y definición del alcance del proyecto
- [x] Creación de la presentación inicial del proyecto (NexoMed)
- [x] Definición de la arquitectura técnica y selección del stack
- [x] Prototipo visual inicial en Figma Make

### 🔄 En Progreso

- [ ] **[RAÚL / IRENE / CRISTINA]** Setup del repositorio de frontend (React 18 + Vite + TypeScript + Tailwind + Shadcn UI)
  - Inicializar proyecto con `npm create vite@latest`
  - Configurar Tailwind CSS + Shadcn UI
  - Instalar dependencias: React Router DOM v6, TanStack Query, Zustand, React Hook Form, Zod, Lucide React
  - Configurar ESLint + Prettier + Husky (pre-commit)
  - Crear estructura de carpetas base: `pages/`, `components/`, `hooks/`, `store/`, `lib/`
  - Crear rama `sprint-1` en GitHub y proteger `main`

- [ ] **[XIANG / CRISTIAN / SEBASTIAN]** Setup del repositorio de backend (Node.js + Express + TypeScript)
  - Inicializar proyecto Node.js con TypeScript
  - Instalar dependencias: Express, Prisma, jsonwebtoken, bcrypt, cors, dotenv
  - Configurar ESLint + Prettier + Husky
  - Crear estructura de carpetas: `routes/`, `controllers/`, `middleware/`, `services/`, `prisma/`
  - Crear `.env.example` con variables requeridas

### 📋 Pendiente (Sprint 1)

- [ ] **[XIANG / CRISTIAN]** Modelado completo de la base de datos con Prisma
  - Definir `schema.prisma` con todos los modelos: User, Patient, Bed, Medication, MedSchedule, CareRecord, Notification, Incident, DiagnosticTest
  - Aplicar primera migración: `npx prisma migrate dev --name init`
  - Crear script de seed con datos de prueba (1 médico, 2 enfermeros, 1 TCAE, 6 pacientes, 6 camas)

- [ ] **[SEBASTIAN]** Implementación de autenticación JWT
  - Endpoint `POST /api/auth/login` — validar credenciales, devolver JWT
  - Endpoint `POST /api/auth/logout` — invalidar sesión cliente
  - Endpoint `GET /api/auth/me` — retornar datos del usuario autenticado
  - Middleware `auth.middleware.ts` — verificar JWT en cabecera Authorization
  - Middleware `role.middleware.ts` — guard de permisos por rol (NURSE, DOCTOR, TCAE)

- [ ] **[RAÚL]** Implementar pantalla de Login en el frontend
  - Formulario con React Hook Form + Zod (validación de email y contraseña)
  - Integración con `POST /api/auth/login`
  - Almacenamiento del token en Zustand (authStore)
  - Redirección al dashboard correspondiente según rol tras login exitoso
  - Manejo de errores (credenciales inválidas, servidor caído)

- [ ] **[TODO EL EQUIPO]** Revisión y validación del sprint 1 con el profesor

---

## Sprint 2 — Core Clínico (Próximo)

### Pendiente (no iniciar hasta completar Sprint 1)

- [ ] Panel principal del Enfermero (DashboardOverview)
  - Lista de pacientes asignados con nombre, habitación, alertas activas
  - Acceso rápido a ficha del paciente en ≤ 2 clics
  - Medicación pendiente del turno con botón "Administrar"

- [ ] Componente BedMap — Mapa de camas
  - Grid de 12 habitaciones × 2 camas = 24 celdas
  - Estado visual: cama libre (blanco), ocupada (color por alerta), en limpieza
  - Modal de alta de paciente: asignar nombre, diagnóstico, alergias a cama libre
  - Modal de baja: liberar cama con confirmación

- [ ] Ficha del paciente (PatientDetailPage)
  - Datos generales: nombre, edad, diagnóstico, motivo de ingreso
  - Alergias con badge de alerta roja
  - Constantes vitales recientes (últimas 24h)
  - Medicación activa del día con estado (pendiente / administrada)
  - Cuidados del turno actual

- [ ] Módulo de medicación del enfermero
  - Lista de pautas del paciente con horario programado
  - Botón "Administrar" → registra MedSchedule con timestamp y usuario
  - Botón "Cambiar hora" → modal con nuevo horario → recálculo automático del servidor

- [ ] Registro de cuidados y constantes (CareRecord)
  - Formulario por tipo: constante (PA, FC, SpO2, temperatura, glucemia), cura, higiene
  - Validación anti-duplicidad: aviso si mismo tipo < 15 min

- [ ] Registro básico TCAE
  - Registro de higiene y alimentación
  - Visualización de historial de turnos anteriores

- [ ] Conexión inicial con API CIMA (servicio proxy en backend)

---

## Sprint 3 — Visualización e Incidencias (Futuro)

- [ ] Notificaciones en tiempo real (polling TanStack Query cada 5s)
- [ ] Panel médico completo (historial, prescripción, pruebas)
- [ ] Prescripción de medicación → genera tarea en enfermero + notificación
- [ ] Cronograma MedicalSchedule (SYS-RF5, SYS-RF6)
- [ ] Módulo de incidencias (SYS-RF8)
- [ ] Alertas de restricciones para TCAE

---

## Sprint 4 — Pulido Final (Futuro)

- [ ] Testing integrado (Jest + Supertest para API crítica)
- [ ] UX refinement completo
- [ ] Documentación Swagger de la API
- [ ] READMEs de frontend y backend
- [ ] Preparación DEMO final

---

## Bloqueadores Activos

_Ninguno en este momento._

---

## Preguntas Abiertas

1. ¿El polling de notificaciones cada 5 segundos es aceptable para el profesor como implementación de "tiempo real" en el MVP? → Confirmar en revisión Sprint 1.
2. ¿Los datos del seed de prueba deben incluir pacientes con medicación ya administrada (turnos anteriores) para demostrar el historial?
3. ¿La integración CIMA se presentará como funcionalidad activa en el Sprint 2 o se puede dejar como mock para ese sprint y activar en Sprint 3?
