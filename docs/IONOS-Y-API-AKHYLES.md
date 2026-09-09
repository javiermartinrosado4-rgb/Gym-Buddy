# Web de Akhyles, DNS y API

Estado a 9 de septiembre de 2026: el borrador de la web se ha creado en IONOS y
no está publicado. `akhyles.com` sigue apuntando a IONOS. No existe todavía un
registro público para `api.akhyles.com` ni un backend de Comunidad desplegado.

## Qué aloja cada parte

| Dirección | Servicio | Estado requerido |
| --- | --- | --- |
| `https://akhyles.com` | Web pública, soporte y privacidad | IONOS Website Builder o un hosting web equivalente |
| `https://www.akhyles.com` | Redirección al dominio principal | DNS/redirección en IONOS |
| `https://api.akhyles.com` | Backend de Comunidad | Servidor Linux con Docker, disco persistente y Caddy |

IONOS puede alojar la web informativa. Comunidad no debe ejecutarse en un editor
web estático: necesita un proceso Node persistente, SQLite en volumen persistente,
copias cifradas y un proxy HTTPS. Puede contratarse un VPS en IONOS o usarse otro
proveedor; en ambos casos el DNS del dominio se administra desde IONOS.

## Pantallas que habrá que abrir cuando se vaya a activar

1. IONOS > **Dominios y SSL** > seleccionar `akhyles.com` > **DNS**. Crear un
   registro `A` para el host `api` con la IP pública del VPS. Crear `AAAA` solo si
   el servidor tiene IPv6 configurado y accesible. No cambiar los registros MX del
   correo existente.
2. Panel del proveedor del servidor > crear VPS Linux con IP pública, almacenamiento
   persistente y puertos 80/443. Instalar Docker y Docker Compose. No abrir el
   puerto interno 8082 a Internet.
3. En el servidor, clonar el repositorio y crear los archivos privados
   `server/.env.production`, `server/.env.backup` y `server/backup-password.txt`
   según [DESPLIEGUE-COMUNIDAD.md](DESPLIEGUE-COMUNIDAD.md). Los secretos se escriben
   directamente allí; no se pegan en Git ni en variables `EXPO_PUBLIC_*`.
4. Esperar la propagación DNS y comprobar `https://api.akhyles.com/health`. Caddy
   solicitará y renovará el certificado TLS automáticamente cuando el DNS y el
   puerto 80 sean correctos.
5. Solo entonces definir
   `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com`, ejecutar la guardia de
   release y generar el APK/AAB conectados. La variante offline actual no activa
   Comunidad.

## Antes de publicar la web

La web debe tener enlaces públicos y correctos a política de privacidad, eliminación
de cuenta y soporte. Faltan dos datos que solo puede confirmar el titular:

- El correo exacto que recibirá solicitudes de soporte y borrado.
- La identidad legal/responsable y dirección que correspondan al aviso legal.

No se debe publicar una política con marcadores, un formulario cuyo correo no se ha
comprobado, cifras inventadas ni promesas de funciones aún no desplegadas. Pulsar
**Publicar** en IONOS es una acción pública y se confirmará expresamente en ese
momento.
