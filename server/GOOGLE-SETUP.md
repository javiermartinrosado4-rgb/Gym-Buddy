# Acceso con Google (web y Android)

1. En Google Cloud, configura la pantalla de consentimiento, el correo de asistencia y la información pública de la aplicación.
2. Autoriza los orígenes exactos donde se abre Gym Buddy (desarrollo: `http://localhost:8081` y `http://127.0.0.1:8081`; producción: el dominio HTTPS real).
3. Define `GYM_GOOGLE_CLIENT_ID` en el entorno del servidor con el identificador terminado en `.apps.googleusercontent.com` y reinicia el servidor de Comunidad. No se necesita un secreto de cliente para este flujo.
4. Si la aplicación de Google está en pruebas, incluye las cuentas de prueba en su configuración.
5. Para Android, crea además un cliente OAuth de tipo Android con el paquete `com.javiermartinrosado.gymbuddy` y la huella SHA-1 de la firma de publicación que figura en `ANDROID-QA.md`. El cliente web sigue siendo el `webClientId` que recibe el flujo nativo para verificar el ID token en el backend.
6. Añade el dominio HTTPS real a los orígenes autorizados del cliente web. El cliente Android se vincula por paquete y SHA-1, no por origen web.
7. Abre Inicio, Perfil o Comunidad y usa el botón oficial de Google. Comprueba cancelación, cierre de sesión y acceso posterior con la misma cuenta tanto en web como en Android.

El servidor verifica firma, audiencia, emisor, caducidad, correo verificado y nonce de un solo uso mediante la biblioteca oficial. La identidad se vincula al `sub` de Google, nunca a un nombre o correo recibido sin verificar. No se fusionan cuentas existentes automáticamente. La rutina y el historial siguen siendo locales; acceder desde otro dispositivo no los sincroniza.

La APK ya integra Credential Manager para Android, pero no se debe anunciar ni activar Google hasta completar estos clientes y las pruebas contra el backend HTTPS real.

Documentación: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
