# SPEC.md — Especificación de Requisitos de NexoMed

> Versión: 1.0.0 | Fecha: Marzo 2026 | Estado: Activo

---

## 1. Propósito y Alcance

NexoMed es una aplicación web de gestión clínica hospitalaria orientada a profesionales sanitarios (Médico/a, Enfermero/a, TCAE). Su objetivo es centralizar en una única interfaz la gestión de medicación, cuidados, historia clínica y comunicación entre roles, eliminando la fragmentación de datos que genera errores y pérdida de tiempo.

### 1.1 Ámbito del MVP Académico

- **1 planta hospitalaria** simulada.
- **12 habitaciones** dobles → máximo **24 pacientes** concurrentes.
- **8 profesionales sanitarios**: 5 enfermeros/as, 1 médico/a, 2 TCAE.
- **4 entidades**: Médico/a, Enfermero/a, TCAE, Paciente (entidad de datos).

### 1.2 Fuera de Alcance

- Integración real con SAP, Gacela Care o Silicon.
- Cumplimiento estricto LOPD/RGPD clínico completo.
- Firma electrónica certificada.
- Despliegue en infraestructura hospitalaria real.
- Seguridad avanzada con certificación EN 82304-1.

---

## 2. Actores del Sistema

| Actor | Descripción |
|-------|-------------|
| **Enfermero/a** | Usuario principal. Ejecuta cuidados, administra medicación y monitoriza pacientes. |
| **Médico/a** | Prescribe medicación, accede a historiales completos y programa pruebas. |
| **TCAE** | Registra cuidados básicos, higiene, alimentación y constantes vitales. |
| **Paciente** | Entidad de datos. No accede activamente al sistema. |
| **Sistema** | Actor interno que automatiza recálculos y notificaciones. |

---

## 3. Casos de Uso Principales

### UC-01: Autenticación por rol
- Actor: Cualquier profesional sanitario
- Flujo: El usuario introduce credenciales → el sistema valida → redirige al dashboard específico del rol
- Postcondición: Token JWT almacenado en cliente; interfaz adaptada al rol

### UC-02: Consultar ficha del paciente
- Actor: Enfermero/a, Médico/a, TCAE
- Flujo: El usuario selecciona un paciente desde el mapa de camas o lista → visualiza datos relevantes según su rol
- Datos mostrados: nombre, edad, diagnóstico, alergias, habitación, constantes recientes, medicación activa

### UC-03: Administrar medicación
- Actor: Enfermero/a
- Flujo: El enfermero/a accede a la lista de medicación pendiente del paciente → marca como administrada → el sistema registra hora y usuario
- Variante: Si cambia la hora de administración, el sistema recalcula automáticamente todos los horarios del día para ese fármaco

### UC-04: Prescribir medicación (Médico)
- Actor: Médico/a
- Flujo: El médico busca un fármaco en el buscador CIMA → selecciona pauta y horario → guarda prescripción → el sistema inserta la tarea en la lista del enfermero responsable y emite notificación en tiempo real
- Integración: API CIMA/AEMPS para búsqueda de fármacos

### UC-05: Notificación de cambio de medicación
- Actor: Sistema → Enfermero/a
- Flujo: Cuando el médico modifica o prescribe medicación → el sistema emite una alerta visual inmediata al enfermero responsable del paciente
- Requisito de rendimiento: La notificación debe aparecer en ≤ 2 segundos

### UC-06: Registrar cuidados y constantes vitales
- Actor: Enfermero/a, TCAE
- Flujo: El usuario selecciona tipo de cuidado o constante → introduce valores → guarda registro unificado
- Restricción: No se permite duplicar el mismo tipo de registro en el mismo turno para el mismo paciente sin confirmación explícita

### UC-07: Mapa de camas
- Actor: Cualquier profesional
- Flujo: El usuario accede al mapa de camas → visualiza estado de cada cama (ocupada/libre, nombre paciente, alertas) → puede hacer clic en una cama para abrir la ficha del paciente
- Gestión: Permite dar de alta (asignar paciente a cama) y dar de baja (liberar cama)

### UC-08: Cronograma de tareas
- Actor: Enfermero/a
- Flujo dos niveles:
  - **SYS-RF5**: Vista de planta — cronograma de todas las tareas del turno agrupadas por enfermero
  - **SYS-RF6**: Vista de paciente — cronograma de tareas específicas del paciente

### UC-09: Registrar incidencia
- Actor: Enfermero/a, TCAE
- Flujo: El usuario selecciona el tipo de incidencia (rechazo de medicación / incidente de cuidados) → describe el evento → guarda con marca de tiempo y usuario

