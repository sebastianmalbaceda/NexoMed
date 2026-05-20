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
| Frontend | React 19 + Vite 8 + TypeScript 5.9 |
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
git clone https://github.com/sebastianmalbaceda/nexomed.git
cd nexomed

# Instalar dependencias — frontend
cd frontend
npm install

# Instalar dependencias — backend
cd ../backend
npm install
```

### Configurar variables de entorno

> ✅ **Nota:** Los archivos `.env` ya vienen en el repositorio con la configuración compartida.
> Si ya existen, **puedes omitir este paso**. Solo ejecútalo si por alguna razón faltan.

```bash
# Backend (omitir si backend/.env ya existe)
cp backend/.env.example backend/.env

# Frontend (omitir si frontend/.env ya existe)
cp frontend/.env.example frontend/.env
```

### Base de datos

Elige **una** de estas opciones según tu situación:

#### Opción A — Primera vez del equipo (BD nueva o vacía)

```bash
cd backend
npx prisma migrate dev    # crea esquema desde cero
npm run db:seed           # datos de prueba
```

#### Opción B — Unirse al proyecto (BD compartida de Neon ya existe)

```bash
cd backend
npx prisma migrate deploy  # aplica migraciones pendientes (NO interactivo)
```

> **No necesitas `db:seed`** — los datos ya existen en la BD compartida. El seed es idempotente, así que ejecutarlo no causará duplicados, pero tampoco es necesario.

### Arrancar en desarrollo

```bash
# Terminal 1 — Backend
cd backend && npm run dev      # Puerto 3000

# Terminal 2 — Frontend
cd frontend && npm run dev     # Puerto 5173
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

**Credenciales de prueba (seed):**
- Médico: `dr.garcia@nexomed.es` / `password123`
- Enfermero (M): `enf.martinez@nexomed.es` / `password123`
- Enfermero (M): `enf.gomez@nexomed.es` / `password123`
- Enfermero (T): `enf.lopez@nexomed.es` / `password123`
- Enfermero (T): `enf.vera@nexomed.es` / `password123`
- Enfermero (N): `enf.ruiz@nexomed.es` / `password123`
- TCAE (T): `tcae.sanchez@nexomed.es` / `password123`
- TCAE (N): `tcae.exposito@nexomed.es` / `password123`

---

## Estructura del repositorio

```
nexomed/
├── frontend/          ← React + Vite (SPA)
├── backend/           ← Node.js + Express (API REST)
├── docs/              ← Documentación técnica extendida
├── .agents/skills/      ← Skills para agentes IA
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
