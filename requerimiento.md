El proyecto **KnowledgeForge** busca ser el aula de conocimiento personal más interactiva y avanzada para desarrolladores dentro de VS Code, utilizando IA como mentor.

A continuación, se presenta el documento de requisitos detallados (DRD) que cubre la visión, el alcance, las funcionalidades clave, la interfaz de usuario (UI/UX) y las tecnologías.

---

# 🎓 KnowledgeForge: Aula del Conocimiento Personal (DRD)

## 1. Visión y Alcance del Producto

| Categoría | Descripción |
| :--- | :--- |
| **Visión** | Transformar VS Code en un aula de desarrollo interactiva y personalizada, donde la IA guía a los usuarios a través de la codificación práctica para construir un portafolio profesional y llenar sus lagunas de conocimiento. |
| **Público Objetivo** | Desarrolladores Junior, desarrolladores con experiencia que cambian de *stack*, y profesionales buscando optimizar su perfil para roles Senior. |
| **Alcance (MVP)** | Implementación de las seis funcionalidades principales (Análisis, Roadmap, Proyecto, Modo Aprendizaje, Code Review y Seguimiento) con un enfoque en la interactividad avanzada y la gamificación (XP/Logros) dentro de VS Code. **La monetización queda excluida del MVP.** |

## 2. Requerimientos Funcionales Detallados

### F1: Análisis de Experiencia y Generación de Roadmap

| ID | Requerimiento | Detalle y Criterios de Aceptación |
| :--- | :--- | :--- |
| **F1.1** | **Input del Usuario** | La extensión debe proporcionar un **Webview** con un campo de texto grande para pegar el CV, experiencia o descripción profesional. |
| **F1.2** | **Análisis 'En Vivo' (IA)** | Mientras el usuario escribe/pega, la IA debe mostrar **feedback inmediato y dinámico** en el Webview (ej. "Detectado: Python", "Gap Identificado: Testing Unitario"). |
| **F1.3** | **Generación del Roadmap** | La IA genera un `ROADMAP.md` y una estructura de datos interna (JSON) con 4-6 fases progresivas y tareas accionables. El roadmap debe ser altamente específico para el perfil del usuario. |
| **F1.4** | **Configuración de IA** | El usuario debe poder configurar la **API Key** (DeepSeek, Gemini, OpenAI) a través de un comando (`Ctrl+Shift+P`) y un formulario simple. |

### F2: Creación y Estructura del Proyecto

| ID | Requerimiento | Detalle y Criterios de Aceptación |
| :--- | :--- | :--- |
| **F2.1** | **Creación de Proyecto** | Un comando inicia la creación de una estructura de carpetas y archivos en el directorio seleccionado por el usuario. |
| **F2.2** | **Archivos Generados** | Debe generar `ROADMAP.md` y la carpeta `docs/` con guías de estudio (`FaseN_Guia.md`) para cada fase. |
| **F2.3** | **Archivos de Estado** | Creación de la carpeta `.knowledgeforge/` que contiene el archivo `state.json` para la persistencia del progreso. |

### F3: Seguimiento de Progreso y Gamificación (XP)

| ID | Requerimiento | Detalle y Criterios de Aceptación |
| :--- | :--- | :--- |
| **F3.1** | **Tree View (Sidebar)** | La barra lateral de KnowledgeForge (Activity Bar) debe mostrar un `Tree View` con: 1. Fases del Roadmap. 2. Tareas por fase. |
| **F3.2** | **Indicadores Visuales** | Uso de decoradores en el `Tree View`: **▶️** para la tarea actual, **✅** para tareas completadas. |
| **F3.3** | **Sistema de Experiencia (XP)** | La extensión debe calcular y mostrar puntos de experiencia ($$X P$$) al completar tareas. El valor de $$X P$$ debe ser proporcional a la dificultad (determinada por la IA). |
| **F3.4** | **Badges / Logros** | Un panel (Webview) debe mostrar **Badges** desbloqueadas al completar fases clave (ej. "Maestro de la Arquitectura Backend"). |
| **F3.5** | **Status Bar** | Mostrar el porcentaje de progreso general y la métrica de $$X P$$ en la *Status Bar* de VS Code. |

### F4: Modo Aprendizaje Interactivo (Webview)

Este es el componente central, ubicado en un Webview **anclado** a la derecha del editor.

| ID | Requerimiento | Detalle y Criterios de Aceptación |
| :--- | :--- | :--- |
| **F4.1** | **UI de 5 Pasos** | El Webview presenta los 5 pasos de cada tarea como una interfaz fluida (ej. pestañas o tarjetas con transición suave). |
| **F4.2** | **Contenido Dinámico** | La información de los 5 pasos se genera **al instante** mediante la IA la primera vez, y se carga de la **Caché Inteligente** en visitas posteriores. |
| **F4.3** | **Paso 3 (Plan de Acción)** | El plan de acción debe presentarse como una **lista de checkboxes cliqueables** que el usuario puede marcar para llevar un control visual inmediato. |
| **F4.4** | **Paso 4 (Ejemplos de Código)** | Un botón debe permitir abrir el ejemplo de código en un archivo temporal de **"Sandbox"** en una pestaña de editor adyacente para la experimentación. |
| **F4.5** | **Diagramas Visuales (F1.1)** | Para el paso 1, la IA debe intentar generar un **diagrama simple** (ej. ASCII art o SVG básico) que visualice el objetivo de la tarea. |

