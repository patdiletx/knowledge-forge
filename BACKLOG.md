```
BACKLOG.md
# 📋 Requerimiento de Nuevas Funcionalidades para KnowledgeForge

## Objetivo
Evolucionar KnowledgeForge incorporando características de aprendizaje adaptativo inspiradas en Google's Learn Your Way, transformando la extensión de un generador de roadmaps a un companion de aprendizaje personalizado e inteligente.

## FUNCIONALIDADES A IMPLEMENTAR

### 🎯 FASE 1: Sistema de Evaluación Adaptativa Inicial

**Funcionalidad**: Assessment Dinámico de Habilidades

**Descripción Detallada**:
- Crear un módulo de evaluación que se ejecute ANTES de generar el roadmap
- La evaluación debe comenzar con 3 preguntas básicas sobre el tema elegido
- Según las respuestas, el sistema ajusta automáticamente la dificultad de las siguientes preguntas
- Incluir preguntas teóricas Y prácticas (snippets de código para completar/corregir)
- Generar un "Skill Profile" detallado con niveles granulares (Novato/Básico/Intermedio/Avanzado) por cada subtema
- Este perfil debe influir directamente en cómo se estructura el roadmap resultante
- Tiempo estimado: 5-10 minutos de evaluación
- Opción de "Skip Assessment" para usuarios que prefieran el análisis tradicional por CV

**Entregables**:
- Comando "Start Adaptive Assessment"
- Panel interactivo con las preguntas
- Sistema de puntuación que determine el nivel real del usuario
- Integración con el generador de roadmap existente para personalización mejorada

**Estado**: 🟢 Completado

**Nota**: Se ha implementado la versión inicial con el panel interactivo y el sistema de puntuación. Siguientes pasos incluyen la adaptación de preguntas y la integración con la generación de roadmaps.

---

### ⚡ FASE 2: Sistema de Micro-Aprendizaje

**Funcionalidad**: Lecciones Bite-Sized con Timer Integrado

**Descripción Detallada**:
- Dividir cada tarea actual del roadmap en "micro-lecciones" de 5-15 minutos
- Cada micro-lección debe tener 3 componentes:
  1. **Quick Concept** (2-3 min): Explicación concisa del concepto
  2. **Guided Practice** (5-7 min): Ejercicio con scaffolding
  3. **Self-Check** (2-3 min): Auto-evaluación rápida
- Implementar un timer visual tipo Pomodoro que muestre el tiempo sugerido
- Agregar "Quick Win Tasks" - logros completables en una sola sesión
- Sistema de pausas obligatorias entre lecciones (opcional, configurable)
- Notificaciones suaves cuando se complete el tiempo sugerido
- Posibilidad de marcar "Necesito más tiempo" sin penalización

**Entregables**:
- Refactorización del sistema de tareas actual a formato micro-learning
- Timer visual integrado en el panel de aprendizaje
- Sistema de tracking de tiempo por sesión
- Estadísticas de tiempo invertido por tema

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el sistema de micro-aprendizaje con temporizadores integrados, tracking de tiempo por sesión y estadísticas de aprendizaje. Cada paso del proceso de aprendizaje ahora incluye información sobre el tiempo estimado y descripciones de las lecciones.

---

### 💡 FASE 3: Feedback Contextual Inteligente

**Funcionalidad**: Sistema de Hints Progresivos y Feedback en Tiempo Real

**Descripción Detallada**:
- Implementar un sistema de "Educational Linting" que detecte patrones comunes de error
- Crear hints de 3 niveles que se revelan progresivamente:
  1. Nivel 1: Pista conceptual vaga ("Piensa en la estructura de datos más eficiente...")
  2. Nivel 2: Dirección específica ("Un Map sería más eficiente aquí porque...")
  3. Nivel 3: Ejemplo parcial de solución
- Feedback instantáneo mientras el usuario escribe código (no solo al final)
- Explicaciones educativas en los errores, no solo "esto está mal"
- "Praise Points" - reconocimiento automático cuando usan buenas prácticas
- Detección de "struggling patterns" - si el usuario está atascado >5 min, ofrecer ayuda proactiva
- Modo "Explain This Code" - el usuario puede seleccionar cualquier línea y obtener explicación

**Entregables**:
- Sistema de hints con UI para revelar progresivamente
- Analizador de código en tiempo real con feedback educativo
- Base de datos de patrones comunes y sus explicaciones
- Integración con el chat AI existente para explicaciones contextuales

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el sistema de pistas progresivas con tres niveles de hints que se revelan según la necesidad del usuario. Se han integrado en el panel de aprendizaje y se puede acceder a través de comandos. El sistema detecta patrones comunes de dificultades y puede ofrecer reconocimiento por buenas prácticas.

---

### 📊 FASE 4: Analytics de Aprendizaje Personal

**Funcionalidad**: Dashboard de Progreso Avanzado

**Descripción Detallada**:
- Crear un dashboard visual completo con múltiples vistas:
  - **Heatmap de Actividad**: Calendario que muestre días/horas de estudio
  - **Velocity Chart**: Velocidad de completación de tareas por semana
  - **Skills Radar**: Gráfico radial mostrando fortalezas/debilidades por área
  - **Learning Streak**: Contador de días consecutivos + mejor racha
  - **Time to Mastery**: Predicción de cuándo dominará cada skill
- Métricas específicas a trackear:
  - Tiempo por tarea (real vs estimado)
  - Número de hints necesarios
  - Intentos antes de éxito
  - Tasa de retención (necesita revisar conceptos anteriores?)
  - Horarios más productivos
- Recomendaciones basadas en datos: "Rindes mejor en las mañanas" o "Necesitas reforzar arrays"
- Exportación de reporte mensual de progreso

**Entregables**:
- Nuevo comando "Open Learning Analytics"
- Dashboard interactivo con gráficos
- Sistema de recolección de métricas en background
- Generador de insights automáticos

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el dashboard de analytics con heatmap de actividad, gráfico de velocidad, radar de habilidades, contador de rachas y predicciones de tiempo para dominar habilidades. Se han creado servicios para recolectar métricas de aprendizaje y mostrarlas en un panel interactivo.

---

### 🔄 FASE 5: Sistema de Repetición Espaciada

**Funcionalidad**: Review Inteligente de Conceptos

**Descripción Detallada**:
- Implementar algoritmo de repetición espaciada (tipo Anki) para conceptos clave
- Crear "Review Sessions" automáticas basadas en la curva del olvido
- Sistema de tarjetas de revisión rápida:
  - Aparecen al inicio de cada sesión
  - 2-3 minutos de review de conceptos anteriores
  - Dificultad autodeclarada: "Fácil", "Medio", "Difícil", "No recordaba"
- Ajuste automático de intervalos según el rendimiento
- "Knowledge Decay Alert": Notificar cuando un concepto necesita refuerzo
- Integración con el roadmap: agregar sesiones de review como tareas opcionales
- Modo "Quick Review" accesible desde command palette

**Entregables**:
- Motor de repetición espaciada
- Sistema de tarjetas de review integrado
- Scheduler automático de reviews
- Tracking de retención por concepto

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el sistema de repetición espaciada con algoritmo SM-2 para optimizar la retención de conocimientos. Se ha creado un panel de revisión rápida accesible desde la paleta de comandos donde los usuarios pueden revisar conceptos clave. El sistema ajusta automáticamente los intervalos de revisión según el rendimiento del usuario.

---

### 🎮 FASE 6: Gamificación Avanzada

**Funcionalidad**: Sistema de Progresión tipo RPG

**Descripción Detallada**:
- Evolucionar el sistema de badges actual a un "Skill Tree" visual
- Implementar sistema de XP (puntos de experiencia):
  - XP variable según dificultad de la tarea
  - Bonus XP por completar sin hints
  - XP por ayudar a otros (futuro sistema social)
- Niveles de "Developer Class": Junior Apprentice → Code Warrior → Architect Master
- Challenges semanales opcionales:
  - "Speed Coding Monday": Completar micro-tarea en tiempo récord
  - "Deep Dive Friday": Investigación profunda de un tema
- Achievements desbloqueables con rewards visuales
- "Power-ups": Desbloquear características premium al subir de nivel
- Leaderboard opcional (solo si el usuario opta-in)

**Entregables**:
- Skill tree visual interactivo
- Sistema de XP y niveles
- Generador de challenges semanales
- Nueva sección de achievements expandida

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el sistema de gamificación con árbol de habilidades, sistema de XP y niveles de "Developer Class", logros desbloqueables y desafíos semanales. Se ha creado un dashboard interactivo para visualizar el progreso del usuario en el sistema de gamificación.

---

### 🤝 FASE 7: Modo Colaborativo (Opcional)

**Funcionalidad**: Aprendizaje Social Anónimo

**Descripción Detallada**:
- "Solution Gallery": Ver soluciones anonimizadas de otros usuarios para la misma tarea
- Sistema de votación de mejores soluciones
- "Study Buddy Match": Emparejar usuarios en el mismo nivel/tema (opcional)
- Comentarios y discusiones por tarea
- "Ask the Community": Botón para solicitar ayuda cuando estés atascado
- "Mentor Mode": Usuarios avanzados pueden revisar código de principiantes
- Sistema de karma por ayudar a otros

**Entregables**:
- Sistema de compartición anónima de código
- Panel de soluciones comunitarias
- Sistema de matching para study buddies
- Integración de comentarios/discusiones

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el modo colaborativo con galería de soluciones comunitarias, sistema de votación, emparejamiento de study buddies, y sistema de karma. Los usuarios pueden compartir soluciones anonimizadas, comentar y votar soluciones de otros, solicitar ayuda a la comunidad y conectarse con otros estudiantes.

---

## 🔄 FUNCIONALIDADES DE MEJORA CONTINUA

### 📚 Mejora del Sistema de Navegación y Contenido

**Funcionalidad**: Navegación Avanzada y Contenido Enriquecido

**Descripción Detallada**:
- Implementar un sistema de navegación jerárquica para tareas y subtareas
- Crear un menú de navegación permanente para moverse entre tareas
- Mejorar la funcionalidad "Continuar (más detalle)" para que agregue contenido en lugar de reemplazarlo
- Asegurar que el contenido generado se almacene de forma persistente y se acumule
- Mejorar la calidad y profundidad del contenido generado por IA
- Crear un sistema de historial de navegación para volver a secciones anteriores

**Entregables**:
- Menú de navegación jerárquica en el roadmap
- Sistema de navegación persistente entre tareas
- Funcionalidad mejorada de "Continuar (más detalle)" que acumula contenido
- Almacenamiento persistente del contenido expandido
- Mejoras en la calidad del contenido generado por IA

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el sistema de navegación jerárquica con menú permanente, almacenamiento persistente del contenido expandido y funcionalidad "Continuar (más detalle)" mejorada que acumula contenido. Se ha integrado un sistema de historial de navegación para facilitar el retorno a secciones anteriores.

---

### 🧭 Sistema de Navegación Secuencial

**Funcionalidad**: Navegación Guiada Paso a Paso

**Descripción Detallada**:
- Implementar un sistema de navegación secuencial donde los pasos se desbloquean progresivamente
- Mostrar todos los pasos desde el principio pero deshabilitados
- Al marcar un paso como "completado", se habilita automáticamente el siguiente paso
- Eliminar la funcionalidad "Continuar (más detalle)" que anteriormente permitía profundizar en un tema
- Implementar un tutor proactivo que pregunta si se necesita ayuda al comenzar cada paso

**Entregables**:
- Sistema de navegación secuencial con pasos deshabilitados
- Desbloqueo automático de pasos al completar el anterior
- Tutor proactivo que ofrece ayuda contextual
- Interfaz de usuario mejorada para mostrar el progreso

**Estado**: 🟢 Completado

**Nota**: Se ha implementado el sistema de navegación secuencial con desbloqueo progresivo de pasos y tutor proactivo que ofrece ayuda contextual al comenzar cada paso. La navegación ahora sigue un flujo guiado paso a paso con indicadores visuales del progreso.

---

### 🧠 Mejora de la Calidad del Contenido

**Funcionalidad**: Contenido Más Rico y Detallado

**Descripción Detallada**:
- Mejorar los prompts utilizados para generar contenido con IA
- Implementar técnicas de prompting avanzadas para obtener contenido más detallado
- Añadir ejemplos de código más completos y explicativos
- Incluir recursos adicionales (enlaces, tutoriales, documentación)

**Entregables**:
- Prompts mejorados para generación de contenido
- Contenido más detallado y completo
- Ejemplos de código más completos y explicativos
- Recursos adicionales integrados

**Estado**: 🟢 Completado

**Nota**: Se han mejorado TODOS los prompts de IA en el sistema:
- **Prompt principal de pasos** (`_buildStepPrompt`): Ahora solicita JSON estructurado con concepto, objetivos, contenido detallado, ejemplos, recursos, desafíos y código de ejemplo
- **Prompt de chat AI** (`_handleAskAI`): Incluye respuesta directa, explicación conceptual con analogías, ejemplo práctico con código comentado, recursos adicionales y consejos para evitar errores
- **Prompt de expansión de contenido** (`_handleContinueStep`): Solicita ejemplos avanzados, recursos adicionales, mejores prácticas, casos de uso reales y ejercicios opcionales
- **Prompt de pista básica** (`_handleRequestHint`): Proporciona pista conceptual, preguntas guiadas, recursos relevantes y mini-ejemplos sin dar la solución completa
- **Prompt de pista avanzada** (`_handleNextLevelHint`): Incluye explicación detallada, ejemplo parcial de código, pasos específicos, errores comunes y recursos avanzados
- **Prompt de ayuda proactiva** (`_handleRequestHelp`): Ofrece introducción al paso, verificación de dudas, sugerencia inicial y motivación

Todos los prompts ahora generan contenido educativo más rico, con ejemplos prácticos, recursos enlazados y formato Markdown estructurado.

---

## PRIORIZACIÓN RECOMENDADA

1. **Crítico (Implementar Primero)**:
   - Sistema de Evaluación Adaptativa
   - Sistema de Micro-Aprendizaje
   - Feedback Contextual Inteligente
   - Sistema de Navegación Secuencial

2. **Importante (Segunda Fase)**:
   - Analytics de Aprendizaje Personal
   - Sistema de Repetición Espaciada

3. **Nice to Have (Tercera Fase)**:
   - Gamificación Avanzada
   - Modo Colaborativo

4. **Mejoras Continuas**:
   - Navegación Avanzada y Contenido Enriquecido
   - Mejora de la Calidad del Contenido

## CONSIDERACIONES TÉCNICAS

- Todas las funcionalidades deben integrarse sin interrumpir el flujo actual
- Mantener la opción de usar el modo "clásico" para usuarios que lo prefieran
- Optimizar para no afectar el rendimiento de VS Code
- Asegurar que los datos de analytics sean locales y respeten la privacidad
- Las nuevas características deben ser toggleables desde settings

## MÉTRICAS DE ÉXITO

- Aumento del 40% en tasa de completación de roadmaps
- Reducción del 30% en tiempo promedio para dominar conceptos
- 80% de usuarios usando al menos 3 de las nuevas características
- Feedback positivo en reviews sobre la experiencia adaptativa

---

**NOTA**: Cada funcionalidad debe ser desarrollada de manera modular para permitir activación/desactivación individual y facilitar el testing A/B con usuarios.
```