### UC-10: Módulo de pruebas diagnósticas
- Actor: Médico/a
- Flujo: El médico programa una prueba (analítica, imagen, cultivo) → queda registrada en el perfil del paciente → resultados se asocian al mismo registro al obtenerse

---

## 4. Requisitos Funcionales

### 4.1 Sistema General

| ID | Prioridad | Descripción |
|----|-----------|-------------|
| SYS-RF1 | Alta | El sistema debe permitir ver la pauta médica, administrar medicación y cambiar horarios con recálculo automático de los horarios sucesivos del día. |
| SYS-RF2 | Alta | El sistema debe registrar curas, constantes, balances y tareas de enfermería evitando duplicidad de registros en el mismo turno. |
| SYS-RF3 | Alta | El sistema debe permitir login con credenciales únicas y personalizar la interfaz y permisos según el rol del usuario (Enfermero/a, Médico/a, TCAE). |
| SYS-RF4 | Alta | El sistema debe tener un mapa de camas donde visualizar los pacientes de cada habitación y sus características principales. Debe permitir altas (asignar) y bajas (liberar) de pacientes. |
| SYS-RF5 | Media | El sistema debe ofrecer una vista de cronograma de las tareas generales del turno agrupadas por enfermero/a. |
| SYS-RF6 | Media | El sistema debe permitir ver un cronograma de tareas específicas por paciente dentro de su perfil. |
| SYS-RF7 | Media | El sistema debe gestionar solicitudes y resultados de pruebas de laboratorio (analíticas, cultivos) y de diagnóstico por imagen (radiografía, ecografía, resonancia). |
| SYS-RF8 | Media | El sistema debe disponer de un módulo de incidencias para registrar rechazos de medicación por parte del paciente e incidentes en los cuidados. |

### 4.2 Rol: Enfermero/a

| ID | Prioridad | Descripción |
|----|-----------|-------------|
| ENF-RF1 | Alta | El enfermero/a debe poder visualizar en una única pantalla principal los datos críticos del paciente: alergias, motivo de ingreso, constantes recientes y medicación pendiente. |
| ENF-RF2 | Alta | El enfermero/a debe poder cambiar la hora de administración de una medicación y que el sistema calcule automáticamente los horarios sucesivos del día. |
| ENF-RF3 | Alta | El enfermero/a debe recibir notificación visual inmediata cuando el médico/a modifique la medicación de un paciente a su cargo. |
| ENF-RF4 | Alta | El enfermero/a debe poder registrar curas, constantes y cuidados de forma rápida y unificada, sin duplicar registros. |
| ENF-RNF1 | Alta | El enfermero/a debe poder realizar las tareas más frecuentes (ver paciente, administrar fármacos) en un máximo de 3 clics desde el panel principal. |

### 4.3 Rol: Médico/a

| ID | Prioridad | Descripción |
|----|-----------|-------------|
| MED-RF1 | Alta | El médico/a debe poder acceder al historial clínico completo del paciente, resultados de pruebas y evolutivos de enfermería desde una ubicación centralizada. |
| MED-RF2 | Alta | El médico/a debe poder prescribir o retirar medicación y que dicha acción se integre automáticamente en la lista de tareas del enfermero/a responsable, activando una alerta en tiempo real. |
| MED-RF3 | Media | El médico/a debe poder programar y gestionar pruebas diagnósticas para el paciente (laboratorio, imagen). |

### 4.4 Rol: TCAE

| ID | Prioridad | Descripción |
|----|-----------|-------------|
| TCAE-RF1 | Alta | El TCAE debe poder registrar la higiene del paciente, la ingesta de alimentos y los balances hídricos parciales. |
| TCAE-RF2 | Alta | El TCAE debe poder visualizar alertas de restricciones del paciente (dieta especial, aislamiento, movilidad reducida). |
| TCAE-RF3 | Media | El TCAE debe poder visualizar el estado de la medicación (administrada / pendiente) y registrar incidencias de bajo nivel (ej. paciente no tomó la medicación con la comida). |
| TCAE-RF4 | Media | El TCAE debe poder visualizar el historial de constantes y cuidados de turnos anteriores. |

---

## 5. Requisitos No Funcionales

