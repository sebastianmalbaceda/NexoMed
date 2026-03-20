# ARCHITECTURE.md — Arquitectura Técnica de NexoMed

> Versión: 1.0.0 | Fecha: Marzo 2026

---

## 1. Visión General

NexoMed sigue una arquitectura **Cliente-Servidor desacoplada**, con una SPA (Single Page Application) como cliente y una API REST como servidor. Ambas capas se comunican exclusivamente por HTTP/JSON. El sistema se despliega en entornos Windows de hospital accediendo desde cualquier navegador moderno.

```
┌──────────────────────────────────────┐
│           NAVEGADOR (SPA)            │
│   React 18 + Vite + TypeScript       │
│   Tailwind CSS + Shadcn UI           │
│   TanStack Query + Zustand           │
└──────────────┬───────────────────────┘
               │  HTTP / REST (JSON)
               │  JWT en Authorization header
┌──────────────▼───────────────────────┐
│           API REST (Backend)         │
│   Node.js + Express                  │
│   Middleware: auth, roles, cors      │
│   Motor de notificaciones (polling)  │
└──────┬───────────────────────┬───────┘
       │                       │
┌──────▼──────┐        ┌───────▼──────────┐
│  PostgreSQL  │        │  API CIMA/AEMPS  │
│  Prisma ORM  │        │  (medicamentos)  │
└─────────────┘        └──────────────────┘
```

---

## 2. Capa de Presentación — Frontend

### Stack

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 18 | Framework UI principal |
| Vite | 5 | Build tool y dev server (HMR) |
| TypeScript | 5.4 | Tipado estático |
| Tailwind CSS | 3 | Utilidades CSS |
| Shadcn UI | latest | Componentes accesibles (modales, cards, sheets) |
| Lucide React | latest | Iconografía médica |
| React Router DOM | v6 | Enrutamiento SPA sin recarga |
| React Hook Form | latest | Gestión de formularios |
| Zod | latest | Validación de esquemas en cliente |
| TanStack Query | v5 | Cache, fetching y revalidación en segundo plano |
| Zustand | latest | Estado global ligero (sesión, token JWT, rol) |

### Estructura de Directorios (Frontend)

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                    ← Enrutador raíz
│   │   ├── components/
│   │   │   ├── ui/                    ← Shadcn UI (accordion, button, card…)
│   │   │   ├── figma/                 ← Componentes de referencia Figma
│   │   │   ├── Sidebar.tsx            ← Barra de navegación lateral por rol
│   │   │   ├── Header.tsx             ← Cabecera con usuario, turno y notificaciones
│   │   │   ├── BedMap.tsx             ← Mapa de camas de la planta
│   │   │   ├── DashboardOverview.tsx  ← Panel resumen del turno
│   │   │   ├── MedicalSchedule.tsx    ← Cronograma de tareas / medicación
│   │   │   ├── DiagnosticTests.tsx    ← Pruebas diagnósticas
│   │   │   ├── ShiftReport.tsx        ← Informe de traspaso de turno
│   │   │   ├── UnifiedHistory.tsx     ← Historial unificado del paciente
│   │   │   ├── RealtimeNotifications.tsx ← Panel de alertas en tiempo real
│   │   │   └── QuickActions.tsx       ← Acciones rápidas (≤ 3 clics)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   ├── BedMapPage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   └── IncidentsPage.tsx
│   │   ├── hooks/                     ← Custom hooks (usePatient, useMedication…)
│   │   ├── store/                     ← Zustand stores (authStore, notificationStore)
│   │   └── lib/                       ← Helpers, axios instance, constantes
│   ├── styles/
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   ├── theme.css                  ← Variables de color del sistema de diseño
│   │   └── fonts.css
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
└── package.json
```

### Flujo de Navegación por Rol

```
Login
  ├── rol: enfermero  → /dashboard/nurse  (DashboardOverview + BedMap)
  ├── rol: medico     → /dashboard/doctor (HistorialCompleto + Prescripcion)
  └── rol: tcae       → /dashboard/tcae   (CuidadosBasicos + Constantes)

