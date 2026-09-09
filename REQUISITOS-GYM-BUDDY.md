# Akhyles — requisitos de producto

## Implementado en esta revisión

- Nombre visible y técnico Akhyles. Se conserva la clave de almacenamiento histórica `gym60:state:v1` para no perder datos locales existentes.
- Descanso estimado entre series: 4 minutos en multiarticulares/pesados y 3 minutos en aislamiento. La duración suma 30 segundos por serie efectiva y descansos entre series; calentamiento y aproximación quedan aparte.
- Máximo 5 ejercicios para principiantes, 6 para intermedios; provisionalmente 6 también para avanzados.
- Rango mínimo/máximo de **repeticiones por serie**, interpretando el ejemplo de 8 repeticiones. Series efectivas configurables entre 2 y 6 por ejercicio, con objetivos semanales visibles.
- Al completar todas las series al máximo con la misma carga, la siguiente sesión recibe automáticamente el incremento disponible más próximo al 4 %, siempre dentro del 3–5 %. 35 kg + 1,25 kg = 36,25 kg. No se aplica dos veces al recargar.
- Incrementos configurables por ejercicio: 1,25 / 2,5 / 5 / 10 / 20 kg. Para barras se registra el incremento total de ambos lados; por defecto 2,5 kg. Para mancuernas se registra el peso por unidad. Por defecto máquinas y mancuernas usan 1,25 kg hasta personalizarlo.
- Si no existe un incremento compatible con el 3–5 %, se conserva la carga y se explica por qué; el peso real se puede editar en cada serie. Registrar las series confirma la carga, sin ventanas de aprobación.
- Orden editable con subir/bajar. El generador alterna grupos musculares cuando es posible y favorece los movimientos pesados al principio. Alternancia de remos y jalones entre exposiciones compatibles.
- El generador limita a 2 los ejercicios pesados (multiarticulares) por sesión en rutinas de 4 o 5 días. En edición manual es una recomendación y nunca bloquea añadir o sustituir un ejercicio pesado.
- En rutinas de 4 o 5 días, bíceps se concentra en el primer día de torso y tríceps en el segundo. Si bíceps o tríceps es el músculo prioritario, se programa en ambos días de torso.
- Objetivos de producto (series directas, sin contar dos veces músculos secundarios): 4 para hombros, bíceps, tríceps, pectoral y gemelos. 6 en grandes para principiantes, 8 para intermedios/avanzados. Glúteos femeninos: dos series adicionales como énfasis ligero, salvo exclusión explícita.
- Mesociclo de especialización opcional para avanzados: 16 series del músculo elegido. Con pocos días/material puede faltar volumen; la app muestra programado/objetivo y avisa. No se presupone que todo quepa en una sola sesión.
- Hombres: sin ejercicios específicos de glúteos por defecto; se pueden activar en Perfil o añadir a pierna. Mujeres: incluidos por defecto, con opción de desactivarlos. Los ejercicios de pierna pueden trabajar glúteos secundariamente aunque se excluyan los específicos.
- Nombre, @ local y datos personales editables durante una sesión. Cambios personales conservan la rutina; cambios de programación regeneran el plan, preservando la sesión en curso.
- Cierre y reapertura de sesión **local** con historial conservado; todavía no es autenticación ni protege con contraseña.
- Durante el entrenamiento se puede cambiar de ejercicio con flechas sin perder lo escrito. «Hoy no he podido hacer este ejercicio» lo omite en esa sesión, lo anota en el historial y mantiene intacta la rutina.
- La disponibilidad incluye días concretos de la semana. Las sesiones se asignan a esos días y se muestran con su nombre en Rutina; si se ofrecen 6–7 días, las 5 sesiones máximas se reparten dentro de la disponibilidad.
- Hoy muestra la sesión exacta del calendario, un día de descanso, una sesión en curso o «Sesión terminada». Tras terminar aparecen estadísticas de la sesión y acumuladas.
- La tendencia compara la mejor serie estimada únicamente entre ejercicios comunes y la sesión anterior equivalente. Una mejora anima a mantener la constancia; una bajada aislada sugiere revisar sueño, descanso, energía, proteína e hidratación sin presentarla como diagnóstico.
- Al bajar el rendimiento, los consejos de recuperación indican dormir 8 horas cada noche, acostarse y levantarse a los mismos horarios y apuntar a 1,8 gramos de proteína por kilo de peso corporal al día. También recuerdan energía e hidratación suficientes y revisar la fatiga si la bajada se repite. En días de descanso se mantiene el mismo consejo de sueño.
- Comunidad entre Progreso y Perfil: cuentas con contraseña y @ único, biografía, cuadrícula de fotos, muro de publicaciones, búsqueda por @, seguimiento, me gusta y eliminación por el propietario. Las publicaciones son públicas. Incluye vista previa y acción explícita de publicar, rechazo de imágenes inválidas, límite de 5 MB, conversión a JPEG sin metadatos, denuncias y ocultación para quien denuncia. Servidor local funcional, pendiente de alojamiento común para acceso por Internet.
- Gráficas reales de peso corporal y carga por ejercicio/máquina, con fecha, carga y repeticiones consultables. Las sesiones nuevas guardan el peso corporal de inicio; no se atribuye retroactivamente el peso actual a sesiones antiguas.
- Gráfica conjunta de líneas: peso corporal permanente y selección múltiple de ejercicios dentro de cada grupo muscular. Escala común en kg, periodos de 28/90 días o historial completo, navegación por mediciones y registro del peso corporal desde Progreso. La puntuación total se muestra en el mismo apartado, con su propia escala en puntos.
- Comparación entre participantes del mismo nivel con registros de todos los ejercicios homologados usados en la comparación personal. Fuerza estimada = carga × (1 + repeticiones/30), solo de 1 a 12 repeticiones. Cambio porcentual por ejercicio entre primera y última medición de los últimos 28 días, normalizado a 28 días; media de los ejercicios y después media de usuarios. Se requieren 7 días entre extremos, último registro en la última semana y 5 personas distintas del usuario. Banda «en la media»: ±1 punto porcentual por 28 días. Nivel declarado y guardado al iniciar nuevas sesiones; no se reclasifican entrenamientos antiguos. Participación explícita y revocable; salida agregada, sin inventar usuarios ni medias.
- Puntuación experimental: 100 × media de carga/peso corporal. Solo ejercicios de peso libre del catálogo y máquinas con scoreEligible habilitado por el responsable del catálogo. De momento no hay máquinas aprobadas. Ejercicios personalizados excluidos hasta validar su definición. No representa aún un nivel real.
- La gráfica de puntuación usa un conjunto fijo de ejercicios dentro del periodo mostrado; un ejercicio nuevo cambia ese conjunto y el comienzo del periodo. No mezcla máquinas no homologadas ni sesiones antiguas sin peso corporal.
- Carpeta referencias-visuales para las imágenes aportadas.
- Los planes antiguos se conservan hasta pulsar «Actualizar rutina a nuevas reglas», para no descartar ajustes manuales sin avisar.

