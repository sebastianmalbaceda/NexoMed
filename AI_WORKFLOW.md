# AI_WORKFLOW.md — Pipeline de Desarrollo Asistido por IA en NexoMed

> Define cómo se integran los agentes IA en el flujo de desarrollo del proyecto.

---

## Visión General del Pipeline

```
PLAN → BUILD → REVIEW → TEST → ITERATE
```

Cada fase tiene un agente recomendado, responsabilidades claras y un output definido que alimenta la fase siguiente. El equipo humano mantiene puntos de control en las transiciones clave.

---

## Fase 1 — PLAN

**Modelo recomendado:** Claude Opus 4.6 (máxima capacidad de razonamiento)

**Cuándo activarla:** Al inicio de cada sprint, al recibir nuevos requisitos del profesor (cliente), o cuando surgen cambios significativos de diseño.

**Prompt base:**
```
Eres el agente planificador del proyecto NexoMed.

Lee los siguientes documentos de contexto:
- SPEC.md — requisitos funcionales completos
- ARCHITECTURE.md — diseño técnico del sistema
- PLANNING.md — estado actual de implementación

Sprint actual: Sprint [N]
Objetivo del sprint: [descripción del objetivo]

Nuevos requisitos o cambios desde el último sprint:
[descripción]

Tareas:
1. Analiza el gap entre lo implementado (PLANNING.md) y los requisitos del sprint.
2. Descompón el trabajo en tareas concretas e implementables, sin ambigüedad.
3. Cada tarea debe poder completarse en 2-4 horas por un desarrollador individual.
4. Asigna cada tarea a un miembro del equipo según sus roles (ver Contrato).
5. Identifica dependencias entre tareas y bloqueos potenciales.
6. Actualiza PLANNING.md con las tareas del nuevo sprint.

Output esperado: PLANNING.md actualizado para el Sprint [N].
```

**Output:** `PLANNING.md` actualizado con tareas claras y asignadas.

---

## Fase 2 — BUILD

**Modelo recomendado:** Claude Sonnet 4.6 (equilibrio rendimiento/coste para tareas de implementación)

**Cuándo activarla:** Para implementar tareas individuales del `PLANNING.md`.

**Prompt base:**
```
Eres el agente builder del proyecto NexoMed.

Lee y sigue estrictamente:
- AGENTS.md — convenciones, comandos, boundaries
- SPEC.md — requisitos funcionales (especialmente el requisito de la tarea)
- ARCHITECTURE.md — diseño del sistema (no tomes decisiones arquitectónicas)
- PLANNING.md — identifica la tarea a implementar

Tarea a implementar: [COPIAR TAREA EXACTA DE PLANNING.md]
Skill a cargar: [ruta del SKILL.md relevante si aplica]

Instrucciones:
1. Implementa solo la tarea descrita. No añadas funcionalidad extra.
2. Si encuentras una decisión arquitectónica que no está definida, PARA y pregunta.
3. Sigue al pie de la letra las convenciones de AGENTS.md.
4. Al terminar, marca la tarea como completada en PLANNING.md.
5. Añade una entrada en CHANGELOG.md bajo [Sin publicar].

No hagas push a main. Trabaja en la rama feature correspondiente.
```

**Output:** Código implementado en rama `feature/NXM-XX-...`, `PLANNING.md` y `CHANGELOG.md` actualizados.

---

## Fase 3 — REVIEW

**Modelo recomendado:** Claude Opus 4.6 (requiere juicio crítico de alto nivel)

**Cuándo activarla:** Antes de mergear cualquier PR a `sprint-N`.

**Prompt base:**
```
Eres el agente revisor del proyecto NexoMed.

Revisa el siguiente Pull Request usando la checklist de PROMPTS.md §4 (Revisar un PR).

Documentos de referencia:
- SPEC.md — requisitos funcionales que debe cumplir el código
- ARCHITECTURE.md — diseño que debe respetar
- AGENTS.md — convenciones que debe seguir

Código del PR:
[DIFF O ENLACE AL PR]

Requisito implementado: [ID del SPEC.md]

Genera un informe de revisión con:
1. Veredicto: APROBADO | NECESITA CAMBIOS | BLOQUEADO
2. Issues críticos (bloquean merge): [lista]
3. Issues menores (sugerencias): [lista]
4. Confirmación de que PLANNING.md y CHANGELOG.md están actualizados.
```

**Output:** Informe de revisión. Si hay issues críticos, el PR vuelve a BUILD.

---

## Fase 4 — TEST

**Modelo recomendado:** Claude Sonnet 4.6

**Cuándo activarla:** Tras la revisión positiva, antes del Sprint Review.

**Prompt base:**
```
Eres el agente de testing del proyecto NexoMed.

Genera tests para la funcionalidad implementada en [COMPONENTE/ENDPOINT].

Lee:
- SPEC.md — comportamiento esperado (requisitos cubiertos: [IDs])
- AGENTS.md — convenciones de testing
- .claude/skills/generate-tests/SKILL.md — procedimiento de testing del proyecto

Cobertura obligatoria:
1. Happy path completo
2. Autenticación y autorización por rol
3. Validación de entradas incorrectas
4. Reglas de negocio específicas del SPEC.md §8
5. Casos de error (404, 409, 500)

Ejecuta los tests y reporta:
- Tests creados: [lista]
- Resultado: PASS / FAIL
- Cobertura estimada de los requisitos
- Tests que fallan y causa
```

**Output:** Tests escritos y pasando. Informe de cobertura.

---

## Fase 5 — ITERATE

Después de REVIEW y TEST:

1. El agente BUILD corrige los issues identificados.
2. Se re-ejecutan los tests afectados.
3. Se actualiza `PLANNING.md` (marcar completado, añadir nuevas tareas encontradas).
4. Se actualiza `CHANGELOG.md`.
5. Se prepara el Sprint Review para el profesor.

---

## Puntos de Control Humano

El equipo mantiene responsabilidad sobre las siguientes decisiones — no delegadas a agentes IA:

| Punto de control | Responsable |
|-----------------|------------|
| Revisión del PLANNING.md antes de iniciar el build | Scrum Master del sprint |
| Aprobación de PRs (mínimo 1 persona) | Compañero del equipo |
| Sprint Review con el profesor | Todo el equipo |
| Cambios en el esquema Prisma | Arquitectos DB (Xiang, Cristian, Sebastian) |
| Decisiones arquitectónicas no contempladas | Todo el equipo en reunión |
| Merges de sprint-N a main | Scrum Master |

---

## Cuándo NO usar IA para generar código

- Decisiones de arquitectura no documentadas en `ARCHITECTURE.md` → reunión de equipo primero.
- Modificaciones al esquema Prisma que afecten tablas con datos existentes → revisión manual.
- Lógica de seguridad crítica (auth, permisos) → revisar el output de IA línea por línea antes de mergear.
- Cualquier código que maneje datos de pacientes reales (no aplica en MVP académico, pero sí en evoluciones futuras).

---

## Herramientas de IA utilizadas en el proyecto

| Herramienta | Uso |
|------------|-----|
| Claude Sonnet 4.6 (Claude Code) | Implementación de features, generación de tests, documentación |
| Claude Opus 4.6 | Planificación de sprints, revisión de PRs, decisiones técnicas complejas |
| Figma Make | Prototipado visual de componentes de interfaz |
| GitHub Copilot | Autocompletado en el IDE (opcional por miembro) |
