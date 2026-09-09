# Materiales para Google Play

Estado: preparado para la ficha; **no enviado a Play Console**. Revisa los campos entre corchetes antes de copiarlos. La política de privacidad debe estar publicada en una URL HTTPS accesible sin iniciar sesión.

## Identidad de la aplicación

| Campo | Valor |
| --- | --- |
| Nombre | Gym Buddy |
| Paquete | `com.javiermartinrosado.gymbuddy` |
| Versión inicial | 1.0.0 (`versionCode` 1) |
| Categoría propuesta | Salud y bienestar |
| Email de soporte | [EMAIL DE SOPORTE] |
| Sitio web | [URL WEB PÚBLICA] |
| Política de privacidad | [URL HTTPS DE PRIVACIDAD] |

## Textos en español (España)

**Descripción breve** (máximo 80 caracteres):

> Planifica tu rutina, registra tus series y progresa a tu ritmo.

**Descripción completa:**

> Gym Buddy te ayuda a organizar tus entrenamientos de fuerza y a convertir tus registros en una rutina que puedas seguir.
>
> • Crea una rutina adaptada a tus días, nivel, prioridad muscular y equipamiento.
> • Registra peso y repeticiones serie a serie; prepara la siguiente carga cuando completas el rango objetivo.
> • Consulta tu calendario, historial, peso corporal y gráficas de progreso.
> • Ajusta ejercicios, disponibilidad y preferencias sin perder tus datos locales.
> • Elige tema claro, oscuro o el del sistema.
>
> Comunidad es opcional. Permite crear una cuenta, compartir publicaciones y conectar con otras personas cuando el servicio esté disponible. Tus entrenamientos y medidas se guardan localmente y no se sincronizan automáticamente por crear una cuenta.
>
> Gym Buddy no sustituye el consejo médico, nutricional ni de entrenamiento profesional. Ajusta el ejercicio a tus necesidades y consulta a un profesional ante dolor, lesión o dudas de salud.

## Recursos gráficos pendientes

Los iconos de Android ya están en `assets/brand/`. Para la ficha hacen falta archivos finales propios, sin texto ilegible ni marcas de terceros:

| Recurso | Especificación de Play | Estado |
| --- | --- | --- |
| Icono de aplicación | PNG 512 × 512 | Usar/derivar de `assets/brand/icon.png` y revisar en Play Console |
| Imagen destacada | PNG 1024 × 500 sin transparencia | `assets/play/feature-graphic.png` preparada |
| Capturas de teléfono | mínimo 2; PNG/JPEG, entre 320 y 3840 px por lado | Pendientes de capturas limpias de dispositivo real/emulador |
| Capturas de tablet | Solo si se declara compatibilidad/promoción para tablet | Pendiente de decisión |

Capturas sugeridas: pantalla Hoy, registro de series, calendario, progreso y perfil/tema. No uses perfiles reales, correos, fotos personales, contraseñas ni pantallas de funciones todavía no activadas. `artifacts/android/qa/` contiene capturas técnicas que sirven de referencia, pero hay que generar las finales con estado limpio y sin la barra/entorno de pruebas.

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

1. Crear la aplicación en Play Console con el paquete ya fijado.
2. Completar titular, email, web, política HTTPS y clasificación de contenido con datos reales.
3. Crear cliente OAuth Android usando el paquete y la huella SHA-1 documentada en `ANDROID-QA.md`, si se habilita Google.
4. Completar Seguridad de datos con el hosting y política definitivos.
5. Verificar el borrado de cuenta desde Comunidad; la app ya borra los datos de Comunidad del servidor, pero el plazo de purga de copias debe definirse en la política final.
6. Subir el AAB firmado con la misma clave de publicación; nunca subas la clave privada.
7. Empezar por prueba interna. Instalar desde Play, probar actualización, inicio offline, Comunidad, Google y borrado/retirada de datos.
8. Revisar pre-lanzamiento, dispositivos incompatibles, requisitos de versión objetivo y advertencias.
9. Solicitar revisión de producción solo con autorización explícita del titular de la cuenta.
