# PROMPTS.md — Plantillas de Prompts Reutilizables para NexoMed

> Prompts estandarizados para tareas recurrentes de IA en el desarrollo de NexoMed.
> Usa estas plantillas para garantizar consistencia entre todos los miembros del equipo.

---

## 1. Implementar un Nuevo Componente React

```
Contexto del proyecto:
- NexoMed: app web de gestión clínica hospitalaria
- Stack: React 18 + TypeScript + Tailwind CSS + Shadcn UI + TanStack Query
- Convenciones: un archivo por componente, nombre PascalCase, hooks en hooks/, estado global en Zustand
- Estilos: solo clases Tailwind, sin CSS en línea

Tarea: Implementa el componente [NOMBRE_COMPONENTE] en frontend/src/app/components/[NOMBRE_COMPONENTE].tsx

Requisito funcional: [COPIAR REQUISITO DEL SPEC.md, ej: ENF-RF1 - visualizar en pantalla única alergias, medicación pendiente y motivo de ingreso]

Datos que necesita del backend: [describir los datos que consume, ej: GET /api/patients/:id]

Comportamiento esperado:
- [punto 1]
- [punto 2]

Restricciones:
- Las acciones principales deben ser alcanzables en ≤ 3 clics
- Usar TanStack Query para el fetching de datos
- Validar con Zod cualquier formulario incluido
- No usar localStorage
```

---

## 2. Implementar un Endpoint REST

```
Contexto del proyecto:
- NexoMed backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Estructura: routes → controllers → services → Prisma
- Auth: JWT middleware (req.user = { id, role })
- Roles: NURSE | DOCTOR | TCAE con permisos descritos en AGENTS.md

Tarea: Implementa el endpoint [MÉTODO] [/api/ruta]

Requisito funcional: [COPIAR DEL SPEC.md]

Restricciones de rol: [qué roles pueden acceder]

Reglas de negocio a respeitar:
- [copiar reglas relevantes de SPEC.md §8]

Respuesta esperada:
- Éxito: [estructura JSON]
- Errores: [códigos HTTP y mensajes]

Crea los archivos en:
- backend/src/routes/[entidad].routes.ts
- backend/src/controllers/[entidad].controller.ts  
- backend/src/services/[entidad].service.ts (si tiene lógica de negocio)
```

---

## 3. Escribir Tests de Integración (Backend)

```
Proyecto: NexoMed backend — Node.js + Express + Jest + Supertest + Prisma

Escribe tests de integración para el endpoint [MÉTODO] [/api/ruta]

Cobertura requerida:
1. Happy path — petición válida con autenticación correcta
2. Sin autenticación — debe devolver 401
3. Rol sin permisos — debe devolver 403
4. Datos de entrada inválidos — debe devolver 400 con mensaje descriptivo
5. [Caso de negocio específico, ej: medicación duplicada en < 15 min → 409]

Convenciones:
- Mock de Prisma con jest.mock
- Usar datos de prueba del seed (no datos reales de pacientes)
- Un describe por endpoint, un it por caso
- Nombres de tests en español para consistencia con el equipo
- Archivo: backend/src/__tests__/[entidad].test.ts
```

---

## 4. Revisar un Pull Request

```
Revisa el siguiente código de NexoMed siguiendo estos criterios en orden:

1. SEGURIDAD
   - ¿Se validan todas las entradas con Zod?
   - ¿El middleware de autenticación y rol está aplicado?
   - ¿Se expone algún dato sensible en logs o respuestas de error?
   - ¿Hay secretos hardcodeados?

2. CORRECTITUD FUNCIONAL
   - ¿Cumple el requisito funcional del SPEC.md referenciado?
   - ¿Se respetan todas las reglas de negocio de SPEC.md §8?
   - ¿Los códigos HTTP de respuesta son semánticos y correctos?

3. RENDIMIENTO
   - ¿Hay queries de base de datos redundantes o N+1?
   - ¿Las notificaciones se emiten donde corresponde?

4. CALIDAD DE CÓDIGO
   - ¿Sigue las convenciones de AGENTS.md?
   - ¿Hay uso de `any` sin justificación?
   - ¿Los controladores delegan lógica a services?
   - ¿Los componentes React son inferiores a 150 líneas? (si no, sugerir división)

5. TESTS
   - ¿El nuevo código tiene tests asociados?
   - ¿Los tests cubren casos de error además del happy path?

Código a revisar:
[PEGAR DIFF O CÓDIGO]
```

