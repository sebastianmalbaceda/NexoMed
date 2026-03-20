# AGENTS.md — Instrucciones para Agentes IA en NexoMed

> Este archivo es leído automáticamente por agentes IA (Claude Code, Copilot, Cursor, etc.).
> Contiene todo lo que un agente necesita para trabajar en este proyecto sin necesitar decisiones de diseño adicionales.

---

## Proyecto

**NexoMed** — Aplicación web de gestión clínica hospitalaria.
Proyecto académico de la asignatura LIS (Laboratori Integrat de Software) — UAB 2026.

---

## Comandos de Build y Test

```bash
# --- FRONTEND ---
cd frontend
npm install           # instalar dependencias
npm run dev           # servidor de desarrollo (puerto 5173)
npm run build         # build de producción
npm run lint          # ESLint + Prettier check
npm run test          # Vitest (tests de componentes)

# --- BACKEND ---
cd backend
npm install           # instalar dependencias
npm run dev           # servidor de desarrollo con hot-reload (puerto 3001)
npm run build         # compilar TypeScript
npm run lint          # ESLint check
npm run test          # Jest + Supertest
npm run db:migrate    # npx prisma migrate dev
npm run db:seed       # poblar con datos de prueba
npm run db:studio     # abrir Prisma Studio (GUI de la DB)
```

---

## Stack Tecnológico (versiones exactas)

### Frontend
- **React 18** + Vite 5 + TypeScript 5.4
- Tailwind CSS 3 + Shadcn UI + Lucide React
- React Router DOM v6
- TanStack Query v5 (data fetching y caché)
- Zustand (estado global: sesión, token, rol)
- React Hook Form + Zod (formularios y validación)

### Backend
- **Node.js 20** + Express 4 + TypeScript 5.4
- PostgreSQL 15 + Prisma ORM 5
- jsonwebtoken + bcrypt + cors

### Herramientas
- ESLint + Prettier + Husky (pre-commit)
- GitHub (estrategia de ramas por sprint + feature)
- Jira (SCRUM — Sprint Backlog + Kanban)

---

## Estructura del Repositorio

```
nexomed/
├── frontend/src/app/
│   ├── components/        ← Componentes React (un archivo por componente, PascalCase)
│   │   ├── ui/            ← Shadcn UI (no modificar directamente)
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── BedMap.tsx
│   │   ├── DashboardOverview.tsx
│   │   ├── MedicalSchedule.tsx
│   │   ├── DiagnosticTests.tsx
│   │   ├── ShiftReport.tsx
│   │   ├── UnifiedHistory.tsx
│   │   ├── RealtimeNotifications.tsx
│   │   └── QuickActions.tsx
│   ├── pages/             ← Páginas de nivel superior (una por ruta)
│   ├── hooks/             ← Custom hooks (prefijo "use")
│   ├── store/             ← Zustand stores (authStore, notificationStore)
│   └── lib/               ← Helpers, instancia axios, constantes
├── backend/src/
│   ├── routes/            ← Definición de endpoints por entidad
│   ├── controllers/       ← Solo orquestación (lógica → services)
│   ├── middleware/        ← auth.middleware.ts, role.middleware.ts
│   ├── services/          ← Lógica de negocio (recálculo, notificaciones, CIMA)
│   └── prisma/            ← schema.prisma + migraciones
├── SPEC.md                ← Fuente de verdad de requisitos
├── ARCHITECTURE.md        ← Diseño técnico del sistema
├── PLANNING.md            ← Tareas activas (leer antes de escribir código)
└── .claude/skills/        ← Skills de procedimientos específicos
```

---

## Convenciones de Código

### Frontend
- Componentes: PascalCase, un archivo por componente.
- Hooks: camelCase con prefijo `use` (ej. `usePatientData`).
- Stores Zustand: sufijo `Store` (ej. `authStore`).
- Importaciones: usar alias `@/` (ej. `import { Button } from '@/components/ui/button'`).
- Formularios: **siempre** React Hook Form + Zod. Nunca `useState` para gestionar formularios.
- Fetching: **siempre** TanStack Query. Nunca `useEffect` + `fetch` manual.
- Estilos: **solo** clases Tailwind. Sin CSS en línea.
- TypeScript: **sin `any`** sin justificación en comentario.

