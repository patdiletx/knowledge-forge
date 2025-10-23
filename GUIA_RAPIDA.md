# 🚀 Guía Rápida de KnowledgeForge

## Primer Uso - Generar tu Roadmap

### Paso 1: Abrir una Carpeta Base
Primero necesitas tener una carpeta abierta en VS Code (puede ser cualquiera, incluso tu carpeta de proyectos):

```
File > Open Folder > (elige cualquier carpeta donde quieras crear tu proyecto)
```

### Paso 2: Configurar tu Proveedor de IA

1. Presiona `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
2. Escribe: `KnowledgeForge: Cambiar Proveedor de IA`
3. Selecciona **DeepSeek** (recomendado)
4. Haz clic en "Sí" para configurar tu API Key ahora

**Obtener API Key de DeepSeek:**
- Ve a: https://platform.deepseek.com/
- Regístrate o inicia sesión
- Copia tu API Key
- Pégala cuando VS Code te la pida

### Paso 3: Generar tu Roadmap

1. Presiona `Ctrl+Shift+P`
2. Escribe: `KnowledgeForge: Abrir Aula`
3. Se abrirá un webview
4. Pega tu CV o experiencia profesional, por ejemplo:

```
Desarrollador web con 3 años de experiencia
Stack: JavaScript, React, Node.js
Experiencia: He creado APIs REST y aplicaciones frontend
Objetivo: Quiero especializarme en arquitectura de software
Meta: Convertirme en Senior Developer
```

5. Haz clic en **"Generar Mi Roadmap Personalizado"**
6. Espera 10-20 segundos mientras la IA analiza tu perfil

### Paso 4: Iniciar el Proyecto

1. Cuando veas tu roadmap generado, haz clic en **"🚀 Iniciar Proyecto"**
2. Escribe un nombre para tu proyecto (ej: `mi-roadmap-2025`)
3. Espera mientras se crea la estructura
4. Aparecerá un mensaje: **"✅ Proyecto creado exitosamente!"**
5. Haz clic en **"Abrir Proyecto"** (recomendado)

### Paso 5: Empezar a Trabajar

Una vez que se abra el proyecto:

1. Verás un mensaje: **"📚 Proyecto KnowledgeForge cargado"**
2. Haz clic en **"Ver Sidebar"** para ver tu roadmap
3. En la barra lateral izquierda, busca el ícono de KnowledgeForge (🎓)
4. Verás "Mi Roadmap" con todas tus fases y tareas

## Uso Diario

### Ver tu Tarea Actual

1. `Ctrl+Shift+P` → `KnowledgeForge: Ver Tarea Actual`
2. O mira el sidebar "Mi Roadmap" (la tarea actual tiene una flecha ▶)

### Marcar Tarea como Completada

**Opción 1: Con IA Review (Recomendado)**
1. `Ctrl+Shift+P` → `KnowledgeForge: Revisar Tarea con IA`
2. La IA revisará tu código y te dará feedback
3. Si aprueba, avanzarás automáticamente

**Opción 2: Manualmente**
1. `Ctrl+Shift+P` → `KnowledgeForge: Marcar Tarea como Completada`
2. Confirma y pasarás a la siguiente tarea

### Ver tu Progreso

1. `Ctrl+Shift+P` → `KnowledgeForge: Ver Estado del Proyecto`
2. Verás cuántas tareas has completado

## Estructura del Proyecto

```
mi-roadmap-2025/
├── .knowledgeforge/          # Estado de tu progreso (auto-generado)
│   ├── state.json           # NO EDITAR - Se actualiza automáticamente
│   └── .gitignore
├── ROADMAP.md               # Tu roadmap completo con checkboxes
├── README.md                # Información del proyecto
├── src/                     # Tu código aquí
└── tests/                   # Tus tests aquí
```

## El Sidebar "Mi Roadmap"

En la barra lateral izquierda verás:

```
Mi Roadmap
├── Progreso: 3/20 (15%)    # Tu progreso total
├── 📍 Fase 1: Fundamentos (Actual)
│   ├── ✓ Tarea completada
│   ├── ▶ Tarea actual      # Tu tarea pendiente
│   └── ○ Tarea pendiente
├── Fase 2: Backend
└── Fase 3: Proyecto Real
```

**Iconos:**
- ✅ = Fase completada
- 📍 = Fase actual
- ▶ = Tarea en la que estás trabajando
- ✓ = Tarea completada
- ○ = Tarea pendiente

## Problemas Comunes

### "No hay proyecto activo"

**Solución:** Asegúrate de que:
1. Tienes la carpeta del proyecto abierta (File > Open Folder)
2. Existe el archivo `.knowledgeforge/state.json` en tu proyecto
3. Existe el archivo `ROADMAP.md` en tu proyecto

Si no aparece, vuelve a generar el proyecto desde el inicio.

### "El estado se pierde al cerrar VS Code"

**Solución:** Esto NO debería pasar. El estado se guarda en:
- `.knowledgeforge/state.json` (archivo físico)
- workspaceState de VS Code

Si se pierde, revisa que el archivo exista.

### "La IA no genera buenos roadmaps"

**Solución:** Proporciona más detalles en tu CV:
- Años de experiencia específicos
- Tecnologías concretas
- Proyectos que has hecho
- Objetivos claros
- Tu nivel actual (junior, mid, senior)

## Comandos Disponibles

| Comando | Qué hace |
|---------|----------|
| `KnowledgeForge: Abrir Aula` | Genera un nuevo roadmap |
| `KnowledgeForge: Ver Tarea Actual` | Muestra tu tarea pendiente |
| `KnowledgeForge: Revisar Tarea con IA` | Code review automático |
| `KnowledgeForge: Marcar Tarea como Completada` | Avanza manualmente |
| `KnowledgeForge: Ver Estado del Proyecto` | Resumen de progreso |
| `KnowledgeForge: Configurar API Key` | Cambia tu API Key |
| `KnowledgeForge: Cambiar Proveedor de IA` | Cambiar entre DeepSeek/Gemini/OpenAI |

## Tips

1. **Usa el Code Review con IA**: Te da feedback valioso y aprueba automáticamente
2. **Revisa el ROADMAP.md**: Tiene todas tus tareas con checkboxes que puedes marcar
3. **No edites state.json**: Se actualiza automáticamente
4. **Haz commits frecuentes**: Git está listo en tu proyecto
5. **Lee las descripciones de cada fase**: Te dan contexto de qué aprenderás

## Soporte

Si tienes problemas:
1. Revisa esta guía
2. Mira los logs en la consola de VS Code (Help > Toggle Developer Tools)
3. Reporta issues en: https://github.com/tu-repo/knowledge-forge/issues
