# 🎓 KnowledgeForge

**Tu Aula del Conocimiento Personal - Aprende programando con IA como tu mentor**

KnowledgeForge es una extensión de VS Code que analiza tu experiencia profesional y te genera un roadmap personalizado de aprendizaje. No solo te muestra qué aprender, sino que te guía paso a paso como un curso interactivo, revisa tu código con IA y te acompaña en todo el proceso.

---

## 🌟 ¿Qué hace KnowledgeForge?

### 1️⃣ **Analiza tu Experiencia**
- Pega tu CV o descripción profesional
- La IA analiza tus fortalezas, debilidades y objetivos
- Identifica el camino óptimo para maximizar tu valor profesional

### 2️⃣ **Genera un Roadmap Personalizado**
- Roadmap específico basado en tu perfil (frontend, backend, fullstack)
- Dividido en fases progresivas (4-6 fases)
- Cada fase tiene tareas concretas y accionables
- Todo orientado a construir un **proyecto real**

### 3️⃣ **Crea tu Proyecto de Aprendizaje**
- Genera automáticamente la estructura de carpetas y archivos
- Incluye guías de estudio completas en carpeta `docs/`
- README y ROADMAP.md personalizados
- Listo para empezar a codificar inmediatamente

### 4️⃣ **Modo Aprendizaje Interactivo** ⭐
- **Sistema de 5 pasos por tarea:**
  1. 🎯 Entender el Objetivo
  2. 📚 Conceptos Clave
  3. 💡 Plan de Acción
  4. 🔍 Ejemplos de Código
  5. ✅ Criterios de Validación
- **Contenido dinámico**: La IA genera la información cuando la necesitas (no todo de una vez)
- **Chat con IA**: Mentor disponible 24/7 para resolver dudas
- **Caché inteligente**: El contenido ya generado se guarda para acceso rápido
- **Navegación del roadmap**: Ve todas tus tareas con indicadores visuales

### 5️⃣ **Code Review con IA**
- Revisa tu código automáticamente
- Compara tu implementación con la tarea requerida
- Da feedback constructivo y específico
- **Sin código**: Te da guía de estudio con recursos
- **Con código**: Revisa calidad y sugiere mejoras
- Aprueba automáticamente cuando cumples los requisitos

### 6️⃣ **Seguimiento de Progreso**
- Tree View visual en el sidebar de VS Code
- Indicadores de tareas completadas (✅)
- Marcador de tarea actual (▶️)
- Porcentaje de progreso general
- Estado persistente (no pierdes tu progreso)

---

## 🚀 Inicio Rápido

### Paso 1: Instalar la extensión
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/knowledge-forge.git
cd knowledge-forge

# Instalar dependencias
npm install

# Compilar
npm run compile

# Abrir en VS Code en modo desarrollo
code .

