# Verificación de Akhyles — revisión de requisitos

7 de septiembre de 2026. Revisión final de los cambios locales: TypeScript y ESLint sin errores. Las 14 pruebas de lógica pasan, incluyendo 420 combinaciones de perfil, volumen semanal, especialización, progresión de 35 a 36,25 kg, exclusiones del cálculo de puntuación, calendario semanal y comparación de sesiones equivalentes. Las 11 pruebas de navegador pasan: registro y recarga, navegación flexible durante el entrenamiento, borradores por ejercicio, ejercicios omitidos, edición durante una sesión, cierre/reapertura local, comunidad, migración voluntaria de rutinas, fotografías simuladas, accesibilidad, persistencia y resumen de Hoy.

El recorrido de Hoy verifica una sesión terminada con mejora y después una bajada de rendimiento: los consejos de recuperación aparecen solo en la bajada e incluyen dormir 8 horas con los mismos horarios y 1,8 gramos de proteína por kilo de peso corporal al día. También comprueba que no haya desbordamiento horizontal a 390 px. La exportación web se ha regenerado con estos cambios. No se han conectado servicios externos ni resuelto las decisiones de diseño enumeradas como pendientes en los requisitos.

`npx.cmd expo export --platform web` completado correctamente en `dist`. Revisadas visualmente las capturas de Rutina y Comunidad (390 px). No probado en dispositivos Android/iOS. Las pruebas utilizan perfiles aislados, sin alterar el perfil real del navegador del usuario.

Las reglas nuevas y sus límites están en `REQUISITOS-AKHYLES.md`. La puntuación es experimental; comunidad remota e IA siguen pendientes. El informe siguiente es histórico y describe la primera versión, cuyas reglas de duración y progresión se han sustituido.

## Informe histórico de la primera versión

Comprobaciones realizadas el 7 de septiembre de 2026 en Windows, con Node.js 24.20.0 y Expo SDK 57.

| Comprobación | Resultado |
| --- | --- |
| Dependencias instaladas con Expo | Correcto; `expo install --check` sin incompatibilidades |
| TypeScript (`npm run typecheck`) | Sin errores |
| Lint (`npm run lint`) | Sin errores ni advertencias |
| Pruebas de lógica (`npm test`) | 8 aprobadas |
| Diagnóstico de Expo (`npx expo-doctor`) | 21/21 comprobaciones aprobadas |
| Navegador real (`npm run test:e2e`) | 7 recorridos aprobados, Chromium |
| Exportación optimizada (`npx expo export --platform web`) | Generada en `dist` |
| Servidor local | Responde HTTP 200 en http://localhost:8081 |

La lógica comprueba 210 combinaciones de nivel, disponibilidad y prioridad, cobertura muscular, restricciones de peso libre, sustituciones, isquios sentado, series, duración y redondeo de cargas. También verifica contraste mínimo de 4,5:1 para las combinaciones de texto y fondos usadas en ambos temas.

Los recorridos de navegador cubren:

1. Teclado, activación con espacio/Intro y foco visible.
2. Recuperación ante datos locales dañados, conservando el original.
3. Error de guardado y reintento posterior correcto.
4. Edición de perfil, cambio a siete días disponibles, generación de cinco días y conservación de preferencias de equipamiento.
5. Onboarding, validación, navegación hacia atrás, recargas, edición de ejercicios, registro completo, confirmación de cargas e historial.
6. Restricción de edad, consentimiento, selección de fotos, simulación, resultado editable y ausencia de imágenes en la persistencia.
7. Sustituciones, ejercicios personalizados, demostración de progresión, temas manuales y automático, y pantalla estrecha.

Se han inspeccionado capturas de la bienvenida, rutina, tema oscuro y formato móvil. Los datos de las pruebas están aislados en contextos de navegador de prueba; no se han introducido en el navegador personal del usuario.

## Límites de la verificación

No se ha probado una compilación nativa de iOS o Android, ni un análisis corporal real. La duración del ejercicio es estimada y no mide esperas reales de gimnasio.

`npm audit` informa de 13 avisos moderados transitivos del SDK, documentados en README. No hay una corrección automática compatible con las versiones instaladas que proponga npm; no se aplicó `audit fix --force`, que degradaría Expo y Router. Esta revisión no equivale a una auditoría de seguridad ni a una validación profesional del programa de entrenamiento.