---

## 5. Generar Documentación de un Endpoint (Swagger)

```
Genera la documentación OpenAPI 3.0 (Swagger) para el siguiente endpoint de NexoMed:

Endpoint: [MÉTODO] [/api/ruta]
Descripción funcional: [qué hace este endpoint]
Autenticación: Bearer JWT requerido
Roles con acceso: [NURSE | DOCTOR | TCAE]

Request body (si aplica):
[esquema Zod o descripción de campos]

Respuestas:
- 200: [descripción del objeto devuelto]
- 400: validación fallida
- 401: token inválido o expirado
- 403: rol sin permisos
- 404: recurso no encontrado (si aplica)
- 409: conflicto (si aplica, ej: anti-duplicidad)

Genera el bloque YAML de OpenAPI 3.0 para añadir a docs/api.yaml
```

---

## 6. Crear Datos de Seed

```
Crea datos de prueba para el script backend/prisma/seed.ts de NexoMed.

Entorno simulado:
- 1 planta hospitalaria
- 12 habitaciones dobles → 24 camas (habitaciones 101-112, camas A y B)
- 8 profesionales: 1 médico, 5 enfermeros, 2 TCAE
- 6-10 pacientes (algunas camas libres para demostrar el mapa de camas)

Requisitos de los datos:
- Todos los datos son FICTICIOS (nombres inventados, sin datos reales)
- Incluir al menos 1 paciente con múltiples alergias (para mostrar alertas)
- Incluir al menos 1 paciente con 3+ medicamentos activos con horarios distribuidos
- Incluir cuidados y constantes vitales de turnos anteriores (para historial)
- Incluir al menos 1 notificación pendiente de leer para cada enfermero
- Passwords hasheadas con bcrypt (no mostrar en texto plano en el seed)

Formato de credenciales de prueba a generar:
enfermero1@nexomed.test / Test1234!
medico1@nexomed.test / Test1234!
tcae1@nexomed.test / Test1234!
```

---

## 7. Debug de un Error

```
Estoy trabajando en NexoMed y tengo el siguiente error:

Error: [PEGAR MENSAJE DE ERROR COMPLETO CON STACK TRACE]

Contexto:
- Archivo: [ruta del archivo]
- Qué estaba haciendo: [descripción de la acción]
- Stack: [frontend React/Vite | backend Node.js/Express]
- Versiones relevantes: React 18, Node 20, Prisma 5, PostgreSQL 15

Código relevante:
[PEGAR FRAGMENTO DE CÓDIGO]

¿Cuál es la causa y cómo lo corrijo siguiendo las convenciones de AGENTS.md?
```

---

## 8. Descripción de Pull Request

```
Genera la descripción para un Pull Request de NexoMed con la siguiente información:

Ticket Jira: NXM-[XX]
Rama: feature/NXM-XX-[descripcion]
Sprint: Sprint [N]

¿Qué hace este PR?
[Descripción en 2-3 frases]

Requisito funcional implementado: [ID del SPEC.md, ej: ENF-RF2]

Cambios realizados:
- [archivo 1]: [qué se hizo]
- [archivo 2]: [qué se hizo]

Cómo probarlo:
1. [paso 1]
2. [paso 2]

[SI HAY UI] Screenshots:
[adjuntar]

Tests añadidos: [sí/no — cuáles]
```