### F5: Code Review y Mentoría con IA

| ID | Requerimiento | Detalle y Criterios de Aceptación |
| :--- | :--- | :--- |
| **F5.1** | **Activación del Review** | Un comando (`KnowledgeForge: Revisar Tarea con IA`) y un botón ✨ en el `Tree View` inician la revisión del código en la carpeta actual. |
| **F5.2** | **Feedback Directo en Línea** | La IA debe usar la API de **Diagnostics/Code Actions** de VS Code para mostrar el feedback (sugerencias de mejora, errores) **directamente sobre las líneas de código** como si fuera un *linter* o Copilot. |
| **F5.3** | **Revisión y Aprobación** | La IA compara el código con los `Criterios de Validación` (Paso 5). Si aprueba, marca la tarea como ✅ en el `state.json` y avanza a la siguiente. |
| **F5.4** | **Desafíos de Refactorización** | Después de la aprobación (F5.3), la IA puede ofrecer un *mini-juego* opcional: un **Desafío de Refactorización** con un objetivo claro (ej. "Reducir la complejidad ciclística") para ganar $$X P$$ extra. |
| **F5.5** | **Asistente Contextual (Chat)** | El Chat con la IA debe estar integrado como un panel persistente y estilizado, y debe tener la capacidad de **analizar código seleccionado** (vía menú contextual). |

## 3. Requerimientos No Funcionales

| Categoría | Requerimiento | Detalle |
| :--- | :--- | :--- |
| **Rendimiento** | **Caché Inteligente** | El contenido generado por IA (5 Pasos) debe guardarse en caché para reducir la latencia y evitar regeneraciones costosas/lentas. |
| **Usabilidad (UX)** | **Consistencia con VS Code** | Toda la UI nativa (Sidebar, Status Bar) debe usar los colores y estilos del tema actual de VS Code. El Webview debe usar el **Webview UI Toolkit**. |
| **Compatibilidad** | **Multi-Plataforma** | La extensión debe ser funcional en Windows, macOS y Linux. |
| **Seguridad** | **Manejo de API Keys** | Las API Keys deben almacenarse de forma segura utilizando la **VS Code Secrets API**. |

## 4. Diseño de la Interfaz (UI/UX) - Resumen de la Experiencia

### 4.1. Flujo de Alto Nivel

1.  **Instalar y Configurar:** Usuario instala y configura la API Key (F1.4).
2.  **Generar Aula:** Usuario pega CV → Webview muestra análisis dinámico (F1.2) → Se genera Roadmap.
3.  **Iniciar Proyecto:** Extensión crea la estructura de archivos (F2.2).
4.  **Modo Aprendizaje:** El usuario abre la tarea actual. El Webview anclado muestra los 5 Pasos (F4.1).
5.  **Codificación y Mentoría:** Usuario codifica. Usa el Chat (F5.5) o la documentación.
6.  **Revisión:** Usuario ejecuta `Revisar Tarea con IA` (F5.1). El feedback aparece directamente en el código (F5.2).
7.  **Progreso:** El `Tree View` (F3.1) se actualiza (✅) y notifica el nuevo $$X P$$ (F3.3).

### 4.2. Maqueta Conceptual (Videos y Demo)

Para mostrar el producto más interactivo y llamativo, se deben destacar los siguientes elementos en la demo:

| Elemento Clave | Descripción para Demo/Video |
| :--- | :--- |
| **Análisis en Vivo** | Mostrar una animación rápida de texto ingresado y la IA "escanéandolo" y resaltando habilidades y *gaps* en la misma pantalla del Webview. |
| **Modo Inmersión (Webview)** | Mostrar el Webview anclado al lado del editor. El paso 4 se muestra con un botón **"Abrir Sandbox"** que instantáneamente abre un archivo temporal en la pestaña de al lado. |
| **Code Review en Línea** | La escena más impactante: el usuario escribe código erróneo. Corre la revisión. **Líneas rojas y amarillas aparecen en el editor**, y al pasar el ratón, una caja de texto muestra el feedback constructivo de la IA (F5.2). |
| **Gamificación** | Una notificación *toast* aparece con un sonido agradable: **"¡Fase 1 completada! Has ganado 500 $$X P$$ y desbloqueado el Badge 'Fundamentos Sólidos'"**. El contador en el Status Bar se actualiza. |

---

## 5. Arquitectura Técnica

| Componente | Tecnología (Propuesta) | Razón |
| :--- | :--- | :--- |
| **Lenguaje Base** | TypeScript | Estándar para el desarrollo de extensiones de VS Code y robustez. |
| **API Central** | VS Code Extension API | Para interactuar con el editor, *Tree View*, *Status Bar*, `Diagnostics` y `Code Actions`. |
| **Interfaz (Webview)** | React + VS Code Webview UI Toolkit | Para una UI moderna, compleja, interactiva y que se adapte automáticamente a los temas de VS Code. |
| **IA/Modelos** | DeepSeek / Gemini / OpenAI (configurable) | Usar modelos LLM para la generación de contenido y la lógica de *Code Review* y *Mentoring*. |
| **Almacenamiento** | `WorkspaceState` y `File System` (`.knowledgeforge/state.json`) | Para persistir el estado de la extensión, progreso, $$X P$$ y la caché del contenido generado. |