import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AIServiceFactory } from '../services/AIServiceFactory';
import { ProjectStateService } from '../services/ProjectStateService';
import { ConfigService } from '../services/ConfigService';
import { IntelligentCacheService } from '../services/IntelligentCacheService';

/**
 * Estado del aprendizaje de una tarea
 */
interface TaskLearningState {
    currentStep: number;
    completedSteps: number[];
    chatHistory: { role: 'user' | 'ai'; message: string }[];
    cachedSteps: { [stepNumber: number]: any }; // Cache de pasos ya generados
}

/**
 * Panel interactivo de aprendizaje para cada tarea
 * Sistema dinámico paso a paso con IA como mentor
 */
export class TaskLearningPanel {
    public static currentPanel: TaskLearningPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    private _learningState: TaskLearningState;

    public static async createOrShow(
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
        phaseIndex?: number,
        taskIndex?: number,
        roadmapId?: string
    ) {
        const column = vscode.ViewColumn.One;

        // Si ya existe un panel, mostrarlo
        if (TaskLearningPanel.currentPanel) {
            TaskLearningPanel.currentPanel._panel.reveal(column);
            await TaskLearningPanel.currentPanel._refresh();
            return;
        }

        // Crear nuevo panel
        const panel = vscode.window.createWebviewPanel(
            'knowledgeForgeLearning',
            '📚 Modo Aprendizaje - KnowledgeForge',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        TaskLearningPanel.currentPanel = new TaskLearningPanel(panel, extensionUri, context, phaseIndex, taskIndex, roadmapId);
    }

    public postCodeToExplain(code: string) {
        this._panel.webview.postMessage({ type: 'codeToExplain', code: code });
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
        private readonly phaseIndex?: number,
        private readonly taskIndex?: number,
        private readonly roadmapId?: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        // Estado inicial
        this._learningState = {
            currentStep: 0,
            completedSteps: [],
            chatHistory: [],
            cachedSteps: {}
        };

        // Configurar contenido inicial
        this._update();

        // Escuchar cuando el panel es cerrado
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Manejar mensajes desde el webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                try {
                    console.log('[TaskLearningPanel] onDidReceiveMessage:', message.type, message);
                    switch (message.type) {
                        case 'loadStep':
                            await this._handleLoadStep(message.stepNumber);
                            break;
                        case 'completeStep':
                            await this._handleCompleteStep(message.stepNumber);
                            break;
                        case 'completeTask':
                            await this._handleCompleteTask();
                            break;
                        case 'askAI':
                            await this._handleAskAI(message.question);
                            break;
                        case 'continueStep':
                            await this._handleContinueStep(message.stepNumber);
                            break;
                        case 'openInSandbox':
                            await this._handleOpenInSandbox(message.code || '');
                            break;
                        case 'closePanel':
                            this.dispose();
                            await vscode.commands.executeCommand('knowledgeforge.openLearningMode');
                            break;
                        case 'navigateToNextTask':
                            try {
                                // Close current panel first
                                this.dispose();

                                // Advance the project pointer to next task
                                await vscode.commands.executeCommand('knowledgeforge.nextTask');

                                // Re-open the learning mode for the new current task
                                await vscode.commands.executeCommand('knowledgeforge.openLearningMode');
                            } catch (err) {
                                console.error('Error navigating to next task:', err);
                            }
                            break;
                        case 'webviewError':
                            // Forward webview rendering/parsing errors to Extension Host logs for debugging
                            try {
                                console.error('[TaskLearningPanel] Webview reported error on step', message.stepNumber + ':', message.error);
                                vscode.window.showErrorMessage('KnowledgeForge webview error: ' + (message.error || 'unknown error'));
                            } catch (e) {
                                console.error('Failed to handle webviewError message:', e);
                            }
                            break;
                        default:
                            console.warn('Mensaje desconocido del webview:', message.type);
                    }
                } catch (err) {
                    console.error('Error manejando mensaje del webview:', err);
                }
            },
            null,
            this._disposables
        );
    }

    private async _refresh() {
        this._update();
    }

    private async _handleOpenInSandbox(code: string) {
        try {
            // Create a temp file to avoid using the untitled: scheme which causes FS provider errors
            const tmpDir = path.join(os.tmpdir(), 'knowledgeforge_sandbox');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            const filePath = path.join(tmpDir, `sandbox_${Date.now()}.ts`);
            fs.writeFileSync(filePath, code || '', 'utf8');

            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({ type: 'error', message: `Error abriendo sandbox: ${errorMessage}` });
        }
    }

    private async _handleCompleteTask() {
        try {
            const state = ProjectStateService.getState(this._context);
            if (!state) {
                this._panel.webview.postMessage({ type: 'error', message: 'No hay proyecto activo' });
                return;
            }

            // Complete current task and get whether there's a next
            const result = await ProjectStateService.completeCurrentTask(this._context, 'Completado desde Modo Aprendizaje', 0);

            // Optionally check badges
            const newBadges = await (await import('../services/BadgesService')).BadgesService.checkAndUnlockBadges(this._context).catch(() => []);

            // Refresh UI via event already fired by saveState
            // Close panel and open next task if there is one
            if (result.hasNext) {
                // Inform webview to close and let extension open the next learning mode
                this._panel.webview.postMessage({ type: 'taskCompletedAndMoved' });
                // Dispose panel and open next task
                this.dispose();
                await vscode.commands.executeCommand('knowledgeforge.openLearningMode');
            } else {
                // Project complete
                this._panel.webview.postMessage({ type: 'allTasksCompleted' });
            }
        } catch (error) {
            console.error('Error completing task:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({ type: 'error', message: `Error completando tarea: ${errorMessage}` });
        }
    }

    /**
     * Carga el contenido de un paso específico con IA
     */
    private async _handleLoadStep(stepNumber: number) {
        console.log(`[TaskLearningPanel] _handleLoadStep start for step ${stepNumber}`);
        const state = ProjectStateService.getState(this._context);
        if (!state) {
            this._panel.webview.postMessage({
                type: 'error',
                message: 'No hay proyecto activo'
            });
            return;
        }

        const currentTask = ProjectStateService.getCurrentTask(state);
        if (!currentTask) {
            this._panel.webview.postMessage({
                type: 'error',
                message: 'No hay tarea actual'
            });
            return;
        }

        // Create cache key based on task and step
        const cacheKey = IntelligentCacheService.generateKey(
            'step-content',
            currentTask.phase.title,
            currentTask.task,
            stepNumber.toString()
        );

        // Try to get from intelligent cache first
        let cachedContent: any = null;
        try {
            cachedContent = await IntelligentCacheService.get(cacheKey);
            console.log('[TaskLearningPanel] cache lookup for', cacheKey, 'result:', !!cachedContent);
        } catch (cacheErr) {
            console.error('Cache error while getting step content:', cacheErr);
            cachedContent = null;
        }
        if (cachedContent) {
            this._learningState.currentStep = stepNumber;
            this._panel.webview.postMessage({
                type: 'stepLoaded',
                stepNumber,
                content: cachedContent
            });
            console.log('[TaskLearningPanel] stepLoaded from cache for step', stepNumber);
            return;
        }

        // Show loading if not in local cache
        if (!this._learningState.cachedSteps[stepNumber]) {
            this._panel.webview.postMessage({ type: 'loadingStep' });
        } else {
            // Use local cache while we check intelligent cache
            this._learningState.currentStep = stepNumber;
            this._panel.webview.postMessage({
                type: 'stepLoaded',
                stepNumber,
                content: this._learningState.cachedSteps[stepNumber]
            });
            return;
        }

        try {
            const apiKey = await ConfigService.getApiKey(this._context);
            if (!apiKey) {
                this._panel.webview.postMessage({
                    type: 'error',
                    message: 'Necesitas configurar tu API Key'
                });
                return;
            }

            // Generate content of the step with AI
            // Add a timeout for AI generation to avoid infinite waiting
            const aiPromise = this._generateStepContent(stepNumber, currentTask, state, apiKey);
            const timeoutMs = 60000; // 60 seconds
            
            // Inform user that content is being generated
            this._panel.webview.postMessage({ 
                type: 'status', 
                message: 'Generando contenido... esto puede tomar hasta 60 segundos.' 
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('La generación del contenido está tomando más tiempo del esperado. Por favor, inténtalo de nuevo.')), timeoutMs)
            );

            let stepContent: any;
            try {
                stepContent = await Promise.race([aiPromise, timeoutPromise]);
                console.log('[TaskLearningPanel] AI content generated for step', stepNumber);
            } catch (err) {
                console.error('Error generating step content:', err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                this._panel.webview.postMessage({ type: 'error', message: `Error generando contenido del paso: ${errorMessage}` });
                return;
            }

            // Save to both caches
            this._learningState.cachedSteps[stepNumber] = stepContent;
            await IntelligentCacheService.set(cacheKey, stepContent);
            this._learningState.currentStep = stepNumber;

            this._panel.webview.postMessage({
                type: 'stepLoaded',
                stepNumber,
                content: stepContent
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error cargando paso: ${errorMessage}`
            });
        }
    }

    /**
     * Solicita al AI que expanda el contenido del paso (generación incremental)
     */
    private async _handleContinueStep(stepNumber: number) {
        try {
            const state = ProjectStateService.getState(this._context);
            if (!state) throw new Error('No hay estado');

            const currentTask = ProjectStateService.getCurrentTask(state);
            if (!currentTask) throw new Error('No hay tarea actual');

            const apiKey = await ConfigService.getApiKey(this._context);
            if (!apiKey) throw new Error('No hay API Key');

            const aiService = AIServiceFactory.createService(apiKey);

            // Build a prompt asking to expand the existing step content
            const prompt = `Expande y enriquece el contenido del paso ${stepNumber + 1} para la tarea "${currentTask.task}". Proporciona más ejemplos, recursos, explicaciones y pasos accionables. Responde en JSON apropiado para el tipo de paso.`;

            this._panel.webview.postMessage({ type: 'status', message: 'Generando contenido adicional...' });

            const response = await aiService.generateContent(prompt);
            const parsed = this._parseStepResponse(response, stepNumber, 'Contenido adicional');

            // Merge or append to cached step content
            const existing = this._learningState.cachedSteps[stepNumber] || {};
            const merged = { ...existing, _continued: parsed };
            this._learningState.cachedSteps[stepNumber] = merged;

            // Update webview with the enriched content
            this._panel.webview.postMessage({ type: 'stepLoaded', stepNumber, content: merged });
        } catch (error) {
            console.error('Error expanding step content:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({ type: 'error', message: `Error expandiendo contenido: ${errorMessage}` });
        }
    }

    /**
     * Genera el contenido de un paso específico con IA
     */
    private async _generateStepContent(
        stepNumber: number,
        currentTask: any,
        state: any,
        apiKey: string
    ): Promise<any> {
        const aiService = AIServiceFactory.createService(apiKey);
        const progress = ProjectStateService.getProgress(state);

        const stepNames = [
            '🎯 Entender el Objetivo',
            '📚 Conceptos Clave',
            '💡 Ejemplo Guiado',
            '✍️ Tu Turno - Práctica',
            '✅ Validación'
        ];

        const prompt = this._buildStepPrompt(
            stepNumber,
            currentTask,
            progress,
            stepNames
        );

        try {
            const response = await aiService.generateContent(prompt);
            return this._parseStepResponse(response, stepNumber, stepNames[stepNumber]);
        } catch (error) {
            console.error('Error generando contenido del paso:', error);
            throw error;
        }
    }

    /**
     * Construye el prompt para generar un paso específico
     */
    private _buildStepPrompt(
        stepNumber: number,
        currentTask: any,
        progress: any,
        stepNames: string[]
    ): string {
        // Special handling for step 0 (diagram generation)
        if (stepNumber === 0) {
            return `Eres un mentor experto en programación. Estás guiando a un estudiante paso a paso en su aprendizaje.

**CONTEXTO:**
Tarea actual: ${currentTask.task}
Fase: ${currentTask.phase.title}
Progreso general: ${progress.completed}/${progress.total} tareas

**PASO ACTUAL:** ${stepNumber + 1}/5 - ${stepNames[stepNumber]}

**TU MISIÓN:**
Explica de forma clara y concisa QUÉ es lo que el estudiante necesita lograr en esta tarea. Define el objetivo y por qué es importante. Además, crea un diagrama simple que ayude a visualizar el objetivo de esta tarea.

**REQUISITOS PARA EL DIAGRAMA:**
1. Debe ser un diagrama simple en texto (ASCII) o SVG básico
2. Debe visualizar claramente el objetivo de la tarea
3. Debe ser fácil de entender para un principiante
4. Si no puedes crear un diagrama apropiado, omite esta parte

**FORMATO DE RESPUESTA:**
Responde en JSON con este formato (sin incluir los backticks de json en tu respuesta):

{
  "title": "Título descriptivo del objetivo",
  "description": "Explicación detallada del objetivo y por qué es importante",
  "diagram": "Diagrama en texto ASCII o SVG básico (opcional, si aplica)",
  "importance": "Por qué es importante dominar esta tarea"
}`;
        }

        const stepDescriptions = [
            "", // Placeholder for step 0 which is handled above
            `Enseña los conceptos técnicos fundamentales que el estudiante necesita entender. Explica de forma didáctica, con analogías si es necesario.`, 
            `Proporciona un plan de acción paso a paso como una lista de tareas. Además, muestra un ejemplo de código completo y comentado que implemente dicho plan.`, 
            `Proporciona un ejercicio práctico específico que el estudiante debe completar. Dale instrucciones claras de qué crear.`, 
            `Proporciona criterios de validación: qué debe verificar el estudiante para saber que completó correctamente la tarea.`
        ];

        let responseFormat = '';
        switch (stepNumber) {
            case 0:
                responseFormat = `{
  "title": "Título descriptivo del objetivo",
  "description": "Explicación detallada del objetivo y por qué es importante",
  "diagram": "Diagrama en texto ASCII o SVG básico (opcional, si aplica)",
  "importance": "Por qué es importante dominar esta tarea"
}`;
                break;
            case 1:
                responseFormat = `{
  "description": "Explicación general de los conceptos",
  "concepts": [
    {
      "name": "Nombre del concepto",
      "explanation": "Explicación detallada del concepto"
    }
  ]
}`;
                break;
            case 2:
                responseFormat = `{
  "plan": ["Paso 1 del plan", "Paso 2 del plan", "..."],
  "codeExample": "// Código de ejemplo completo y comentado\n..."
}`;
                break;
            case 3:
                responseFormat = `{
  "task": "Descripción del ejercicio práctico",
  "instructions": ["Instrucción 1", "Instrucción 2", "..."]
}`;
                break;
            case 4:
                responseFormat = `{
  "criteria": ["Criterio de validación 1", "Criterio de validación 2", "..."]
}`;
                break;
        }

        return `Eres un mentor experto en programación. Estás guiando a un estudiante paso a paso en su aprendizaje.

**CONTEXTO:**
Tarea actual: ${currentTask.task}
Fase: ${currentTask.phase.title}
Progreso general: ${progress.completed}/${progress.total} tareas

**PASO ACTUAL:** ${stepNumber + 1}/5 - ${stepNames[stepNumber]}

**TU MISIÓN:**
${stepDescriptions[stepNumber]}

**FORMATO DE RESPUESTA:**
Responde en JSON con este formato (sin incluir los backticks de json en tu respuesta):

${responseFormat}`;

    }

    private _getHtmlForWebview(currentTask?: any) {
        const nonce = this._getNonce();

        // If no task, show error
        if (!currentTask) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modo Aprendizaje - KnowledgeForge</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            text-align: center;
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 20px;
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            margin: 20px 0;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="error">
        <p>No hay tarea disponible. Por favor, selecciona una tarea del roadmap.</p>
    </div>
</body>
</html>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modo Aprendizaje - KnowledgeForge</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
        }
        h1 {
            color: var(--vscode-foreground);
            margin-bottom: 10px;
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        .steps-container {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .step {
            padding: 10px 20px;
            margin: 0 10px;
            cursor: pointer;
            border-radius: 20px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            transition: all 0.3s ease;
        }
        .step:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .step.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .step.completed {
            background-color: rgba(45, 150, 45, 0.2);
            border-color: var(--vscode-terminal-ansiGreen);
        }
        .step-content {
            display: none;
            animation: fadeIn 0.5s;
        }
        .step-content.active {
            display: block;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .step-title {
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .step-description {
            line-height: 1.6;
            color: var(--vscode-descriptionForeground);
        }
        .concept-list {
            padding-left: 20px;
        }
        .concept-list li {
            margin-bottom: 10px;
            line-height: 1.5;
        }
        .action-plan {
            margin: 20px 0;
        }
        .action-plan ul {
            padding-left: 20px;
        }
        .action-plan li {
            margin-bottom: 10px;
        }
        .action-plan li.completed {
            opacity: 0.7;
            text-decoration: line-through;
        }
        .code-example {
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            border: 1px solid var(--vscode-panel-border);
        }
        .practice-task {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .validation-criteria {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .validation-criteria ul {
            padding-left: 20px;
        }
        .validation-criteria li {
            margin-bottom: 10px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .status-message {
            background-color: var(--vscode-textBlockQuote-background);
            color: var(--vscode-textBlockQuote-foreground);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 10px 15px;
            margin: 15px 0;
            font-style: italic;
        }
        .diagram-container {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: monospace;
            white-space: pre;
        }
        .diagram-container svg {
            max-width: 100%;
            height: auto;
        }
        .chat-container {
            margin-top: 30px;
            border-top: 1px solid var(--vscode-panel-border);
            padding-top: 20px;
        }
        .chat-messages {
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 4px;
        }
        .chat-message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        .chat-message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            text-align: right;
        }
        .chat-message.ai {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
        }
        .chat-input {
            display: flex;
        }
        .chat-input input {
            flex: 1;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
            border-radius: 4px 0 0 4px;
        }
        .chat-input button {
            border-radius: 0 4px 4px 0;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 20px;
            text-align: center;
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 ` + currentTask.phase.title + `</h1>
        <p class="subtitle" id="task-info">` + currentTask.task + `</p>
    </div>

    <div class="steps-container" id="steps-container">
        <!-- Steps will be populated by JavaScript -->
    </div>

    <div id="loading" class="loading" style="display: none;">
        <p>Cargando contenido del paso...</p>
    </div>

    <div id="error" class="error" style="display: none;">
        <p id="error-message"></p>
    </div>

    <div id="step-contents">
        <!-- Step contents will be populated by JavaScript -->
    </div>

    <div class="chat-container">
        <h3>💬 Preguntar a la IA</h3>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input">
            <input type="text" id="chat-input" placeholder="Haz una pregunta sobre esta tarea..." />
            <button id="send-chat">Enviar</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // State
        let currentStep = 0;
        let completedSteps = [];
        let chatHistory = [];
        
        // DOM Elements
        const stepsContainer = document.getElementById('steps-container');
        const taskInfo = document.getElementById('task-info');
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        const errorMessageElement = document.getElementById('error-message');
        const stepContents = document.getElementById('step-contents');
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const sendChatButton = document.getElementById('send-chat');
        
        // Step names
        const stepNames = [
            '🎯 Entender el Objetivo',
            '📚 Conceptos Clave', 
            '💡 Ejemplo Guiado',
            '✍️ Tu Turno - Práctica',
            '✅ Validación'
        ];
        
        // Initialize
        function init() {
            // Load first step
            loadStep(0);
            
            // Event listeners
            sendChatButton.addEventListener('click', sendChatMessage);
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendChatMessage();
                }
            });
        }
        
        // Load a specific step
        function loadStep(stepNumber) {
            // Show loading
            showLoading();
            
            // Clear any existing status message
            const existingStatus = document.querySelector('.status-message');
            if (existingStatus) {
                existingStatus.remove();
            }

            // Send message to extension
            vscode.postMessage({
                type: 'loadStep',
                stepNumber: stepNumber
            });
            
            currentStep = stepNumber;
            updateStepsUI();
        }
        
        // Mark step as completed
        function completeStep(stepNumber) {
            vscode.postMessage({
                type: 'completeStep',
                stepNumber: stepNumber
            });
            
            if (!completedSteps.includes(stepNumber)) {
                completedSteps.push(stepNumber);
            }
            
            updateStepsUI();
        }
        
        // Send chat message
        function sendChatMessage() {
            const question = chatInput.value.trim();
            if (!question) return;
            
            // Add to chat history
            chatHistory.push({ role: 'user', message: question });
            updateChatUI();
            
            // Clear input
            chatInput.value = '';
            
            // Send to extension
            vscode.postMessage({
                type: 'askAI',
                question: question
            });
        }
        
        // Update steps UI
        function updateStepsUI() {
            // Update steps container
            stepsContainer.innerHTML = '';
            for (let i = 0; i < stepNames.length; i++) {
                const name = stepNames[i];
                let classes = 'step';
                if (i === currentStep) classes += ' active';
                if (completedSteps.includes(i)) classes += ' completed';
                
                const stepElement = document.createElement('div');
                stepElement.className = classes;
                stepElement.textContent = (i + 1) + '. ' + name;
                stepElement.onclick = function() {
                    loadStep(i);
                };
                
                stepsContainer.appendChild(stepElement);
            }
            
            // Update step contents
            updateStepContentsUI();
        }
        
        // Update step contents UI
        function updateStepContentsUI() {
            // This will be called when step content is loaded
        }
        
        // Update chat UI
        function updateChatUI() {
            chatMessages.innerHTML = '';
            for (let i = 0; i < chatHistory.length; i++) {
                const msg = chatHistory[i];
                const messageElement = document.createElement('div');
                messageElement.className = 'chat-message ' + msg.role;
                messageElement.textContent = msg.message;
                chatMessages.appendChild(messageElement);
            }
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Show loading indicator
        function showLoading() {
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';
            stepContents.innerHTML = '';
        }
        
        // Show error message
        function showError(message) {
            loadingElement.style.display = 'none';
            errorElement.style.display = 'block';
            errorMessageElement.textContent = message;
        }
        
    // Keep last rendered code example for sandbox
    let lastCodeExample = '';

    // Render step content
        // Render step content
        function renderStepContent(stepNumber, content) {
            try {
                loadingElement.style.display = 'none';
                errorElement.style.display = 'none';

                // Clear content
                stepContents.innerHTML = '';

                // Create step content element
                const stepContent = document.createElement('div');
                stepContent.className = 'step-content active';

                // Safe getters
                const safe = (obj, path, fallback) => {
                    try {
                        const parts = path.split('.');
                        let cur = obj;
                        for (const p of parts) {
                            if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
                                cur = cur[p];
                            } else {
                                return fallback;
                            }
                        }
                        return cur === undefined ? fallback : cur;
                    } catch (e) {
                        return fallback;
                    }
                };

                // Render content based on step number
                switch(stepNumber) {
                case 0: // Understand the goal
                    stepContent.innerHTML = 
                        '<h2 class="step-title">' + stepNames[stepNumber] + '</h2>' +
                        '<div class="step-description">' +
                            '<h3>' + (safe(content,'title','(Sin título)')) + '</h3>' +
                            '<p>' + (safe(content,'description','(Sin descripción)')) + '</p>' +
                            '<p><strong>Importancia:</strong> ' + (safe(content,'importance','')) + '</p>' +
                        '</div>' +
                        (safe(content,'diagram','') ? '<div class="diagram-container">' +
                            '<h3>Diagrama</h3>' +
                            (safe(content,'diagram','').includes('<svg') ? safe(content,'diagram','') : '<pre>' + safe(content,'diagram','') + '</pre>') +
                        '</div>' : '') +
                        '<button onclick="completeStep(' + stepNumber + ')">Marcar como entendido</button>';
                    // Add continue button
                    stepContent.innerHTML += '<button onclick="continueStep(' + stepNumber + ')">Continuar (más detalle)</button>';
                    break;
                    
                case 1: // Key concepts
                    {
                        const desc = safe(content,'description','');
                        const concepts = safe(content,'concepts',[]);
                        stepContent.innerHTML = 
                            '<h2 class="step-title">' + stepNames[stepNumber] + '</h2>' +
                            '<div class="step-description">' +
                                desc +
                            '</div>' +
                            '<div class="concept-list">' +
                                '<h3>Conceptos clave:</h3>' +
                                '<ul>';
                        for (let i = 0; i < concepts.length; i++) {
                            const concept = concepts[i];
                            stepContent.innerHTML += '<li><strong>' + (concept.name || '') + ':</strong> ' + (concept.explanation || '') + '</li>';
                        }
                        stepContent.innerHTML += 
                                '</ul>' +
                            '</div>' +
                            '<button onclick="completeStep(' + stepNumber + ')">Marcar como comprendido</button>';
            stepContent.innerHTML += '<button onclick="continueStep(' + stepNumber + ')">Continuar (más detalle)</button>';
                    }
                    break;
                    
                case 2: // Guided example
                    {
                        const plan = safe(content,'plan',[]);
                        const codeExample = safe(content,'codeExample','');
                        stepContent.innerHTML = 
                            '<h2 class="step-title">' + stepNames[stepNumber] + '</h2>' +
                            '<div class="action-plan">' +
                                '<h3>Plan de acción:</h3>' +
                                '<ul>';
                        for (let i = 0; i < plan.length; i++) {
                            const item = plan[i];
                            stepContent.innerHTML += '<li>' + (item || '') + '</li>';
                        }
                        stepContent.innerHTML += 
                                '</ul>' +
                            '</div>' +
                            '<div>' +
                                '<h3>Ejemplo de código:</h3>' +
                                '<div class="code-example">' +
                                    '<pre>' + codeExample + '</pre>' +
                                '</div>' +
                                '<button onclick="openInSandbox()">Abrir en Sandbox</button>' +
                                '<button onclick="completeStep(' + stepNumber + ')">Marcar como practicado</button>' +
                            '</div>';
                        stepContent.innerHTML += '<button onclick="continueStep(' + stepNumber + ')">Continuar (más detalle)</button>';
                        // Save last code example so sandbox can open it
                        lastCodeExample = codeExample || '';
                    }
                    break;
                    
                case 3: // Practice
                    {
                        const taskText = safe(content,'task','');
                        const instructions = safe(content,'instructions',[]);
                        stepContent.innerHTML = 
                            '<h2 class="step-title">' + stepNames[stepNumber] + '</h2>' +
                            '<div class="practice-task">' +
                                '<h3>Tu turno:</h3>' +
                                '<p>' + taskText + '</p>' +
                                '<h4>Instrucciones:</h4>' +
                                '<ul>';
                        for (let i = 0; i < instructions.length; i++) {
                            const inst = instructions[i];
                            stepContent.innerHTML += '<li>' + (inst || '') + '</li>';
                        }
                        stepContent.innerHTML += 
                                '</ul>' +
                            '</div>' +
                            '<button onclick="completeStep(' + stepNumber + ')">Marcar como completado</button>';
            stepContent.innerHTML += '<button onclick="continueStep(' + stepNumber + ')">Continuar (más detalle)</button>';
                    }
                    break;
                    
                case 4: // Validation
                    {
                        const criteria = safe(content,'criteria',[]);
                        stepContent.innerHTML = 
                            '<h2 class="step-title">' + stepNames[stepNumber] + '</h2>' +
                            '<div class="validation-criteria">' +
                                '<h3>Criterios de validación:</h3>' +
                                '<ul>';
                        for (let i = 0; i < criteria.length; i++) {
                            const criterion = criteria[i];
                            stepContent.innerHTML += '<li>' + (criterion || '') + '</li>';
                        }
                        stepContent.innerHTML += 
                                '</ul>' +
                            '</div>' +
                            '<button onclick="completeTask()">Marcar como validado</button>' +
                            '<button onclick="nextTask()">Siguiente tarea</button>';
            stepContent.innerHTML += '<button onclick="continueStep(' + stepNumber + ')">Continuar (más detalle)</button>';
                    }
                    break;
            }
            
                // Add content to container
                stepContents.appendChild(stepContent);
            } catch (renderErr) {
                // Report error back to extension host for debugging
                try {
                    vscode.postMessage({ type: 'webviewError', error: String(renderErr), stepNumber });
                } catch (e) {
                    console.error('Failed to post webviewError:', e);
                }
                showError('Error renderizando el contenido del paso: ' + String(renderErr));
            }
        }
        
        // Open code in sandbox
        function openInSandbox() {
            // Send the last code example to the extension to open in a sandbox editor
            vscode.postMessage({
                type: 'openInSandbox',
                code: lastCodeExample
            });
        }
        
        // Move to next task
        function nextTask() {
            // Ask extension to navigate to the next task (it will also close the panel)
            vscode.postMessage({
                type: 'navigateToNextTask'
            });
        }

        // Complete the entire task (mark as validated) -- posts to extension
        function completeTask() {
            vscode.postMessage({
                type: 'completeTask'
            });
        }
        
        // Handle messages from extension
        window.addEventListener('message', function(event) {
            const message = event.data;
            
            switch(message.type) {
                case 'status':
                    // Remove any existing status message
                    const existingStatus = document.querySelector('.status-message');
                    if (existingStatus) {
                        existingStatus.remove();
                    }
                    
                    // Add new status message
                    const statusDiv = document.createElement('div');
                    statusDiv.className = 'status-message';
                    statusDiv.textContent = message.message;
                    loadingElement.insertAdjacentElement('afterend', statusDiv);
                    break;
                
                case 'taskInfo':
                    taskInfo.textContent = message.info;
                    break;
                    
                case 'stepLoaded':
                    renderStepContent(message.stepNumber, message.content);
                    break;
                    
                case 'loadingStep':
                    showLoading();
                    break;
                    
                case 'error':
                    showError(message.message);
                    break;
                    
                case 'chatResponse':
                    chatHistory.push({ role: 'ai', message: message.response });
                    updateChatUI();
                    break;
                    
                case 'codeToExplain':
                    // Handle code explanation
                    break;
                    
                case 'allTasksCompleted':
                    // Show completion message
                    showError('🎉 ¡Felicidades! Has completado todas las tareas.');
                    break;
            }
        });
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public dispose() {
        TaskLearningPanel.currentPanel = undefined;

        // Limpieza de disposables
        this._disposables.forEach((disposable) => disposable.dispose());
        this._disposables = [];
    }

    private async _update() {
        const state = ProjectStateService.getState(this._context);
        if (!state) {
            this._panel.webview.html = this._getHtmlForWebview();
            return;
        }

        let currentTask;
        if (this.phaseIndex !== undefined && this.taskIndex !== undefined) {
            // Use specific task if provided; prefer roadmapId if given
            if (this.roadmapId && state.roadmaps) {
                const rm = state.roadmaps.find(r => r.id === this.roadmapId);
                if (rm) {
                    currentTask = {
                        phase: rm.roadmap[this.phaseIndex],
                        task: rm.roadmap[this.phaseIndex]?.tasks[this.taskIndex],
                        phaseIndex: this.phaseIndex,
                        taskIndex: this.taskIndex
                    };
                }
            }

            // Fallback to legacy single roadmap if still not set
            if (!currentTask && (state as any).roadmap) {
                const legacy = (state as any).roadmap as any[];
                currentTask = {
                    phase: legacy[this.phaseIndex],
                    task: legacy[this.phaseIndex]?.tasks[this.taskIndex],
                    phaseIndex: this.phaseIndex,
                    taskIndex: this.taskIndex
                };
            }
        } else {
            // Use current task from state (active roadmap)
            currentTask = ProjectStateService.getCurrentTask(state as any);
        }

        if (!currentTask || !currentTask.phase || !currentTask.task) {
            this._panel.webview.html = this._getHtmlForWebview();
            return;
        }

        this._panel.title = `📚 ${currentTask.phase.title} - KnowledgeForge`;
        this._panel.webview.html = this._getHtmlForWebview(currentTask);
    }

    private async _handleCompleteStep(stepNumber: number) {
        // Marcar paso como completado en el estado
        if (!this._learningState.completedSteps.includes(stepNumber)) {
            this._learningState.completedSteps.push(stepNumber);
        }

        // Actualizar UI
        this._panel.webview.postMessage({
            type: 'stepCompleted',
            stepNumber: stepNumber
        });
    }

    private async _handleAskAI(question: string) {
        try {
            const state = ProjectStateService.getState(this._context);
            if (!state) {
                throw new Error('No hay estado de proyecto disponible');
            }

            const apiKey = await ConfigService.getApiKey(this._context);
            if (!apiKey) {
                throw new Error('No hay API key configurada');
            }

            const aiService = AIServiceFactory.createService(apiKey);
            const currentTask = ProjectStateService.getCurrentTask(state);
            
            if (!currentTask) {
                throw new Error('No hay tarea actual');
            }

            const prompt = `Eres un mentor experto en programación. Un estudiante está trabajando en la tarea: "${currentTask.task}".
            
Pregunta del estudiante: ${question}

Por favor, responde de forma clara y concisa.`;

            const response = await aiService.generateContent(prompt);

            this._panel.webview.postMessage({
                type: 'chatResponse',
                response: response
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error al obtener respuesta: ${errorMessage}`
            });
        }
    }

    private _parseStepResponse(response: string, stepNumber: number, stepName: string): any {
        try {
            // Clean the response to extract only the JSON part
            let cleanResponse = response.trim();
            
            // Remove any markdown code block indicators
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.substring(7);
            }
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.substring(3);
            }
            if (cleanResponse.endsWith('```')) {
                cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
            }
            
            // Parse the JSON
            const parsed = JSON.parse(cleanResponse);
            return parsed;
        } catch (error) {
            console.error('Error parsing step response:', error);
            // Return a default structure if parsing fails
            return {
                title: stepName,
                description: 'Contenido generado por IA',
                content: response
            };
        }
    }

    private async _handleNextTask() {
        // Close current panel and open next task
        this.dispose();
        await vscode.commands.executeCommand('knowledgeforge.openLearningMode');
    }
}