# Presionar F5 para abrir ventana de desarrollo
```

### Paso 2: Configurar API Key
1. Presiona `Ctrl+Shift+P`
2. Busca: `KnowledgeForge: Configurar API Key`
3. Elige tu proveedor favorito:
   - **DeepSeek** (Recomendado - Potente y económico)
   - **Google Gemini** (Free tier generoso)
   - **OpenAI GPT**
4. Pega tu API Key

**¿Cómo obtener API Key?**
- DeepSeek: https://platform.deepseek.com/api_keys
- Gemini: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys

### Paso 3: Generar tu Roadmap
1. `Ctrl+Shift+P` → `KnowledgeForge: Abrir Aula`
2. Pega tu CV o descripción profesional en el formulario
3. Click en **"Analizar y Generar Roadmap"**
4. Espera mientras la IA analiza tu perfil (10-30 segundos)
5. ¡Listo! Verás tu roadmap personalizado

### Paso 4: Crear tu Proyecto
1. En la vista del roadmap, click en **"Iniciar Proyecto"**
2. Ingresa el nombre de tu proyecto (ej: `mi-proyecto-aprendizaje`)
3. La extensión creará la estructura completa:
   ```
   mi-proyecto-aprendizaje/
   ├── .knowledgeforge/state.json    # Tu progreso
   ├── docs/                          # Guías de estudio
   │   ├── README.md
   │   ├── Fase1_Guia.md
   │   ├── Fase2_Guia.md
   │   └── ...
   ├── ROADMAP.md                     # Todas tus tareas
   ├── README.md                      # Info del proyecto
   ├── src/                           # Tu código
   └── tests/                         # Tus tests
   ```

### Paso 5: Empezar a Aprender
1. Abre el sidebar de KnowledgeForge (ícono 🎓 en Activity Bar)
2. Verás tu roadmap con todas las fases y tareas
3. La primera tarea estará marcada con ▶️
4. **Opción A - Modo Aprendizaje Interactivo:**
   - `Ctrl+Shift+P` → `KnowledgeForge: Modo Aprendizaje (Interactivo)`
   - Sigue los 5 pasos de cada tarea
   - Usa el chat para hacer preguntas
5. **Opción B - Guías de Estudio:**
   - `Ctrl+Shift+P` → `KnowledgeForge: Ver Guía de Estudio`
   - Lee los recursos recomendados
   - Implementa según la guía

### Paso 6: Revisar tu Código
Cuando termines de codificar:
1. `Ctrl+Shift+P` → `KnowledgeForge: Revisar Tarea con IA`
2. **Si no tienes código:**
   - La IA te da una guía de inicio
   - Recursos específicos de estudio
   - Plan de acción paso a paso
   - Ejemplo de código inicial
3. **Si tienes código:**
   - La IA revisa tu implementación
   - Da feedback constructivo
   - Aprueba o sugiere mejoras
4. **Si aprueba:**
   - Tarea marcada como completada ✅
   - Avanza automáticamente a la siguiente
   - Notificación con la nueva tarea

---

## 📚 Comandos Disponibles

| Comando | Atajo | Descripción |
|---------|-------|-------------|
| **Abrir Aula** | `Ctrl+Shift+P` → `KnowledgeForge: Abrir Aula` | Analiza CV y genera roadmap |
| **Modo Aprendizaje** | `Ctrl+Shift+P` → `KnowledgeForge: Modo Aprendizaje` | Sistema interactivo de 5 pasos + chat con IA |
| **Revisar Tarea con IA** | Ícono ✨ en sidebar | Code review automático con feedback |
| **Ver Guía de Estudio** | Ícono 📖 en sidebar | Abre guía de la fase actual |
| **Ver Tarea Actual** | `Ctrl+Shift+P` → `Ver Tarea Actual` | Muestra detalles de tu tarea |
| **Marcar Tarea Completada** | `Ctrl+Shift+P` → `Marcar Tarea como Completada` | Completa manualmente la tarea |
| **Ver Estado del Proyecto** | `Ctrl+Shift+P` → `Ver Estado del Proyecto` | Resumen de progreso general |
| **Refrescar Roadmap** | Ícono 🔄 en sidebar | Actualiza vista del roadmap |
| **Configurar API Key** | `Ctrl+Shift+P` → `Configurar API Key` | Cambia/configura API Key |
| **Cambiar Proveedor de IA** | `Ctrl+Shift+P` → `Cambiar Proveedor de IA` | Cambia entre DeepSeek/Gemini/OpenAI |

---

## 💡 Casos de Uso

### 🎯 Para Desarrolladores Junior
> "Quiero aprender desarrollo web profesional"

1. Pegas tu experiencia básica (cursos, proyectos personales)
2. KnowledgeForge genera un roadmap progresivo: HTML/CSS → JavaScript → React → Backend → Fullstack
3. Cada fase te enseña nuevos conceptos construyendo un proyecto real
4. La IA revisa tu código y te guía en cada paso
5. Al final tienes un portfolio project completo

### 🔄 Para Desarrolladores Cambiando de Stack
> "Soy backend dev, quiero aprender frontend moderno"

1. Pegas tu CV mencionando tu experiencia backend
2. KnowledgeForge detecta tu nivel y genera roadmap específico de frontend
3. Te salta conceptos básicos que ya conoces (variables, funciones)
4. Se enfoca en lo específico de frontend: React, State Management, CSS-in-JS
5. Proyecto final: Dashboard web complejo con backend integrado

### 📈 Para Profesionales Optimizando Perfil
> "Quiero mejorar mi perfil para senior positions"

1. Pegas tu CV actual con 3-5 años de experiencia
2. KnowledgeForge identifica gaps: testing, arquitectura, performance
3. Genera roadmap enfocado en habilidades senior
4. Proyecto: Sistema complejo con arquitectura escalable
5. Incluye: Testing avanzado, CI/CD, optimizaciones, documentación

---

## 🏗️ Arquitectura del Modo Aprendizaje

### Sistema de 5 Pasos

Cada tarea se divide en pasos progresivos que se generan dinámicamente:

#### 1. 🎯 Entender el Objetivo
- **Qué aprenderás**: Explicación clara del objetivo de la tarea
- **Por qué es importante**: Contexto profesional y relevancia
- **Resultado esperado**: Qué deberías tener al terminar

#### 2. 📚 Conceptos Clave
- **Lista de conceptos**: Tecnologías, patrones, herramientas
- **Definiciones**: Explicación de cada concepto
- **Pre-requisitos**: Qué debes saber antes de empezar

#### 3. 💡 Plan de Acción
- **Pasos específicos**: 5-8 pasos concretos a seguir
- **Orden lógico**: Progresión estructurada
- **Comandos/instalaciones**: Todo lo que necesitas ejecutar

#### 4. 🔍 Ejemplos de Código
- **Código funcional**: Ejemplos completos y comentados
- **Casos de uso**: Diferentes escenarios
- **Mejores prácticas**: Cómo escribir código de calidad

#### 5. ✅ Criterios de Validación
- **Checklist**: Qué debe tener tu código
- **Señales de calidad**: Indicadores de buen trabajo
- **Auto-evaluación**: Cómo saber si terminaste

### Chat con IA Integrado

- **Contexto completo**: La IA conoce tu roadmap, tarea actual y progreso
- **Preguntas específicas**: Puedes preguntar sobre la tarea, conceptos, errores
- **Respuestas personalizadas**: Adaptadas a tu nivel y contexto
- **Historial persistente**: Tus conversaciones se guardan

### Caché Inteligente

- Contenido generado se guarda automáticamente
- Navegas entre pasos sin regenerar
- Sincronizado con el estado del proyecto
- Mejora la velocidad y reduce llamadas a la API

---

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnología |
|------------|------------|
| **Lenguaje** | TypeScript |
| **Plataforma** | VS Code Extension API |
| **UI** | Webviews + Tree Views |
| **IA** | DeepSeek / Google Gemini / OpenAI |
| **Almacenamiento** | VS Code Secrets API + Workspace State + File System |
| **Estado** | JSON persistente en `.knowledgeforge/state.json` |

---

## 🔧 Solución de Problemas

### "No hay un proyecto activo"
**Solución:**
1. Asegúrate de abrir la carpeta del proyecto en VS Code
2. Busca el archivo `.knowledgeforge/state.json` en la raíz
3. Si existe, el proyecto debería cargarse automáticamente
4. Si no, ejecuta `KnowledgeForge: Abrir Aula` y regenera el proyecto

### "Revisar con IA no hace nada"
**Solución:**
- Verifica que tengas API Key configurada: `Configurar API Key`
- Si no tienes código, es normal: la IA te dará guía de estudio
- Si tienes código pero no funciona, revisa la consola de desarrollo (`Help > Toggle Developer Tools`)

### "Error de API Key"
**Solución:**
1. Verifica que tu API Key sea correcta
2. Comprueba que tengas créditos en tu cuenta del proveedor
3. Intenta cambiar de proveedor: `Cambiar Proveedor de IA`
4. DeepSeek es el más confiable y económico

### "Perdí mi progreso al cerrar VS Code"
**Solución:**
- El estado se guarda automáticamente en `.knowledgeforge/state.json`
- Asegúrate de abrir la misma carpeta del proyecto
- No borres la carpeta `.knowledgeforge/`

### "El Modo Aprendizaje no abre"
**Solución:**
- Necesitas tener un proyecto activo primero
- Ejecuta `Abrir Aula` → Genera roadmap → Iniciar Proyecto
- Luego podrás usar `Modo Aprendizaje`

---

## 📖 Guía de Uso Completo

### Flujo Completo Recomendado

```
1. Configurar API Key
   ↓
