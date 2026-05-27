# Cómo probar — Historial clínico + Incidencias enriquecidas

> **Rama**: `prueba`
> **Estado**: TypeScript verde · Frontend tests 69/69 · End-to-end runtime de incidencias OK.

---

## 1) Punto 2 — Incidencias enriquecidas

### Qué hace ahora

Antes el formulario solo capturaba `type` + `description`. Ahora captura:

- **Tipo** (los 6 originales)
- **Gravedad** (LEVE / MODERADA / GRAVE / CRÍTICA) — campo nuevo obligatorio
- **Descripción detallada** (mín. 5 / máx. 1000 caracteres, textarea multilinea)

La lista de incidencias muestra:

- Badge de **gravedad** con color (verde/ámbar/naranja/rojo)
- Badge de **estado** (🔴 ABIERTA / ✅ RESUELTA)
- **Borde izquierdo coloreado** según gravedad
- **Resolución completa** cuando está cerrada: texto, fecha/hora de resolución, autor
- Botón **"Resolver"** solo en incidencias abiertas → abre diálogo modal

Stats cards en cabecera: Abiertas / Críticas abiertas / Resueltas / Total registradas.

Filtros: por paciente, por tipo, por estado (abierta/resuelta).

### Cómo probarlo

1. Arranca backend (`npm run dev` desde backend) y frontend (`npm run dev` desde frontend).
2. Login: `enf.martinez@nexomed.es / password123`.
3. Menú lateral → **Incidencias**.
4. **Crear**:
   - Click "Registrar incidencia"
   - Elige paciente, tipo, **gravedad** (cuatro botones radio coloreados), descripción detallada
   - Submit. La incidencia aparece en la lista con su badge de gravedad
5. **Resolver**:
   - Click "Resolver" en una incidencia abierta
   - Se abre un diálogo modal pidiendo la resolución
   - Escribe la resolución y submit
   - La incidencia ahora aparece como ✅ RESUELTA con bloque verde mostrando: resolución, fecha de resolución, autor
6. **Filtrar**:
   - Probar el selector "Solo abiertas" / "Solo resueltas"
   - Combinar con filtro por tipo

### Smoke test runtime (ya validado por mí)

```
✓ POST /incidents con {type:'FALL', severity:'MODERADA', description:'...'} → 201
✓ Respuesta incluye: severity, status:'ABIERTA', resolution:null
✓ PUT /incidents/:id con {status:'RESUELTA', resolution:'...'} → 200
✓ Respuesta incluye: status:'RESUELTA', resolution, resolvedAt, resolvedById
✓ DELETE /incidents/:id → 200
```

### Archivos modificados

- [backend/src/validations/incident.validation.ts](NexoMed/backend/src/validations/incident.validation.ts) — añadido `CRITICA` + schema de resolución
- [frontend/src/app/lib/types.ts](NexoMed/frontend/src/app/lib/types.ts) — tipos `IncidentSeverity`, `IncidentStatus` + campos en `Incident`
- [frontend/src/app/pages/IncidentsPage.tsx](NexoMed/frontend/src/app/pages/IncidentsPage.tsx) — reescrito completo

---

## 2) Punto 1 — Historial clínico estilo hospital

### Qué hace ahora

Antes era una página con tres pestañas separadas (Cuidados / Medicación / Pruebas), cada una mostrando solo su tipo. Ahora es un **único timeline cronológico hospitalario** que integra **todos** los eventos clínicos del paciente.

#### Diseño

**Cabecera del paciente** (top):
- Avatar + nombre completo + estado clínico (badge) + badge "DADO DE ALTA" si aplica
- Edad, DNI, cama
- Cuatro tarjetas de datos clínicos clave: Diagnóstico, fecha de ingreso (con "Hace X días"), cama, alergias (rojas si las hay)

**Resumen de actividad** (cinco contadores con icono):
- Constantes registradas (en esta visita)
- Cuidados realizados (en esta visita)
- Medicación activa
- Pruebas pendientes (REQUESTED + APPROVED)
- Incidencias abiertas