### Backend
- Controllers: delegar lógica a `services/`. Máximo 20 líneas por controlador.
- Services: toda la lógica de negocio. Tests unitarios obligatorios.
- Errores HTTP: 400 (validación), 401 (sin auth), 403 (sin permiso), 404 (no encontrado), 409 (conflicto), 500 (error servidor).
- Middleware auth: adjunta `req.user = { id, role }` tras verificar JWT.
- Variables de entorno: acceder via `process.env.NOMBRE`. Nunca hardcodear secretos.

### Git
- Ramas: `feature/NXM-XX-descripcion` o `fix/NXM-XX-descripcion`
- Commits: Conventional Commits — `feat(componente): descripción en imperativo`
- PRs: título `[NXM-XX] Descripción`; 1 aprobación mínima para mergear

---

## Roles y Permisos (importante para guards)

| Rol | Enum Prisma | Puede hacer |
|-----|------------|-------------|
| Enfermero/a | `NURSE` | Ver pacientes, administrar medicación, registrar cuidados, ver notificaciones |
| Médico/a | `DOCTOR` | Todo lo anterior + prescribir/retirar medicación, programar pruebas, historial completo |
| TCAE | `TCAE` | Ver pacientes (vista reducida), registrar higiene/alimentación/constantes, ver alertas |

---

## API REST — Patrones

- Base URL: `http://localhost:3001/api`
- Auth: header `Authorization: Bearer <token>`
- Todas las respuestas: JSON con estructura `{ data: ..., error?: string }`
- Paginación donde corresponda: `?page=1&limit=20`
- Filtros por query params: `?role=NURSE`, `?patientId=xxx`

---

## Reglas de Negocio Críticas (no violar)

1. **Recálculo de horarios**: al cambiar `startTime` de una medicación activa, el servicio `medication.service.ts` recalcula todos los `MedSchedule` pendientes del día sin alterar los ya administrados (`administeredAt != null`).
2. **Notificación obligatoria**: toda creación, modificación o eliminación de medicación activa por un DOCTOR genera una Notification para el NURSE asignado al paciente.
3. **Anti-duplicidad**: el backend rechaza un nuevo `CareRecord` del mismo `type` para el mismo `patientId` si existe uno en los últimos 15 minutos. Devuelve 409 con mensaje descriptivo.
4. **Tokens de sesión**: expiración de 8 horas (duración de un turno). El frontend debe manejar el 401 redirigiendo al login.

---

## Boundaries — Qué SIEMPRE hacer / NUNCA hacer

### SIEMPRE
- Leer `PLANNING.md` antes de empezar cualquier tarea de código.
- Validar con Zod en backend **y** frontend antes de usar datos externos.
- Añadir toda variable de entorno nueva a `.env.example` con comentario descriptivo.
- Ejecutar `npm run lint` antes de hacer commit.
- Marcar la tarea como completada en `PLANNING.md` al terminar.

### PREGUNTAR PRIMERO
- Añadir nuevas dependencias de producción (npm packages).
- Modificar el esquema de Prisma (impacta migraciones de todos).
- Cambiar la estructura de carpetas del proyecto.
- Implementar WebSockets o cambiar el mecanismo de notificaciones.
- Añadir nuevos roles de usuario.

### NUNCA
- Subir archivos `.env` o secretos al repositorio.
- Escribir SQL crudo sin justificación en comentario.
- Usar `localStorage` para guardar el token JWT.
- Usar `any` en TypeScript sin comentario que explique por qué.
- Modificar componentes en `components/ui/` (Shadcn) directamente — crear wrappers.
- Hacer push directo a `main`.
- Usar datos reales de pacientes en el seed o en los tests.
- Integrar con sistemas hospitalarios reales.

---

## Variables de Entorno Requeridas

```bash
# .env (backend)
DATABASE_URL="postgresql://user:password@localhost:5432/nexomed"
JWT_SECRET="tu_secreto_muy_seguro_min_32_chars"
JWT_EXPIRES_IN="8h"
PORT=3001
CORS_ORIGIN="http://localhost:5173"

# .env (frontend)
VITE_API_URL="http://localhost:3001/api"
```

---

## Skills Disponibles

Carga el skill apropiado antes de realizar tareas especializadas:

- `.claude/skills/generate-tests/SKILL.md` — para escribir tests del proyecto
- `.claude/skills/create-api-endpoint/SKILL.md` — para crear nuevos endpoints REST
- `.claude/skills/code-review/SKILL.md` — para revisar código del proyecto
