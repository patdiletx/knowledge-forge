# 📚 Guía de Uso - KnowledgeForge

## Configuración Inicial

### 1. Obtener una API Key de Google Gemini (Recomendado)

Google Gemini ofrece un tier gratuito generoso, ideal para empezar:

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Create API Key"**
4. Copia la API Key generada

### 2. Configurar la API Key en KnowledgeForge

Hay dos formas de configurar tu API Key:

#### Opción A: Desde la Paleta de Comandos

1. Abre la paleta de comandos (`Ctrl+Shift+P` o `Cmd+Shift+P`)
2. Escribe: **`KnowledgeForge: Configurar API Key`**
3. Pega tu API Key cuando se solicite
4. ¡Listo! La API Key se guarda de forma segura y encriptada

#### Opción B: Al Usar la Extensión por Primera Vez

1. Abre el Aula (`KnowledgeForge: Abrir Aula`)
2. Ingresa tu CV y haz clic en "Generar Roadmap"
3. Si no tienes API Key, aparecerá un diálogo con opciones:
   - **"Configurar Ahora"**: Ingresa tu API Key directamente
   - **"Ver Instrucciones"**: Muestra cómo obtener una API Key
   - **"Cancelar"**: Usa el modo mock (sin IA real)

## Usar KnowledgeForge

### Paso 1: Abrir el Aula del Conocimiento

1. Abre VS Code
2. Presiona `Ctrl+Shift+P` (Windows/Linux) o `Cmd+Shift+P` (macOS)
3. Escribe: **`KnowledgeForge: Abrir Aula`**
4. Presiona Enter

### Paso 2: Ingresar tu Background Profesional

En el webview que se abre, ingresa información sobre:

- **Tu experiencia**: Años de experiencia, proyectos previos
- **Tecnologías que conoces**: Lenguajes, frameworks, herramientas
- **Áreas de interés**: Qué te gustaría aprender o profundizar
- **Objetivos profesionales**: Dónde quieres llegar (Senior, Lead, etc.)

**Ejemplo de CV:**

```
Desarrollador Full Stack con 3 años de experiencia.

Experiencia técnica:
- Frontend: React, TypeScript, HTML/CSS
- Backend: Node.js, Express, PostgreSQL
- Herramientas: Git, Docker, VS Code

Proyectos:
- Sistema de gestión de tareas para startups
- E-commerce con pasarela de pagos
- Dashboard de analytics en tiempo real

Objetivos:
- Profundizar en arquitectura de software
- Aprender patrones de diseño avanzados
- Mejorar habilidades en testing y CI/CD
- Convertirme en Senior Developer en 1-2 años
```

### Paso 3: Generar tu Roadmap Personalizado

1. Haz clic en **"Generar Mi Roadmap Personalizado"**
2. Espera mientras la IA analiza tu perfil (10-30 segundos)
3. Verás tu roadmap personalizado organizado en fases

### Paso 4: Revisar tu Roadmap

Tu roadmap incluirá:

- **4-6 Fases progresivas**: Desde fundamentos hasta profesionalización
- **Tareas específicas**: Acciones concretas y accionables
- **Proyecto Real**: Una fase dedicada a construir algo completo
- **Personalización**: Adaptado a tu nivel y objetivos

## Comandos Disponibles

### Comandos Principales

| Comando | Descripción |
|---------|-------------|
| **KnowledgeForge: Abrir Aula** | Abre el webview principal para generar roadmaps |
| **KnowledgeForge: Configurar API Key** | Configura o actualiza tu API Key |
| **KnowledgeForge: Cambiar Proveedor de IA** | Cambia entre Google Gemini y OpenAI |
| **KnowledgeForge: Cómo Obtener API Key** | Muestra instrucciones para obtener API Keys |

## Configuración Avanzada

### Cambiar el Proveedor de IA

Por defecto, KnowledgeForge usa Google Gemini. Para cambiar a OpenAI:

1. Ejecuta: **`KnowledgeForge: Cambiar Proveedor de IA`**
2. Selecciona **"OpenAI"**
3. Configura tu API Key de OpenAI cuando se solicite

### Configuración Manual

También puedes configurar el proveedor desde settings.json:

```json
{
  "knowledgeforge.llmProvider": "gemini"  // o "openai"
}
```

## Modo Mock (Sin API Key)

Si no configuras una API Key, KnowledgeForge funcionará en **modo mock**:

- ✅ Genera roadmaps basados en keywords simples
- ✅ Ideal para probar la interfaz
- ❌ No usa IA real
- ❌ Roadmaps menos personalizados