2. Abrir Aula → Pegar CV
   ↓
3. Generar Roadmap (IA analiza tu perfil)
   ↓
4. Iniciar Proyecto (crea estructura)
   ↓
5. Abrir Sidebar de KnowledgeForge
   ↓
6. OPCIÓN A: Modo Aprendizaje Interactivo
   - Seguir 5 pasos de la tarea
   - Usar chat para preguntas
   - Codificar según guía
   ↓
   OPCIÓN B: Guías de Estudio
   - Leer docs/FaseN_Guia.md
   - Estudiar recursos
   - Codificar por tu cuenta
   ↓
7. Revisar Tarea con IA
   ↓
8. Recibir Feedback
   ↓
9. Si aprueba → Siguiente tarea automáticamente
   Si rechaza → Mejorar código y revisar de nuevo
   ↓
10. Repetir pasos 6-9 hasta completar roadmap
    ↓
11. ¡Proyecto completo y conocimiento consolidado!
```

### Tips para Aprovechar al Máximo

1. **Lee las guías ANTES de codificar**
   - Abre `docs/README.md` al iniciar
   - Lee `FaseN_Guia.md` antes de cada fase
   - Estudia los recursos enlazados

2. **Usa el Modo Aprendizaje para tareas complejas**
   - Cuando no sepas por dónde empezar
   - Para entender conceptos nuevos
   - Para ver ejemplos de código

3. **Revisa frecuentemente con IA**
   - No esperes a terminar todo
   - Revisa por funcionalidad pequeña
   - Itera: Código → Review → Mejora

4. **Pregunta en el chat**
   - La IA tiene contexto completo
   - Pregunta sobre errores específicos
   - Pide aclaraciones de conceptos

5. **Sigue la progresión**
   - No te saltes fases
   - Completa en orden
   - Cada fase prepara la siguiente

6. **Documenta lo que aprendes**
   - Agrega notas a las guías
   - Escribe comentarios en tu código
   - Crea ejemplos adicionales

---

## 🗺️ Roadmap de Desarrollo

### ✅ Completado
- [x] Análisis de CV con IA
- [x] Generación de roadmaps personalizados
- [x] Creación automática de proyectos
- [x] Sistema de seguimiento de progreso
- [x] Code review con IA
- [x] Modo Aprendizaje Interactivo (5 pasos)
- [x] Chat con IA integrado
- [x] Guías de estudio automáticas
- [x] Navegación del roadmap
- [x] Caché de contenido
- [x] Soporte multi-proveedor (DeepSeek/Gemini/OpenAI)
- [x] Persistencia de estado

### 🚧 En Progreso
- [ ] Tests automatizados completos
- [ ] Documentación completa

### 🔮 Planeado
- [ ] Soporte para más lenguajes de programación
- [ ] Templates de proyectos predefinidos
- [ ] Integración con GitHub para portfolios
- [ ] Sistema de logros y gamificación
- [ ] Comunidad para compartir roadmaps
- [ ] Exportar roadmap a PDF
- [ ] Integración con Notion/Obsidian
- [ ] Recomendaciones de recursos (cursos, libros, videos)

---

## 🤝 Contribuciones

¿Quieres contribuir? ¡Genial! Este proyecto está en desarrollo activo.

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - Ve el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Soporte

- **Issues:** https://github.com/tu-usuario/knowledge-forge/issues
- **Documentación:** Ver carpeta `docs/`
- **Changelog:** Ver [CHANGELOG.md](CHANGELOG.md)

---

## 🎓 Filosofía del Proyecto

**KnowledgeForge** cree que la mejor forma de aprender programación es:

1. **Haciendo** - No solo leyendo, sino construyendo proyectos reales
2. **Personalizado** - Adaptado a tu experiencia y objetivos
3. **Guiado** - Con un mentor (IA) que te orienta en cada paso
4. **Progresivo** - Desde lo básico a lo avanzado, sin saltos
5. **Práctico** - Enfocado en habilidades demandadas en el mercado

> "No es solo un roadmap, es tu aula personal de conocimiento"

---

**¡Empieza tu viaje de aprendizaje hoy! 🚀**
