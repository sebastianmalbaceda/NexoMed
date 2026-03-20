# SECURITY.md — Política de Seguridad de NexoMed

## Versiones con soporte

| Versión | Soporte de seguridad |
|---------|---------------------|
| `main` (sprint activo) | ✅ Soportada |
| `sprint-N` (rama activa) | ✅ Soportada |
| Sprints anteriores cerrados | ❌ Sin soporte (proyecto académico) |

---

## Cómo reportar una vulnerabilidad

NexoMed es un proyecto académico. Sin embargo, aplicamos buenas prácticas de seguridad durante el desarrollo.

Si encuentras una vulnerabilidad de seguridad en el código:

1. **No abras un Issue público en GitHub** con los detalles de la vulnerabilidad.
2. **Contacta directamente** al Product Owner del sprint actual o al Scrum Master por mensaje privado en Teams.
3. Incluye en tu reporte:
   - Descripción de la vulnerabilidad.
   - Pasos para reproducirla.
   - Impacto potencial estimado.
   - Sugerencia de fix si la tienes.

Nos comprometemos a responder en un plazo máximo de **48 horas** y a corregir vulnerabilidades críticas antes del siguiente sprint review.

---

## Prácticas de seguridad implementadas

- **Contraseñas:** almacenadas con bcrypt (salt rounds = 12). Nunca en texto plano.
- **Sesiones:** tokens JWT firmados (HS256) con expiración de 8 horas. Almacenados en memoria del cliente (Zustand), no en localStorage.
- **Autorización:** middleware de roles valida que cada petición viene de un rol con permisos para el recurso solicitado.
- **Variables de entorno:** ningún secreto (JWT_SECRET, credenciales de DB) se sube al repositorio. Uso de `.env` ignorado por `.gitignore`.
- **CORS:** lista blanca de orígenes configurada en el backend.
- **Validación de entradas:** Zod valida todas las entradas en frontend y backend antes de procesarlas.
- **Dependencias:** se recomienda ejecutar `npm audit` periódicamente y resolver vulnerabilidades de severidad alta o crítica.

---

## Datos sensibles — Aviso importante

NexoMed maneja datos clínicos simulados con fines académicos. En el contexto del MVP:

- **No usar datos reales de pacientes** bajo ninguna circunstancia.
- El script de seed solo contiene datos ficticios.
- No conectar la aplicación a sistemas hospitalarios reales.
- No desplegar en infraestructura accesible desde internet sin las medidas de seguridad adecuadas.

---

## Fuera de alcance (MVP académico)

Las siguientes medidas de seguridad quedan fuera del alcance del proyecto académico:

- Certificación EN 82304-1 (seguridad en software sanitario).
- Auditoría de seguridad externa.
- Cumplimiento completo LOPD/RGPD clínico.
- Cifrado de base de datos en reposo.
- Firma electrónica certificada.
- Penetration testing formal.
