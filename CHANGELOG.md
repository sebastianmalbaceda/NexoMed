# CHANGELOG.md — NexoMed

Todos los cambios notables de este proyecto quedan documentados en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [Sin publicar]

### Añadido
- Definición inicial de la arquitectura técnica y stack tecnológico.
- Prototipo visual en Figma Make (BedMap, DashboardOverview, MedicalSchedule, DiagnosticTests, ShiftReport, RealtimeNotifications, QuickActions, Sidebar, Header, UnifiedHistory).
- Documentación de proyecto completa: README, SPEC, ARCHITECTURE, ROADMAP, PLANNING, AGENTS, CONTRIBUTING, SECURITY, PROMPTS, AI_WORKFLOW.
- Definición de requisitos funcionales y no funcionales (SYS, ENF, MED, TCAE).
- Contrato académico firmado.

---

## [0.1.0] — Sprint 1 *(en curso)*

### Añadido
- Setup inicial del repositorio frontend (React 18 + Vite + TypeScript + Tailwind CSS + Shadcn UI).
- Setup inicial del repositorio backend (Node.js + Express + Prisma).
- Configuración de herramientas de calidad: ESLint + Prettier + Husky.
- Modelado de base de datos con Prisma (schema inicial).
- Primera migración de base de datos.
- Autenticación JWT: endpoints login / logout / me.
- Middleware de autorización por rol (NURSE, DOCTOR, TCAE).
- Pantalla de Login funcional en el frontend.
- Script de seed con datos de prueba.

---

<!-- Formato de entrada para versiones futuras:

## [X.Y.Z] — YYYY-MM-DD

### Añadido
- Nuevas funcionalidades.

### Cambiado
- Cambios en funcionalidades existentes.

### Corregido
- Bugs solucionados.

### Eliminado
- Funcionalidades eliminadas.

### Seguridad
- Vulnerabilidades corregidas.

-->
