# Gym Buddy

Aplicación local de gimnasio en español, construida con React Native, Expo SDK 57, Expo Router y TypeScript. El proyecto conserva la carpeta y el slug técnico `gym60` para mantener los accesos y los datos existentes.

## Abrir

Abre **Abrir Gym Buddy.cmd** desde esta carpeta. La app está en http://localhost:8081. Los lanzadores antiguos Gym60 también funcionan. Para detenerla puedes usar **Detener Gym60.cmd**.

Los datos se guardan en este navegador y dirección. No hay cuentas remotas ni sincronización. Cerrar la sesión local conserva perfil, rutina e historial y permite volver sin contraseña; no es un bloqueo de seguridad.

## Funciones actuales

- Perfil editable: nombre, @ local, datos corporales, nivel, días, prioridad, glúteos, equipamiento y especialización avanzada.
- Calendario semanal editable: se eligen los días concretos disponibles y cada sesión aparece asignada a uno. Hoy muestra la sesión exacta, descanso, sesión en curso o sesión terminada.
- Descansos de 3–5 minutos y límite de 5 ejercicios en principiantes, 6 en intermedios/avanzados. En planes de 4–5 días, máximo 2 ejercicios pesados por sesión; bíceps se concentra en Torso A y tríceps en Torso B salvo que sean prioridad.
- Volumen semanal visible por grupo muscular: 4 series en grupos definidos como pequeños en los requisitos, 6/8 en grandes, y 16 en la especialización avanzada seleccionada.
- Orden editable, alternancia de músculos y distribución de remos/jalones; duración realista estimada sin garantizar menos de 60 minutos.
- Ejercicios sustituibles y personalizados, cargas, repeticiones, series e incrementos disponibles configurables.
- Sesiones persistentes: guardar y salir, continuar después de recargar, moverse entre ejercicios con flechas sin perder borradores, corregir registros y omitir un ejercicio solo durante la sesión actual.
- Progresión automática para la siguiente sesión cuando todas las series alcanzan el máximo con la misma carga. Incremento disponible más cercano al 4 % dentro del 3–5 %. El ejemplo de 35 kg prepara 36,25 kg. Si el material no permite ese rango, se mantiene el peso y se explica. El peso se puede editar directamente dentro de cada serie.
- Gráficas reales de peso corporal y carga por ejercicio con repeticiones. Peso corporal guardado al iniciar cada sesión nueva.
- Tras completar la sesión, Hoy muestra estadísticas del entrenamiento y acumuladas, además de una tendencia frente a la sesión anterior equivalente.
- Cuando el rendimiento baja, Hoy muestra consejos concretos: dormir 8 horas con horarios constantes, 1,8 g de proteína por kilo de peso corporal al día, energía e hidratación suficientes. El día de descanso también recuerda el objetivo de sueño.
- Puntuación experimental de carga relativa, restringida a ejercicios homologados. No representa aún un nivel real.
- Comunidad entre Progreso y Perfil, con explicación de las funciones futuras.
- Carpeta `referencias-visuales` para las imágenes y capturas que aporte Javier.

Si ya tenías una rutina, entra en Rutina y pulsa **Actualizar rutina a nuevas reglas** para regenerar distribución y series. Se mantienen historial, cargas y preferencias. Los cambios personales desde Perfil conservan el plan; cambiar la programación sí lo regenera.

## Límites actuales y decisiones pendientes

La fórmula definitiva de puntuación, su nombre, los niveles y las máquinas comparables los diseñaremos después. Por ahora se muestra explícitamente como experimental: 100 × media de carga/peso corporal. Las máquinas no aprobadas solo tienen gráfica individual. Los ejercicios personalizados no entran en comparaciones hasta validar su definición.

La red social todavía no tiene cuentas, solicitudes de amistad ni publicaciones. El @ no está reservado globalmente. No se suben fotos. La conexión con ChatGPT personal y el asistente IA están pendientes. El selector fotográfico existente es una **simulación etiquetada**, no analiza imágenes y devuelve datos ficticios. Las fotografías no se guardan en el perfil ni se envían.

Los objetivos semanales son reglas de producto solicitadas, no se presentan como una recomendación universal. Si no caben en los días y el material disponibles, se muestra cuánto falta. La especialización implementa el objetivo de 16 series, no todavía duración de bloques ni descargas.

Consulta [REQUISITOS-GYM-BUDDY.md](REQUISITOS-GYM-BUDDY.md) para el detalle de lo implementado y pendiente.

## Desarrollo y comprobaciones

En PowerShell, desde esta carpeta:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npx.cmd expo export --platform web
```

Las pruebas de navegador requieren la app en el puerto 8081 y usan contextos de prueba aislados. La exportación queda en `dist` y no publica la app. No se han probado Android/iOS en dispositivos.

Node está instalado en `C:\Users\Javier\.local\node\node-v24.20.0-win-x64`. Si una terminal antigua no lo encuentra, abre una nueva.

## Organización

- `brand.json`: nombre visible; slug técnico conservado.
- `src/data`: catálogo, patrones de tirón, cargas y elegibilidad de puntuación.
- `src/logic`: generación, progresión, sesiones y gráficas.
- `src/components`, `src/screens`, `src/app`: interfaz y rutas.
- `src/state`, `src/storage`: persistencia local compatible con los datos anteriores.
- `tests`: motor y recorridos de navegador.
- `referencias-visuales`: referencias de diseño aportadas.
