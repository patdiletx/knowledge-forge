# 🧪 Cómo Probar KnowledgeForge

## Requisitos Previos

- Visual Studio Code instalado
- Node.js y npm instalados

## Pasos para Ejecutar la Extensión en Modo Desarrollo

### 1. Abrir el Proyecto en VS Code

```bash
cd C:\Repos\knowledge-forge
code .
```

### 2. Compilar el Proyecto (si aún no lo has hecho)

```bash
npm run compile
```

### 3. Ejecutar la Extensión en Modo Debug

1. Presiona `F5` o ve a `Run > Start Debugging`
2. Esto abrirá una nueva ventana de VS Code con la extensión cargada (Extension Development Host)

### 4. Probar el Comando Principal

1. En la ventana de Extension Development Host, abre la paleta de comandos:
   - **Windows/Linux**: `Ctrl + Shift + P`
   - **macOS**: `Cmd + Shift + P`

2. Escribe: `KnowledgeForge: Abrir Aula`

3. Presiona Enter

### 5. Probar el Flujo Completo

1. En el webview que se abre, ingresa un CV de ejemplo en el textarea:

```
Soy desarrollador web con 5 años de experiencia.
Trabajo principalmente con JavaScript, React y Node.js.
He desarrollado APIs REST y aplicaciones frontend modernas.
Quiero especializarme en arquitectura de software y patrones de diseño.
Mi objetivo es convertirme en Senior Developer y liderar proyectos técnicos.
```

2. Haz clic en "Generar Mi Roadmap Personalizado"

3. Observa:
   - El indicador de carga (spinner) por 2 segundos
   - El roadmap generado con 4 fases
   - Cada fase con su título, descripción y tareas

### 6. Pruebas Adicionales

**Prueba 1: CV orientado a Backend**
```
Backend Developer con experiencia en Node.js, Express y bases de datos.
Quiero aprender arquitectura de microservicios.
```

**Prueba 2: CV general**
```
Estudiante de informática buscando mi primer proyecto profesional.
```

## Debugging

- La consola de Debug mostrará: "KnowledgeForge está activa!"
- Los errores aparecerán en la consola de Debug de la ventana principal de VS Code
- Puedes poner breakpoints en `src/extension.ts` o en otros archivos TypeScript

## Recompilar Después de Cambios

Si haces cambios en el código:

1. Detén el debug (Shift + F5)
2. Ejecuta: `npm run compile`
3. Vuelve a ejecutar con F5

O mejor aún, usa el modo watch:

```bash
npm run watch
```

Esto recompilará automáticamente cuando guardes cambios.

## Problemas Comunes

### Error: "Cannot find module 'vscode'"

Solución: Ejecuta `npm install`

### La extensión no aparece en los comandos

Solución: Verifica que `package.json` tenga el comando registrado y reinicia el debug.

### El webview no se abre

Solución: Revisa la consola de Debug para ver si hay errores de compilación.

### Error: "models/gemini-pro is not found"

Solución: Ya está arreglado! Usamos `gemini-1.5-flash` que es el modelo actual. Si ves este error:
1. Asegúrate de haber compilado: `npm run compile`
2. Reinicia el debug (Shift + F5, luego F5)

### Error: "API Key inválida" con Gemini

Solución:
1. Verifica que obtuviste la API Key de: https://makersuite.google.com/app/apikey
2. Copia la key completa (empieza con "AIza...")
3. Reconfigura: `KnowledgeForge: Configurar API Key`
4. Pega la key nuevamente

### La IA no genera buenos roadmaps

Solución: Proporciona más detalles en tu CV:
- Años de experiencia específicos
- Tecnologías concretas que conoces
- Proyectos que has realizado
- Objetivos claros y específicos
- Tu nivel actual (junior, mid, senior)
