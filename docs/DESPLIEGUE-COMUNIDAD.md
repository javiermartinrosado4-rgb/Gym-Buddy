# Despliegue de Comunidad

Esta preparación despliega solamente la API de Comunidad. No ejecuta nada por sí sola ni crea servicios, dominios, cuentas ni certificados hasta que un operador la use.

## Antes de empezar

- Un servidor Linux con Docker Compose, disco persistente y puertos TCP 80 y 443 abiertos.
- Un dominio para la API, por ejemplo `api.tudominio.com`, con un registro A/AAAA apuntando al servidor antes de arrancar Caddy.
- Un origen HTTPS donde se aloje la versión web de Gym Buddy, por ejemplo `https://app.tudominio.com`.
- Identidad legal, email de soporte y política de privacidad terminada antes de abrir Comunidad al público.

No uses almacenamiento efímero para SQLite. La base de datos y las fotos se guardan en el volumen Docker `gym_buddy_data`; perder ese volumen pierde cuentas, sesiones, publicaciones y denuncias.

## Configuración

En la raíz del repositorio, en el servidor:

```bash
cp server/.env.production.example server/.env.production
chmod 600 server/.env.production
```

Edita el archivo real y sustituye los ejemplos. `GYM_ALLOWED_ORIGINS` admite únicamente orígenes web completos y exactos, separados por comas. Para la primera publicación deja `GYM_GOOGLE_CLIENT_ID` vacío: la API devolverá un aviso claro y el acceso por contraseña seguirá funcionando.

Configura la aplicación web y la compilación Android con:

```text
EXPO_PUBLIC_COMMUNITY_URL=https://api.tudominio.com
EXPO_PUBLIC_WEB_URL=https://app.tudominio.com
```

No uses `http`, una IP, `localhost`, ni una URL con parámetros o credenciales en la compilación de producción.

## Arranque y comprobación

```bash
docker compose -f deploy/community/compose.yaml up -d --build
curl --fail https://api.tudominio.com/health
docker compose -f deploy/community/compose.yaml ps
```

Debe responder JSON con `ok: true`. Caddy obtiene y renueva el certificado HTTPS; la API no expone el puerto 8082 al exterior.

Comprueba también desde el navegador de producción: crear cuenta, iniciar/cerrar sesión, publicar y borrar una foto, denuncia, rutina privada, progreso privado y retirada de datos comparativos. No habilites Google hasta terminar su checklist.

## Copias de seguridad y recuperación

Haz una copia diaria cifrada del volumen `gym_buddy_data` fuera del servidor y prueba restaurarla. Antes de copiar manualmente SQLite, detén la API para incluir la base y cualquier archivo WAL/SHM coherentemente:

```bash
docker compose -f deploy/community/compose.yaml stop api
docker run --rm -v gymbuddy_gym_buddy_data:/source:ro -v "$PWD/backups:/backup" alpine sh -c 'tar czf /backup/gym-buddy-$(date +%F).tgz -C /source .'
docker compose -f deploy/community/compose.yaml start api
```

El nombre del volumen puede cambiar según el nombre del proyecto Compose; confirma `docker volume ls` antes de automatizar la orden. Guarda una copia de prueba y documenta quién puede restaurarla.

## Actualización y reversión

1. Guarda una copia verificada del volumen.
2. Ejecuta `git pull --ff-only`, `npm ci` y `npm run check` en un entorno de prueba.
3. Reconstruye con `docker compose -f deploy/community/compose.yaml up -d --build`.
4. Comprueba `/health` y las rutas principales.
5. Si falla, vuelve al commit anterior, reconstruye y restaura la copia solo si hubo una migración de datos incompatible.

No hay migraciones destructivas en la versión actual, pero una actualización futura puede añadirlas. Revisa el diff de `server/app.ts` antes de desplegarlo.