Rutas comunes (con guard por rol):
  /patients/:id          ← Ficha del paciente (datos según rol)
  /patients/:id/meds     ← Medicación del paciente
  /patients/:id/care     ← Cuidados y constantes
  /patients/:id/tests    ← Pruebas diagnósticas
  /beds                  ← Mapa de camas
  /schedule              ← Cronograma de turno (Enfermero)
  /incidents             ← Módulo de incidencias
```

---

## 3. Capa de Negocio — Backend

### Stack

| Tecnología | Propósito |
|-----------|-----------|
| Node.js 20 | Runtime |
| Express 4 | Framework REST |
| Prisma ORM | Modelado DB + migraciones |
| jsonwebtoken | Tokens JWT por sesión |
| bcrypt | Hash de contraseñas |
| cors | Política CORS entre front y back |
| axios / node-fetch | Proxy a API CIMA/AEMPS |

### Estructura de Directorios (Backend)

```
backend/
├── src/
│   ├── index.ts               ← Entry point + server setup
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── patient.routes.ts
│   │   ├── medication.routes.ts
│   │   ├── careRecord.routes.ts
│   │   ├── bed.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── incident.routes.ts
│   │   ├── diagnosticTest.routes.ts
│   │   └── drug.routes.ts     ← Proxy CIMA/AEMPS
│   ├── controllers/           ← Lógica de negocio por entidad
│   ├── middleware/
│   │   ├── auth.middleware.ts  ← Verificación JWT
│   │   └── role.middleware.ts  ← Guard de permisos por rol
│   ├── services/
│   │   ├── medication.service.ts  ← Lógica de recálculo de horarios
│   │   ├── notification.service.ts← Emisión de alertas
│   │   └── cima.service.ts        ← Integración API CIMA
│   ├── prisma/
│   │   └── schema.prisma      ← Modelo de datos
│   └── lib/
│       └── prismaClient.ts    ← Instancia singleton de Prisma
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                ← Datos de prueba
└── package.json
```

### Middleware Pipeline

```
Request
  → cors()
  → express.json()
  → authMiddleware (verifica JWT, adjunta req.user)
  → roleMiddleware (verifica permisos del rol)
  → Controller
  → Response
```

---

## 4. Capa de Datos — Base de Datos

### Motor

**PostgreSQL 15** — base de datos relacional. Elegida por su robustez con relaciones complejas propias de historiales clínicos y su excelente soporte en Prisma ORM.

### Esquema Principal (Prisma)

```prisma
model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         Role      // NURSE | DOCTOR | TCAE
  createdAt    DateTime  @default(now())
  notifications Notification[]
  prescriptions Medication[]    @relation("PrescribedBy")
}

model Patient {
  id            String    @id @default(cuid())
  name          String
  dob           DateTime
  diagnosis     String
  allergies     String[]
  admissionDate DateTime  @default(now())
  bed           Bed?      @relation(fields: [bedId], references: [id])
  bedId         String?
  medications   Medication[]
  careRecords   CareRecord[]
  incidents     Incident[]
  diagnosticTests DiagnosticTest[]
}

model Bed {
  id         String   @id @default(cuid())
  room       Int
  letter     String   // A | B
  floor      Int      @default(1)
  patient    Patient?
}

model Medication {
  id           String        @id @default(cuid())
  patient      Patient       @relation(fields: [patientId], references: [id])
  patientId    String
  drugName     String
  nregistro    String?       // código CIMA
  dose         String
  route        String        // oral | IV | SC | IM
  frequencyHrs Int           // cada N horas
  startTime    DateTime
  active       Boolean       @default(true)
  prescribedBy User          @relation("PrescribedBy", fields: [prescribedById], references: [id])
  prescribedById String
  schedules    MedSchedule[]
  createdAt    DateTime      @default(now())
}

model MedSchedule {
  id             String      @id @default(cuid())
  medication     Medication  @relation(fields: [medicationId], references: [id])
  medicationId   String
  scheduledAt    DateTime
  administeredAt DateTime?
  administeredBy String?
}