Para obtener roadmaps verdaderamente personalizados, configura una API Key.

## Seguridad

- Las API Keys se almacenan usando **VS Code Secrets API**
- Están **encriptadas** y nunca se guardan en texto plano
- No se comparten ni se envían a ningún servidor excepto el proveedor de IA seleccionado

## Solución de Problemas

### Error: "API Key inválida"

1. Verifica que copiaste la API Key completa
2. Asegúrate de estar usando el proveedor correcto
3. Revisa que la API Key no haya expirado
4. Reconfigura la API Key: `KnowledgeForge: Configurar API Key`

### Error: "No se pudo conectar con Gemini"

1. Verifica tu conexión a internet
2. Comprueba que la API Key sea válida
3. Revisa si hay límites de cuota en tu cuenta de Google

### El roadmap parece genérico

Si configuraste una API Key pero los roadmaps son genéricos:

1. Proporciona más detalles en tu CV
2. Sé específico sobre tus objetivos
3. Menciona proyectos o experiencias concretas
4. Incluye tu nivel actual de habilidades

### La extensión no responde

1. Abre la consola de desarrollador: `Help > Toggle Developer Tools`
2. Busca errores en la consola
3. Recompila el proyecto: `npm run compile`
4. Reinicia VS Code

## Trabajar con Proyectos Reales

### Iniciar un Proyecto

Una vez que tengas tu roadmap generado:

1. En el webview, haz clic en **"🚀 Iniciar Proyecto"**
2. Ingresa un nombre para tu proyecto (ej: `mi-app-aprendizaje`)
3. El proyecto se creará con:
   - Estructura de carpetas según tipo (frontend/backend/fullstack)
   - ROADMAP.md con todas las tareas
   - README.md personalizado
   - .gitignore
   - AI_SUGGESTIONS.md (si tienes API Key)

### Ver tu Progreso

1. Abre el sidebar de KnowledgeForge (icono de birrete 🎓)
2. Verás tu roadmap con:
   - Progreso general: X/Y tareas (Z%)
   - Fases colapsables
   - Tarea actual marcada con ▶
   - Tareas completadas con ✅

### Code Review con IA ⭐

Cuando termines de trabajar en una tarea:

1. Ejecuta: **`KnowledgeForge: Revisar Tarea con IA`**
   - O haz clic en el botón ✨ en el sidebar
2. La IA analizará tu código y te dará feedback:
   - ✅ **Si se aprueba**:
     - Recibes felicitaciones y sugerencias
     - La tarea se marca como completada automáticamente
     - Avanzas a la siguiente tarea
   - ⚠️ **Si necesita mejoras**:
     - Recibes feedback específico
     - Sugerencias concretas de qué corregir
     - Puedes corregir y volver a revisar

### Comandos de Proyecto

| Comando | Uso |
|---------|-----|
| **Revisar Tarea con IA** | Envía tu código para code review automático |
| **Ver Tarea Actual** | Muestra detalles de la tarea en la que debes trabajar |
| **Marcar Tarea como Completada** | Completa manualmente sin code review (no recomendado) |
| **Ver Estado del Proyecto** | Resumen completo de progreso |
| **Refrescar Roadmap** | Actualiza la vista del sidebar |

### Flujo de Trabajo Recomendado

1. **Genera tu roadmap** con `Abrir Aula`
2. **Inicia el proyecto** con el botón en el webview
3. **Abre el proyecto** en VS Code
4. **Lee la tarea actual** en ROADMAP.md o con `Ver Tarea Actual`
5. **Trabaja en la tarea** - escribe código, crea archivos, etc.
6. **Revisa con IA** cuando creas que está lista
7. **Corrige si es necesario** según el feedback
8. **Repite** hasta completar todo el roadmap

## Funcionalidades Avanzadas

### Feedback Loop Automático

El sistema aprende de tu progreso:
- Cada review queda registrado
- La IA considera todo el roadmap al revisar
- Sugerencias contextualizadas según tu fase actual
- Próximos pasos personalizados

### Criterios de Aprobación

La IA no busca perfección, busca aprendizaje:
- ✅ La tarea específica está implementada
- ✅ El código funciona (sin errores obvios)
- ✅ Se siguieron buenas prácticas básicas
- 💡 No necesita ser perfecto para avanzar

## Soporte

¿Encontraste un bug o tienes una sugerencia?

Abre un issue en el repositorio del proyecto.
