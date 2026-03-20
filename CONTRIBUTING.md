# CONTRIBUTING.md — Guía de Contribución a NexoMed

Gracias por trabajar en NexoMed. Esta guía define cómo trabajamos juntos para mantener el código ordenado y el proyecto avanzando.

---

## 1. Workflow de Git

### Ramas

| Nombre | Propósito |
|--------|-----------|
| `main` | Versión estable. **Nunca se hace push directo.** Solo merges via PR aprobado. |
| `sprint-N` | Rama activa del sprint actual (ej. `sprint-1`, `sprint-2`). Se crea al inicio de cada sprint. |
| `feature/NXM-XX-descripcion` | Rama para cada funcionalidad (vinculada al ticket de Jira). |
| `fix/NXM-XX-descripcion` | Rama para correcciones de bugs. |

**Ejemplo de nombre de rama:**
```
feature/NXM-12-bed-map-component
fix/NXM-23-jwt-expiry-bug
```

### Flujo por tarea

1. Asegúrate de que la tarea esté en **In Progress** en Jira.
2. Crea tu rama desde `sprint-N`:
   ```bash
   git checkout sprint-2
   git pull origin sprint-2
   git checkout -b feature/NXM-XX-descripcion
   ```
3. Desarrolla y haz commits frecuentes.
4. Cuando termines, abre un **Pull Request** hacia `sprint-N`.
5. Solicita revisión a al menos 1 compañero.
6. Una vez aprobado, haz merge y elimina la rama de feature.
7. Al final del sprint, `sprint-N` se mergea a `main` via PR grupal revisado por todos.

---

## 2. Commits — Formato Conventional Commits

Todos los commits deben seguir el formato [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```
<tipo>(<ámbito>): <descripción breve en imperativo>
```

**Tipos permitidos:**
- `feat`: nueva funcionalidad
- `fix`: corrección de bug
- `chore`: tareas de mantenimiento (deps, config)
- `docs`: cambios en documentación
- `style`: formateo, sin cambio de lógica
- `refactor`: refactorización sin cambio de comportamiento
- `test`: añadir o corregir tests
- `perf`: mejora de rendimiento

**Ejemplos:**
```
feat(bed-map): add patient admission modal
fix(auth): correct JWT expiry calculation
docs(README): update quick start instructions
test(medication): add recalculation unit tests
chore(deps): upgrade TanStack Query to v5.1
```

---

## 3. Estándares de Código

### Frontend (TypeScript + React)

- **Lenguaje:** TypeScript estricto. No usar `any` sin justificación documentada.
- **Componentes:** un archivo por componente en `src/app/components/`. Nombre en PascalCase.
- **Hooks:** custom hooks en `src/app/hooks/`. Nombre con prefijo `use`.
- **Estado global:** solo lo que genuinamente es global va en Zustand. Estado local de UI → `useState`.
- **Formularios:** siempre React Hook Form + Zod. No manejar estado de formulario con `useState` manual.
- **Fetching:** siempre TanStack Query para peticiones al servidor. No `useEffect` + `fetch` manual.
- **Estilos:** solo Tailwind CSS + clases de Shadcn UI. No CSS en línea ni módulos CSS separados salvo `theme.css` y `fonts.css`.
- **Imports:** usar alias de path (`@/components/...`) definidos en `vite.config.ts`.

### Backend (TypeScript + Express)

- **Controladores:** solo orquestan; la lógica de negocio va en los `services/`.
- **Validación:** validar el body de todas las peticiones con Zod antes de llegar al controlador.
- **Errores:** usar siempre `try/catch` en controladores y devolver códigos HTTP semánticos (400, 401, 403, 404, 409, 500).
- **Prisma:** nunca escribir SQL crudo salvo que Prisma no soporte la consulta. Documentar el motivo.
- **Variables de entorno:** acceder siempre via `process.env.NOMBRE_VARIABLE`. Añadir toda variable nueva a `.env.example`.

### General

- Ejecutar `npm run lint` antes de cada push. El pre-commit Husky lo bloqueará si falla.
- No subir archivos `.env` ni secretos bajo ninguna circunstancia.
- No añadir dependencias de producción sin consenso del equipo.

---

## 4. Pull Requests

- El título del PR debe referenciar el ticket de Jira: `[NXM-XX] Descripción del cambio`.
- Incluir en la descripción del PR:
  - Qué se ha hecho y por qué.
  - Cómo probarlo manualmente.
  - Capturas de pantalla si hay cambios visuales.
- Se requiere **1 aprobación** mínimo antes de hacer merge.
- El merge lo hace quien abre el PR, una vez aprobado.
- Borrar la rama de feature después del merge.

---

## 5. Reuniones y Comunicación

| Evento | Frecuencia | Plataforma |
|--------|-----------|-----------|
| Daily (async) | Diario | Teams / WhatsApp — responder: qué hice, qué haré, algún bloqueo |
| Sprint Planning | Inicio de sprint | Teams / Presencial |
| Sprint Review | Final de sprint | Con el profesor (cliente) |
| Sprint Retrospectiva | Final de sprint | Equipo interno |
| Refinamiento Backlog | Semanal | Teams |

---

## 6. Jira — Gestión de Tareas

- Cada tarea del `PLANNING.md` tiene un ticket correspondiente en Jira.
- Columnas del tablero Kanban: **To Do → In Progress → Review → Done**.
- Mover el ticket al estado correcto al empezar, al abrir PR y al hacer merge.
- El Scrum Master del sprint actual es responsable de mantener el tablero actualizado.

---

## 7. Testing

- **Backend:** escribir tests de integración con Jest + Supertest para todos los endpoints críticos (auth, medicación, notificaciones).
- **Frontend:** tests de componentes con Vitest + Testing Library para componentes de negocio críticos (no para UI pura).
- Los tests deben pasar (`npm test`) antes de abrir un PR.
- Nunca mergear código con tests en rojo.

---

## 8. Etiquetas de versión

Al final de cada sprint, el Scrum Master crea una tag en `main`:
```bash
git tag -a v1.0-sprint1 -m "Sprint 1 — Auth + DB Setup"
git push origin v1.0-sprint1
```