model CareRecord {
  id         String   @id @default(cuid())
  patient    Patient  @relation(fields: [patientId], references: [id])
  patientId  String
  type       String   // constante | cura | higiene | balance | ingesta
  value      String
  unit       String?
  notes      String?
  recordedBy String
  recordedAt DateTime @default(now())
}

model Notification {
  id               String   @id @default(cuid())
  user             User     @relation(fields: [userId], references: [id])
  userId           String
  type             String   // MED_CHANGE | MED_NEW | MED_REMOVED
  message          String
  relatedPatientId String?
  read             Boolean  @default(false)
  createdAt        DateTime @default(now())
}

model Incident {
  id          String   @id @default(cuid())
  patient     Patient  @relation(fields: [patientId], references: [id])
  patientId   String
  type        String   // MED_REFUSAL | CARE_INCIDENT
  description String
  reportedBy  String
  reportedAt  DateTime @default(now())
}

model DiagnosticTest {
  id          String   @id @default(cuid())
  patient     Patient  @relation(fields: [patientId], references: [id])
  patientId   String
  type        String   // LAB | IMAGING
  name        String
  scheduledAt DateTime
  result      String?
  requestedBy String
}

enum Role {
  NURSE
  DOCTOR
  TCAE
}
```

---

## 5. Integración Externa — API CIMA/AEMPS

El backend actúa como proxy para la API pública de medicamentos del CIMA (AEMPS), evitando problemas de CORS y centralizando el cacheo de resultados.

```
Frontend → POST /api/drugs/search?q=paracetamol
         → Backend → GET https://cima.aemps.es/cima/rest/medicamentos?nombre=paracetamol
         → Backend filtra y normaliza respuesta → Frontend
```

Documentación oficial: [CIMA-REST-API v1.19](https://sede.aemps.gob.es/docs/CIMA-REST-API_1_19.pdf)

---

## 6. Autenticación y Seguridad

- **JWT**: tokens firmados (HS256) con expiración de 8 horas (duración de un turno hospitalario). Almacenados en Zustand (memoria) en el cliente — no en localStorage.
- **bcrypt**: hash de contraseñas con salt rounds = 12.
- **CORS**: lista blanca de orígenes (solo `localhost:5173` en desarrollo, dominio de despliegue en producción).
- **Role Guard**: middleware `roleMiddleware` rechaza peticiones con código 403 si el rol del token no tiene permisos para el endpoint solicitado.
- **Validación**: Zod en frontend y validación de tipos TypeScript en backend para todas las entradas de usuario.

---

## 7. Notificaciones en Tiempo Real

En el MVP académico se implementa mediante **polling activo** desde el cliente:
- TanStack Query realiza un refetch de `/api/notifications` cada **5 segundos** cuando el usuario está activo.
- El backend compara el timestamp de la última notificación enviada y responde con las nuevas.
- Las notificaciones no leídas se muestran como badge en el Header y en el panel `RealtimeNotifications`.

> **Nota de arquitectura:** Para un sistema en producción real se reemplazaría el polling por WebSockets (Socket.io) o Server-Sent Events para reducir la latencia y la carga en el servidor.

---

## 8. Decisiones de Arquitectura Clave

| Decisión | Alternativa considerada | Motivo |
|----------|------------------------|--------|
| SPA + API REST desacopladas | Monolito server-side (Next.js SSR) | Mayor flexibilidad de despliegue; separa la lógica de frontend y backend; más fácil de mantener entre dos equipos |
| PostgreSQL | MySQL | PostgreSQL maneja mejor arrays (alergias), JSON parcial y tipos complejos propios de datos clínicos |
| Prisma ORM | SQL directo / Sequelize | Migraciones automáticas, tipado TypeScript nativo, reducción de errores por SQL manual |
| JWT en memoria (Zustand) | localStorage | Evita ataques XSS de lectura de token; el token se pierde al cerrar el tab (comportamiento deseable en entorno clínico) |
| Polling (vs WebSockets) | Socket.io | Suficiente para el MVP académico con 8 usuarios; reduce complejidad de despliegue |
| Proxy CIMA en backend | Llamada directa desde frontend | Evita CORS, permite cacheo futuro, centraliza el manejo de errores de la API externa |