| ID | Categoría | Descripción |
|----|-----------|-------------|
| SYS-RNF1 | Seguridad | Los datos clínicos sensibles deben protegerse con cifrado de contraseñas (bcrypt), tokens JWT por sesión y acceso restringido por rol. |
| SYS-RNF2 | Rendimiento | Las acciones frecuentes (cargar ficha de paciente, registrar medicación) deben completarse en ≤ 2 segundos en condiciones normales de red. |
| SYS-RNF3 | Usabilidad | Las tareas más frecuentes para cada rol deben requerir un máximo de 3 clics desde el panel principal (ENF-RNF1 se aplica a todos los roles). |
| SYS-RNF4 | Disponibilidad | El sistema debe estar disponible durante toda la jornada laboral sin interrupciones planificadas en horas de turno activo. |
| SYS-RNF5 | Compatibilidad | La aplicación debe funcionar correctamente en navegadores modernos (Chrome, Edge, Firefox) en equipos Windows del hospital. |
| SYS-RNF6 | Escalabilidad | La arquitectura debe soportar, con cambios mínimos, ampliar a más plantas o más profesionales. |
| SYS-RNF7 | Mantenibilidad | El código debe seguir convenciones consistentes (ESLint + Prettier) y disponer de tests de integración básicos para las rutas críticas de la API. |

---

## 6. API Contracts (Principales Endpoints)

### Autenticación
```
POST   /api/auth/login          → { token, user: { id, name, role } }
POST   /api/auth/logout         → 204 No Content
GET    /api/auth/me             → { id, name, role }
```

### Pacientes
```
GET    /api/patients            → Lista de pacientes de la planta
GET    /api/patients/:id        → Ficha completa del paciente
POST   /api/patients            → Alta de nuevo paciente (Médico)
DELETE /api/patients/:id        → Baja de paciente (Médico)
```

### Medicación
```
GET    /api/patients/:id/medications        → Lista de medicación pautada
POST   /api/patients/:id/medications        → Nueva prescripción (Médico)
PUT    /api/patients/:id/medications/:medId → Modificar pauta / cambiar horario
DELETE /api/patients/:id/medications/:medId → Retirar medicación (Médico)
POST   /api/patients/:id/medications/:medId/administer → Registrar administración (Enfermero)
```

### Cuidados y Constantes
```
GET    /api/patients/:id/care-records       → Historial de cuidados
POST   /api/patients/:id/care-records       → Registrar cuidado/constante (Enfermero, TCAE)
```

### Mapa de Camas
```
GET    /api/beds                → Estado de todas las camas de la planta
PUT    /api/beds/:id/assign     → Asignar paciente a cama
PUT    /api/beds/:id/release    → Liberar cama (dar de alta)
```

### Notificaciones
```
GET    /api/notifications       → Notificaciones del usuario autenticado
PUT    /api/notifications/:id/read → Marcar como leída
```

### Incidencias
```
GET    /api/patients/:id/incidents    → Lista de incidencias del paciente
POST   /api/patients/:id/incidents    → Registrar incidencia
```

### Pruebas Diagnósticas
```
GET    /api/patients/:id/tests        → Pruebas programadas y resultados
POST   /api/patients/:id/tests        → Programar prueba (Médico)
PUT    /api/patients/:id/tests/:testId → Actualizar resultado
```

### Medicamentos (CIMA/AEMPS)
```
GET    /api/drugs/search?q=:nombre    → Búsqueda en API CIMA (proxy)
GET    /api/drugs/:nregistro          → Detalle de medicamento CIMA
```

---

## 7. Modelo de Datos (Principales Entidades)

```
User           { id, name, email, passwordHash, role, createdAt }
Patient        { id, name, dob, diagnosis, allergies, admissionDate, bedId }
Bed            { id, roomNumber, bedLetter, patientId?, floor }
Medication     { id, patientId, drugName, nregistro, dose, route, frequency, startTime, prescribedBy, active }
MedSchedule    { id, medicationId, scheduledAt, administeredAt?, administeredBy? }
CareRecord     { id, patientId, type, value, unit?, notes?, recordedBy, recordedAt }
Notification   { id, userId, type, message, relatedPatientId?, read, createdAt }
Incident       { id, patientId, type, description, reportedBy, reportedAt }
DiagnosticTest { id, patientId, type, name, scheduledAt, result?, requestedBy }
```

---

## 8. Reglas de Negocio

1. **Recálculo de horarios**: Al modificar la primera hora de administración de un fármaco con frecuencia fija (cada N horas), el sistema recalcula automáticamente todos los horarios pendientes del día sin alterar los ya administrados.
2. **Restricción de rol**: Un TCAE no puede prescribir medicación ni acceder al historial clínico completo; un enfermero/a no puede prescribir medicación.
3. **Notificación obligatoria**: Toda prescripción nueva o modificación de medicación activa por parte del médico genera una notificación no descartable para el enfermero asignado al paciente.
4. **Sin duplicidad**: El sistema impide registrar el mismo tipo de constante vital (ej. tensión arterial) dos veces en menos de 15 minutos para el mismo paciente, mostrando un aviso de confirmación.
5. **Acciones en 3 clics**: Las acciones de alta frecuencia (ver paciente desde mapa, marcar medicación administrada, registrar constante) deben ser alcanzables desde el panel principal en ≤ 3 clics.