**Selector de visita** (toggle):
- 📅 **Visita actual** — eventos desde `admissionDate` actual
- 📜 **Visitas anteriores** — eventos de re-ingresos previos (badge con conteo, deshabilitado si no hay)
- **Todo** — historia completa unificada

**Filtros por tipo** (botones toggle a la derecha):
- Cuidados / Medicación administrada / Medicación pendiente / Pruebas / Incidencias
- Click para mostrar/ocultar cada categoría

**Timeline unificado**:
- Línea vertical con puntos coloreados según tipo
- Cada evento muestra: icono en círculo con anillo, badge de tipo, badge de severity (si es incidencia), badge de meta (si aplica), fecha+hora, título, detalle, autor
- Tipos diferenciados:
  - 🔵 Ingreso (hito grande)
  - ⚫ Alta médica (hito)
  - 🟢 Cuidado
  - 🟠 Dosis administrada
  - 🟡 Dosis pendiente
  - 🟣 Prueba diagnóstica (con resultado si está completada)
  - 🔴 Incidencia (con severity y resolución si está resuelta)

#### Por qué es realista hospitalariamente

- **Cronología completa** en lugar de pestañas separadas: el médico/enfermero ve la "historia" del paciente como sucedió en el tiempo, no fragmentada por tipo de dato.
- **Hitos clínicos** (ingreso, alta) actúan como anclas temporales.
- **Separación de visitas** sin necesidad de tocar el schema: usamos `admissionDate` como punto de corte. Si un paciente fue dado de alta y reingresó (mismo `id` por DNI), los registros previos quedan en "Visitas anteriores".
- **Resumen al ojeo**: las cinco tarjetas dan el contexto inmediato sin tener que leer la timeline.
- **Alergias siempre visibles** (en rojo si hay) — error frecuente en hospitales reales no verlas antes de medicar.

### Cómo probarlo

1. Login como **médico** (`dr.garcia@nexomed.es / password123`) o **enfermero**.
2. Menú lateral → **Historial**.
3. Selecciona Juan Pérez Ruiz (tiene varios cuidados + medicación + incidencias).
4. **Verifica la cabecera** — debes ver nombre completo, edad, DNI, cama, diagnóstico, "Hace X días", alergias en rojo, los 5 contadores.
5. **Timeline**:
   - Debe aparecer el hito "Ingreso hospitalario" en azul.
   - Las dosis administradas en naranja, las pendientes en amarillo.
   - Cuidados en verde, pruebas en violeta, incidencias en rojo.
   - Todo ordenado por fecha descendente.
6. **Click "Visitas anteriores"** — si no hay re-ingresos previos, el botón está deshabilitado con conteo 0. Si hay, ves solo los eventos anteriores a la admisión actual.
7. **Filtros por tipo** — click en "Medicación pendiente" la oculta del timeline; click otra vez la muestra.
8. **Toma una incidencia con severity** (creada en el paso anterior) y verifica que su evento en el timeline tiene el badge MODERADA en color.

### Archivos modificados

- [frontend/src/app/pages/UnifiedHistoryPage.tsx](NexoMed/frontend/src/app/pages/UnifiedHistoryPage.tsx) — reescrito completo con timeline y resumen

---

## 3) Verificación final

| Suite | Resultado |
|---|---|
| TypeScript frontend | ✅ Exit 0 |
| TypeScript backend | ✅ Exit 0 |
| Vitest frontend | ✅ 69/69 |
| Smoke runtime incidencias | ✅ Crear con severity → Resolver → Eliminar funciona end-to-end |

---

## 4) Commit sugerido

```bash
git add backend/src/validations/incident.validation.ts
git add frontend/src/app/lib/types.ts
git add frontend/src/app/pages/IncidentsPage.tsx
git add frontend/src/app/pages/UnifiedHistoryPage.tsx
git commit -m "feat: incidencias con severity+resolución y historial clínico tipo hospital"
```

Cuando subas la rama: `git push -u origin prueba`.
