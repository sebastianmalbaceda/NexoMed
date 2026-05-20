# Guía para el equipo — Configuración tras Pull / Clone

> Actualizado: Mayo 2026

---

## Pasos para que todo funcione

### 1. Clonar o hacer Pull

```powershell
# Si es la primera vez:
git clone https://github.com/sebastianmalbaceda/nexomed.git
cd nexomed

# Si ya tienes el repo:
git pull origin main
```

### 2. Instalar dependencias

```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Variables de entorno

> ✅ **Nota:** Los archivos `.env` ya vienen en el repositorio con la configuración compartida.
> Si ya existen, **puedes omitir este paso**. Solo ejecútalo si por alguna razón faltan.

```powershell
# Backend (omitir si backend/.env ya existe)
cd backend
cp .env.example .env

# Frontend (omitir si frontend/.env ya existe)
cd ../frontend
cp .env.example .env
```

### 4. Sincronizar la Base de Datos

Elige **una** de estas opciones:

#### Opción A — Primera vez o BD nueva

```powershell
cd backend
npx prisma migrate dev    # crea el esquema desde cero
npm run db:seed           # datos de prueba (usuarios, pacientes, camas)
```

#### Opción B — Unirse al proyecto (BD compartida de Neon ya existe)

```powershell
cd backend
npx prisma generate       # regenera el cliente Prisma con el schema actual
npx prisma migrate deploy # aplica migraciones pendientes (NO borra datos)
```

> **No necesitas `db:seed`** — los datos ya existen en la BD compartida.

#### Opción C — Si Prisma da error de archivos bloqueados (Windows)

```powershell
# Cierra los servidores backend/frontend primero, luego:
npx prisma generate
npx prisma db push        # sincroniza schema sin crear migración
```

### 5. Arrancar en desarrollo

```powershell
# Terminal 1 — Backend
cd backend
npm run dev               # Puerto 3000

# Terminal 2 — Frontend
cd ../frontend
npm run dev               # Puerto 5173
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## Credenciales de prueba

| Rol | Email | Contraseña | Turno |
|-----|-------|------------|-------|
| DOCTOR | dr.garcia@nexomed.es | password123 | - |
| NURSE | enf.martinez@nexomed.es | password123 | Mañana |
| NURSE | enf.gomez@nexomed.es | password123 | Mañana |
| NURSE | enf.lopez@nexomed.es | password123 | Tarde |
| NURSE | enf.vera@nexomed.es | password123 | Tarde |
| NURSE | enf.ruiz@nexomed.es | password123 | Noche |
| TCAE | tcae.sanchez@nexomed.es | password123 | Tarde |
| TCAE | tcae.exposito@nexomed.es | password123 | Noche |

---

## Verificación rápida

1. Abre http://localhost:5173/
2. Inicia sesión con cualquiera de las credenciales de arriba
3. Deberías ver el dashboard correspondiente al rol sin errores

---

## Si algo falla

### Error de CORS en el navegador
- Verifica que el frontend corre en puerto 5173 (o 5174)
- El backend acepta ambos puertos por defecto en `.env.example`

### Error 500 en login
- Verifica que ejecutaste `npx prisma generate` después de sincronizar la BD
- Asegúrate de que la columna en la BD se llama `passwordHash`, no `password`

### Error de compilación TypeScript
- Borra `node_modules` y `package-lock.json`, luego `npm install`
- En backend: borra `node_modules/.prisma` y ejecuta `npx prisma generate`

### Error de conexión a BD
- Verifica `backend/.env` — la `DATABASE_URL` debe apuntar a tu instancia de Neon
- Ejecuta `npx prisma db pull` para verificar conexión

### Puerto 5173 ocupado
- Vite intentará usar 5174 automáticamente
- Si quieres liberar 5173: `Get-NetTCPConnection -LocalPort 5173` y mata el proceso

---

## Esquema de la BD (Prisma)

El schema está en `backend/prisma/schema.prisma`. Incluye:
- **User** — médicos, enfermeros, TCAE (con passwordHash)
- **Patient** — pacientes con assignedNurseId y status (ESTABLE/MODERADO/CRITICO/OBSERVACION)
- **Bed** — camas de la planta (12 habitaciones × 2 camas)
- **Medication / MedSchedule** — medicación pautada y horarios
- **CareRecord** — registros de cuidados y constantes
- **Notification** — notificaciones dirigidas al enfermero asignado
- **Incident** — incidencias y evolutivos
- **DiagnosticTest** — pruebas diagnósticas

---

**¡Listo! Con estos pasos tu equipo tendrá todo funcionando correctamente.**
