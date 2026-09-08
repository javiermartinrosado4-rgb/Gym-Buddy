# Acceso con Google (web)

1. En Google Cloud, configura la pantalla de consentimiento y crea un cliente OAuth de tipo Aplicación web.
2. Autoriza los orígenes exactos donde se abre Gym Buddy (desarrollo: `http://localhost:8081` y `http://127.0.0.1:8081`; producción: el dominio HTTPS real).
3. Define `GYM_GOOGLE_CLIENT_ID` en el entorno del servidor con el identificador terminado en `.apps.googleusercontent.com` y reinicia el servidor de Comunidad. No se necesita un secreto de cliente para este flujo.
4. Si la aplicación de Google está en pruebas, incluye las cuentas de prueba en su configuración.
5. Abre Inicio, Perfil o Comunidad y usa el botón oficial de Google. Comprueba cierre de sesión y acceso posterior con la misma cuenta.

El servidor verifica firma, audiencia, emisor, caducidad, correo verificado y nonce de un solo uso mediante la biblioteca oficial. La identidad se vincula al `sub` de Google, nunca a un nombre o correo recibido sin verificar. No se fusionan cuentas existentes automáticamente. La rutina y el historial siguen siendo locales; acceder desde otro dispositivo no los sincroniza.

La integración de Google de esta versión se implementa para web. Las compilaciones nativas necesitan sus propios clientes OAuth y un flujo nativo antes de ofrecer este acceso.

Documentación: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
