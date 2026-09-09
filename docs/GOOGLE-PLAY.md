# Materiales para Google Play

Estado: preparado para la ficha; **no enviado a Play Console**. Revisa los campos entre corchetes antes de copiarlos. La política de privacidad debe estar publicada en una URL HTTPS accesible sin iniciar sesión.

## Identidad de la aplicación

| Campo | Valor |
| --- | --- |
| Nombre | Akhyles |
| Paquete | `com.javiermartinrosado.gymbuddy` |
| Versión actual | 1.0.1 (`versionCode` 3); comprobar si Play exige uno superior |
| Categoría propuesta | Salud y bienestar |
| Email de soporte | [EMAIL DE SOPORTE] |
| Sitio web | [URL WEB PÚBLICA] |
| Política de privacidad | [URL HTTPS DE PRIVACIDAD] |

## Textos en español (España)

**Descripción breve** (máximo 80 caracteres):

> Planifica tu rutina, registra tus series y progresa a tu ritmo.

**Descripción completa:**

> Akhyles te ayuda a organizar tus entrenamientos de fuerza y a convertir tus registros en una rutina que puedas seguir.
>
> • Crea una rutina adaptada a tus días, nivel, prioridad muscular y equipamiento.
> • Registra peso y repeticiones serie a serie; prepara la siguiente carga cuando completas el rango objetivo.
> • Consulta tu calendario, historial, peso corporal y gráficas de progreso.
> • Ajusta ejercicios, disponibilidad y preferencias sin perder tus datos locales.
> • Elige tema claro, oscuro o el del sistema.
>
> Comunidad es opcional. Permite crear una cuenta, compartir publicaciones y conectar con otras personas cuando el servicio esté disponible. Tus entrenamientos y medidas se guardan localmente y no se sincronizan automáticamente por crear una cuenta.
>
> Akhyles no sustituye el consejo médico, nutricional ni de entrenamiento profesional. Ajusta el ejercicio a tus necesidades y consulta a un profesional ante dolor, lesión o dudas de salud.

## Recursos gráficos

Los iconos de Android ya están en `assets/brand/`. Para la ficha hacen falta archivos finales propios, sin texto ilegible ni marcas de terceros:

| Recurso | Especificación de Play | Estado |
| --- | --- | --- |
| Icono de aplicación | PNG 512 × 512 | `assets/play/icon-512.png` |
| Imagen destacada | PNG 1024 × 500 sin transparencia | `assets/play/feature-graphic.png` preparada |
| Capturas de teléfono | mínimo 2; PNG/JPEG, entre 320 y 3840 px por lado | `assets/play/screenshots/`: capturas reales de la APK v2 en emulador |
| Capturas de tablet | Solo si se declara compatibilidad/promoción para tablet | Pendiente de decisión |

Se incluyen dos capturas reales de Calendario y Progreso con datos sintéticos. No uses perfiles reales, correos, fotos personales, contraseñas ni pantallas de funciones todavía no activadas. `artifacts/android/qa/` contiene evidencias técnicas adicionales que no forman parte de la ficha. Renovar las capturas si cambia la interfaz de la versión que se envíe.

## Formulario de seguridad de datos — borrador técnico

No marques estos datos como definitivos hasta cerrar hosting, analytics, soporte y política legal.

| Categoría de Play | Tratamiento actual | Compartido | Obligatorio |
| --- | --- | --- | --- |
| Información personal (nombre, alias, bio) | Solo al crear cuenta de Comunidad | No, salvo perfil/alias visibles según función | No |
| Fotos y vídeos | Solo al publicar voluntariamente en Comunidad | Sí, publicación pública | No |
| Salud y forma física (medidas, rutina, registros) | Local en el dispositivo; resumen opcional para comparación/progreso | No salvo lo que el usuario activa explícitamente | No |
| Identificadores de usuario | Cuenta y sesión de Comunidad | No | Solo para Comunidad |
| Datos de uso/diagnóstico | [CONFIRMAR LOGS DEL HOSTING] | [CONFIRMAR] | [CONFIRMAR] |

No hay publicidad, venta de datos, analítica de terceros, acceso a contactos, ubicación, cámara, micrófono ni lectura completa de la galería en la APK actual. Reconfirma esto contra la versión que se vaya a subir y los SDK añadidos.

## Checklist de envío

Abrir https://play.google.com/console > seleccionar/crear Akhyles > **Pruebas y
lanzamiento > Pruebas > Prueba interna > Crear versión**. Solo subir el AAB conectado
tras comprobar URL HTTPS, firma y Google real. La autorización recibida permite la
pista interna, no producción. Si no hay sesión/permisos, guardar el material local.

En **Integridad de la app** comprobar la clave de distribución de Play y registrar
su SHA-1 en Google además de la firma local. No aceptar una nueva clave local para
resolver un error de subida. Para primeras cuentas personales pueden existir
requisitos de pruebas cerradas adicionales antes de solicitar acceso a producción.

### Clasificación de contenido: respuestas técnicas para revisar

| Tema del cuestionario IARC | Comportamiento actual |
| --- | --- |
| Contenido generado por usuarios / intercambio de imágenes | Sí, fotos y textos públicos en Comunidad |
| Comunicación/interacción entre usuarios | Sí, perfiles, seguimiento y reacciones; no chat privado |
| Violencia, sexo, lenguaje ofensivo, drogas | No incluidos en el contenido editorial; UGC requiere controles y moderación |
| Apuestas, compras, publicidad | No implementadas |
| Ubicación precisa o contacto con desconocidos | Sin ubicación ni contactos; perfiles públicos permiten interacción |
| Información de salud/ejercicio | Sí, planificador de entrenamiento y estimaciones; revisar declaración de apps de salud |

No asignar una edad IARC inventada: la calcula el cuestionario real de Play. El titular
debe fijar la audiencia/edad mínima y revisar contenido UGC antes de enviar.

### Bloqueos de política pendientes

La API permite denunciar y borrar cuentas, pero antes de abrir UGC al público debe
terminarse la aceptación de normas, el bloqueo de usuarios y un procedimiento de
moderación atendido por el operador. No declarar moderación operativa sin comprobarla.
Publicar una URL externa de solicitud de borrado además del botón dentro de la app;
la política de privacidad no basta por sí sola si no ofrece ese procedimiento.
Completar responsable, soporte, país del hosting, conservación y proveedores.

Referencias oficiales: [pruebas internas](https://support.google.com/googleplay/android-developer/answer/9845334),
[borrado de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111),
[requisitos de cuentas personales](https://support.google.com/googleplay/android-developer/answer/14151465).

1. Crear la aplicación en Play Console con el paquete ya fijado.
2. Completar titular, email, web, política HTTPS y clasificación de contenido con datos reales.
3. Crear cliente OAuth Android usando el paquete y la huella SHA-1 documentada en `ANDROID-QA.md`, si se habilita Google.
4. Completar Seguridad de datos con el hosting y política definitivos.
5. Verificar el borrado de cuenta desde Comunidad; la app ya borra los datos de Comunidad del servidor, pero el plazo de purga de copias debe definirse en la política final.
6. Subir el AAB firmado con la misma clave de publicación; nunca subas la clave privada.
7. Empezar por prueba interna. Instalar desde Play, probar actualización, inicio offline, Comunidad, Google y borrado/retirada de datos.
8. Revisar pre-lanzamiento, dispositivos incompatibles, requisitos de versión objetivo y advertencias.
9. Solicitar revisión de producción solo con autorización explícita del titular de la cuenta.
