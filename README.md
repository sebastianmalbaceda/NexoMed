# NexoMed — Plataforma Web de Gestión Clínica Hospitalaria

> Aplicación web centralizada para profesionales sanitarios (Médico/a, Enfermero/a, TCAE) diseñada para eliminar la fragmentación de datos clínicos en entornos hospitalarios.

---

## ¿Qué es NexoMed?

NexoMed resuelve un problema real y crítico: los profesionales sanitarios hospitalarios trabajan hoy con 3 o más aplicaciones desconectadas (SAP, Gacela Care, Silicon). Esto genera errores de registro, duplicidad de información y pérdida de tiempo en los cambios de turno.

NexoMed centraliza toda la gestión clínica (medicación, cuidados, historial, constantes, notificaciones y traspaso de turno) en **un único panel adaptado al rol del profesional**.

---

## Funcionalidades clave

- **Panel unificado por rol** — vistas diferenciadas para Médico, Enfermero y TCAE.
- **Mapa de camas** — visualización en tiempo real de los 24 pacientes de la planta.
- **Gestión de medicación** — visualización, administración y recálculo automático de horarios.
- **Notificaciones en tiempo real** — el enfermero recibe alertas inmediatas al modificar el médico la medicación.
- **Registro de cuidados y constantes** — sin duplicidades, registro único por paciente.
- **Traspaso de turno digitalizado** — informe de turno unificado y cronograma de tareas.
- **Módulo de incidencias** — registro de rechazos de medicación e incidentes de cuidados.
- **Integración con CIMA/AEMPS** — buscador de medicamentos con base de datos oficial.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS + Shadcn UI + Lucide React |
| Formularios | React Hook Form + Zod |
| Estado global | Zustand |
| Cache / API | TanStack Query |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | JWT + bcrypt |
| API externa | CIMA/AEMPS (medicamentos) |

---

## Inicio rápido

### Prerrequisitos

- Node.js >= 20
- PostgreSQL >= 15
- npm >= 10

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/<org>/nexomed.git
cd nexomed

# Instalar dependencias del frontend
cd frontend && npm install

# Instalar dependencias del backend
cd ../backend && npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de base de datos y JWT_SECRET

# Aplicar migraciones de base de datos
npx prisma migrate dev

# Sembrar datos de prueba (opcional)
npm run db:seed
```

### Arrancar en desarrollo

```bash
# Terminal 1 — Backend
cd backend && npm run dev      # Puerto 3001

# Terminal 2 — Frontend
cd frontend && npm run dev     # Puerto 5173
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

**Credenciales de prueba (seed):**
- Enfermero: `enfermero@nexomed.test` / `Test1234!`
- Médico: `medico@nexomed.test` / `Test1234!`
- TCAE: `tcae@nexomed.test` / `Test1234!`

---

## Estructura del repositorio

```
nexomed/
├── frontend/          ← React + Vite (SPA)
├── backend/           ← Node.js + Express (API REST)
├── docs/              ← Documentación técnica extendida
├── .claude/skills/    ← Skills para agentes IA
└── [archivos raíz]    ← README, SPEC, AGENTS, etc.
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [SPEC.md](./SPEC.md) | Requisitos funcionales y no funcionales completos |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Diseño técnico interno del sistema |
| [ROADMAP.md](./ROADMAP.md) | Dirección y milestones del proyecto |
| [PLANNING.md](./PLANNING.md) | Tareas activas por sprint |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Cómo contribuir al proyecto |
| [AGENTS.md](./AGENTS.md) | Instrucciones para agentes IA |

---

## Equipo

| Nombre | NIU | Rol |
|--------|-----|-----|
| Raúl Mancebo González | 1706826 | Scrum Master (Sprint 1) · Frontend Dev · UX Designer |
| Irene Carmona Lorenzo | 1708365 | Frontend Dev · UX Designer |
| Cristina Ferrer De Juan | 1666431 | Frontend Dev · UX Designer |
| Xiang Feng Wang | 1674571 | Backend Dev · DB Architect |
| Cristian Mendiola Fuentes | 1666420 | Backend Dev · DB Architect |
| Sebastian Malbaceda Leyva | 1681519 | Product Owner (Sprint 1) · Backend Dev · DB Architect |

---

## Asignatura

**Laboratori Integrat de Software (LIS)** — Universitat Autònoma de Barcelona (UAB)

---

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.