## Pendiente de diseñar / conectar

- Acceso con Google implementado para web; activar `GYM_GOOGLE_CLIENT_ID` y los orígenes autorizados en Google Cloud. Ver `server/GOOGLE-SETUP.md`. Las compilaciones nativas requieren un flujo específico.
- Tiers S/A/B visibles por grupo muscular a partir de las prioridades editoriales actuales del catálogo. Pendiente de validar el contenido definitivo de los «Deberes» con Javier.

## Revisión de sesiones y perfil

- Especialización automática: al seleccionar un músculo prioritario no se pide un objetivo fijo de 16 series. El volumen aumenta con los días disponibles; con cuatro o más días se orienta hacia 16 en nivel intermedio o avanzado, sin prometer la misma cifra cuando el plan no dispone de hueco compatible.
- Calendario de Rutina con vistas Semana y Mes. Las flechas recorren semanas o meses, permitiendo consultar cualquier mes del año. Las sesiones registradas se pueden corregir en pesos y repeticiones; las futuras admiten pesos por fecha sin alterar la rutina recurrente.
- Duración estimada: 30 segundos por serie efectiva, 4 minutos de descanso entre series multiarticulares/pesadas y 3 minutos entre series de aislamiento. No incluye calentamiento, aproximaciones ni esperas.

- Inicio y continuación centralizados en Hoy. Rutina enlaza a Hoy. Permite elegir otra sesión del plan; una sesión completada hoy no se reinicia.
- Al reanudar, las series de ejercicios sin repeticiones registradas se ajustan al plan actual. Se conservan las repeticiones ya escritas y los ejercicios guardados. Finalizar es idempotente por identificador de sesión.
- Calorías aproximadas al terminar, en Hoy y en el historial, basadas en peso corporal de inicio y ejercicios realmente registrados. Modelo de duración de 3 s por repetición y descansos de 3–5 min; categorías MET 02052/02054 del Compendio 2024. Gasto total estimado, no medición individual ni cronómetro de pared. Sin peso histórico no se inventa un valor.
- Seis avatares locales y selección de foto propia de hasta 500 KB. Perfil social guarda la imagen en el servidor y convierte las fotos a JPEG de 256 × 256 sin metadatos. El perfil de entrenamiento conserva su selección en el dispositivo.

## Otros pendientes

- Nombre del medidor (idea: Ki), fórmula definitiva, ponderación, efecto de repeticiones/técnica y escala de niveles. La media actual es un prototipo visible, no una clasificación objetiva entre personas.
- Lista de máquinas comparables que indicará Javier; identificar modelo, poleas, recorrido, unidad y condiciones de ejecución antes de homologarlas.
- Mesociclos: duración, descarga y transición entre bloques. Esta revisión implementa la distribución de las 16 series, no un calendario completo de bloques.
- Comunidad: alojamiento común por Internet, perfiles privados/solicitudes, recuperación de contraseña por correo y herramientas de moderación. Ya funcionan cuentas, @ único, fotos públicas, seguimiento y controles de propiedad en el servidor local.
- Asistente IA y aproximación del porcentaje graso: por ahora no existe integración. OpenAI documenta acceso a su API mediante credenciales de servidor; no se ha verificado un mecanismo general que permita a esta app usar la suscripción personal de ChatGPT. No pedir contraseñas ni guardar claves de API en el navegador.
- Documentación consultada: [autenticación de OpenAI](https://developers.openai.com/api/reference/overview#authentication), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).
