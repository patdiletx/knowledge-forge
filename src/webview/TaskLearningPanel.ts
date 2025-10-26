import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AIServiceFactory } from '../services/AIServiceFactory';
import { ProjectStateService } from '../services/ProjectStateService';
import { ConfigService } from '../services/ConfigService';
import { IntelligentCacheService } from '../services/IntelligentCacheService';
import { MicroLearningService, MicroLesson } from '../services/MicroLearningService';
import { EducationalHintsService, Hint } from '../services/EducationalHintsService';

/**
 * Estado del aprendizaje de una tarea
 */
interface TaskLearningState {
    currentStep: number;
    completedSteps: number[];
    chatHistory: { role: 'user' | 'ai'; message: string }[];
    cachedSteps: { [stepNumber: number]: any }; // Cache de pasos ya generados
    sessionId?: string; // ID for micro-learning session
    lessons?: MicroLesson[]; // Micro-lessons for this task
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
    private readonly _stepNames = [
        '🎯 Entender el Objetivo',
        '📚 Conceptos Clave',
        '💡 Ejemplo Guiado',
        '✍️ Tu Turno - Práctica',
        '✅ Validación'
    ];
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
            cachedSteps: {},
            sessionId: undefined,
            lessons: undefined
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
                            // After completing a step, load next step and request help
                            if (message.stepNumber + 1 < this._stepNames.length) {
                                // Small delay to allow the completion to register
                                setTimeout(async () => {
                                    await this._handleLoadStep(message.stepNumber + 1);
                                    
                                    // Ask the tutor if the user needs help with the new step
                                    setTimeout(async () => {
                                        await this._handleRequestHelp(message.stepNumber + 1);
                                    }, 1000);
                                }, 500);
                            }
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
                        case 'requestHint':
                            await this._handleRequestHint(message);
                            break;
                        case 'requestHelp':
                            await this._handleRequestHelp(message.stepNumber);
                            break;
                        case 'nextLevelHint':
                            await this._handleNextLevelHint(message);
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
                            console.warn('[TaskLearningPanel] Unknown message type:', message.type);
                    }
                } catch (err) {
                    console.error('[TaskLearningPanel] Error handling message:', message, err);
                }
            },
            null,
            this._disposables
        );

    }

    private async _refresh() {
        // Initialize micro-learning session if not already done
        if (!this._learningState.sessionId && this.phaseIndex !== undefined && this.taskIndex !== undefined) {
            const taskId = `${this.roadmapId || 'default'}-${this.phaseIndex}-${this.taskIndex}`;
            const session = MicroLearningService.getSession(this._context, taskId) || 
                           MicroLearningService.startSession(this._context, taskId, this._stepNames);
            
            this._learningState.sessionId = session.taskId;
            this._learningState.lessons = session.lessons;
        }
        
        this._update();
    }

    private _update() {
        const state = ProjectStateService.getState(this._context);
        if (!state) {
            this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
            return;
        }

        let currentTask;
        if (this.phaseIndex !== undefined && this.taskIndex !== undefined) {
            // Use specific task if provided
            currentTask = {
                phase: state.roadmap ? state.roadmap[this.phaseIndex] : undefined,
                task: state.roadmap ? state.roadmap[this.phaseIndex]?.tasks[this.taskIndex] : undefined,
                phaseIndex: this.phaseIndex,
                taskIndex: this.taskIndex
            };
        } else {
            // Use current task from state
            currentTask = ProjectStateService.getCurrentTask(state);
        }

        if (!currentTask || !currentTask.phase || !currentTask.task) {
            this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
            return;
        }

        this._panel.title = `📚 ${currentTask.phase.title} - KnowledgeForge`;
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    /**
     * Obtiene el HTML para el webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const state = ProjectStateService.getState(this._context);
        let currentTask;

        if (this.phaseIndex !== undefined && this.taskIndex !== undefined) {
            currentTask = {
                phase: state?.roadmap ? state.roadmap[this.phaseIndex] : undefined,
                task: state?.roadmap ? state.roadmap[this.phaseIndex]?.tasks[this.taskIndex] : undefined,
                phaseIndex: this.phaseIndex,
                taskIndex: this.taskIndex
            };
        } else {
            currentTask = state ? ProjectStateService.getCurrentTask(state) : null;
        }

        const taskTitle = currentTask?.task || 'Sin tarea';
        const phaseTitle = currentTask?.phase?.title || 'Sin fase';

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modo Aprendizaje - KnowledgeForge</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.6;
        }

        .header {
            background: var(--vscode-editor-selectionBackground);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid var(--vscode-focusBorder);
        }

        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }

        .header .task-info {
            font-size: 14px;
            opacity: 0.8;
        }

        .steps-container {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .step {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .step:hover:not(.step-disabled) {
            border-color: var(--vscode-focusBorder);
            transform: translateX(5px);
        }

        .step-disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .step-completed {
            border-left: 4px solid #4caf50;
        }

        .step-active {
            border-left: 4px solid var(--vscode-focusBorder);
            background: var(--vscode-editor-selectionBackground);
        }

        .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .step-title {
            font-size: 16px;
            font-weight: 600;
        }

        .step-status {
            font-size: 20px;
        }

        .step-content {
            display: none;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .step-content.visible {
            display: block;
        }

        .step-timer {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }

        .content-section {
            margin-bottom: 15px;
        }

        .content-section h3 {
            font-size: 14px;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }

        .content-section p, .content-section ul {
            font-size: 13px;
            line-height: 1.5;
        }

        .content-section ul {
            list-style: none;
            padding-left: 0;
        }

        .content-section li {
            padding-left: 20px;
            position: relative;
            margin-bottom: 5px;
        }

        .content-section li:before {
            content: "•";
            position: absolute;
            left: 5px;
            color: var(--vscode-focusBorder);
        }

        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
            margin: 10px 0;
        }

        code {
            font-family: 'Courier New', monospace;
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }

        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }

        button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .chat-container {
            background: var(--vscode-editor-background);
            border: 2px solid var(--vscode-panel-border);
            border-radius: 8px;
            margin-top: 20px;
            position: sticky;
            bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: var(--vscode-editor-selectionBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            border-radius: 8px 8px 0 0;
        }

        .chat-header h2 {
            margin: 0;
            font-size: 16px;
            color: var(--vscode-foreground);
        }

        .chat-toggle {
            background: transparent;
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-foreground);
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .chat-toggle:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .chat-body {
            padding: 20px;
            max-height: 500px;
            overflow-y: auto;
        }

        .chat-body.collapsed {
            display: none;
        }

        .chat-welcome {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-focusBorder);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 13px;
        }

        .chat-welcome p {
            margin: 8px 0;
        }

        .chat-welcome ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .chat-welcome li {
            margin: 5px 0;
        }

        .chat-messages {
            min-height: 200px;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 15px;
            padding: 10px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .chat-messages:empty {
            display: none;
        }

        .chat-message {
            margin-bottom: 15px;
            padding: 12px 15px;
            border-radius: 8px;
            animation: slideIn 0.3s ease;
            position: relative;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .chat-message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 15%;
            text-align: right;
        }

        .chat-message.ai {
            background: var(--vscode-textBlockQuote-background);
            margin-right: 15%;
            border-left: 4px solid var(--vscode-focusBorder);
        }

        .chat-message strong {
            display: block;
            margin-bottom: 5px;
            font-size: 11px;
            opacity: 0.8;
        }

        .chat-input-container {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }

        .chat-input-container textarea {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 2px solid var(--vscode-input-border);
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            resize: vertical;
            min-height: 60px;
            max-height: 150px;
        }

        .chat-input-container textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }

        .chat-input-container button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            min-height: 60px;
        }

        .chat-input-container button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .chat-input-container button:active:not(:disabled) {
            transform: translateY(0);
        }

        .send-icon {
            font-size: 16px;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .loading::after {
            content: '';
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }

        .timer-display {
            display: inline-block;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--vscode-progressBar-background);
            border-radius: 4px;
            margin: 10px 0;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--vscode-focusBorder);
            transition: width 0.3s ease;
        }

        /* Chat typing indicator */
        .typing-indicator {
            opacity: 0.7;
        }

        .typing-dots {
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .typing-dots span {
            width: 8px;
            height: 8px;
            background: var(--vscode-foreground);
            border-radius: 50%;
            display: inline-block;
            animation: typingBounce 1.4s infinite ease-in-out both;
        }

        .typing-dots span:nth-child(1) {
            animation-delay: -0.32s;
        }

        .typing-dots span:nth-child(2) {
            animation-delay: -0.16s;
        }

        @keyframes typingBounce {
            0%, 80%, 100% {
                transform: scale(0);
                opacity: 0.5;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }

        /* Improve input disabled state */
        .chat-input-container input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .chat-input-container button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Modo Aprendizaje</h1>
        <div class="task-info">
            <strong>${phaseTitle}</strong>: ${taskTitle}
        </div>
        <div class="progress-bar">
            <div class="progress-fill" id="progressBar" style="width: 0%"></div>
        </div>
    </div>

    <div class="steps-container">
        ${this._stepNames.map((stepName, index) => `
            <div class="step ${index === 0 ? '' : 'step-disabled'}" id="step-${index}" data-step="${index}">
                <div class="step-header">
                    <div class="step-title">${stepName}</div>
                    <div class="step-status" id="status-${index}">⭕</div>
                </div>
                <div class="step-timer" id="timer-${index}"></div>
                <div class="step-content" id="content-${index}">
                    <div class="loading">Haz clic para cargar el contenido del paso...</div>
                    <div class="button-group">
                        <button onclick="completeStep(${index})">✅ Completar Paso</button>
                        <button class="secondary" onclick="requestHelp(${index})">💡 Necesito Ayuda</button>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="chat-container">
        <div class="chat-header">
            <h2>💬 Tutor AI</h2>
            <button class="chat-toggle" onclick="toggleChat()" id="chatToggle">▼ Minimizar</button>
        </div>
        <div class="chat-body" id="chatBody">
            <div class="chat-welcome" id="chatWelcome">
                <p>👋 ¡Hola! Soy tu tutor personal de IA.</p>
                <p>Puedo ayudarte con:</p>
                <ul>
                    <li>🤔 Explicar conceptos difíciles</li>
                    <li>🐛 Resolver errores en tu código</li>
                    <li>💡 Darte ideas y mejores prácticas</li>
                    <li>📚 Sugerir recursos de aprendizaje</li>
                </ul>
                <p><strong>¿En qué puedo ayudarte?</strong></p>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-container">
                <textarea id="chatInput" placeholder="Escribe tu pregunta aquí... (Presiona Ctrl+Enter para enviar)" rows="3"></textarea>
                <button onclick="sendMessage()" id="chatSendBtn">
                    <span class="send-icon">📤</span> Enviar
                </button>
            </div>
        </div>
    </div>

    <div class="button-group" style="margin-top: 20px;">
        <button onclick="completeTask()">🎉 Completar Tarea</button>
        <button class="secondary" onclick="closePanel()">← Volver al Roadmap</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentStepIndex = 0;
        let completedSteps = [];
        let timers = {};

        // Handle step click
        document.querySelectorAll('.step').forEach(function(step) {
            step.addEventListener('click', function() {
                if (!this.classList.contains('step-disabled')) {
                    const stepNumber = parseInt(this.dataset.step);
                    loadStep(stepNumber);
                }
            });
        });

        function loadStep(stepNumber) {
            currentStepIndex = stepNumber;

            // Update visual states
            document.querySelectorAll('.step').forEach(function(step, index) {
                const content = document.getElementById('content-' + index);
                if (index === stepNumber) {
                    step.classList.add('step-active');
                    if (content) {
                        content.classList.add('visible');
                        // Show loading indicator
                        content.innerHTML = '<div class="loading">⏳ Cargando contenido del paso...</div>';
                    }
                } else {
                    step.classList.remove('step-active');
                    if (content) content.classList.remove('visible');
                }
            });

            // Request content from extension
            vscode.postMessage({ type: 'loadStep', stepNumber: stepNumber });
        }

        function completeStep(stepNumber) {
            if (!completedSteps.includes(stepNumber)) {
                completedSteps.push(stepNumber);

                const step = document.getElementById('step-' + stepNumber);
                const status = document.getElementById('status-' + stepNumber);

                if (step) step.classList.add('step-completed');
                if (status) status.textContent = '✅';

                // Enable next step
                const nextStep = document.getElementById('step-' + (stepNumber + 1));
                if (nextStep) {
                    nextStep.classList.remove('step-disabled');
                }

                updateProgress();
                vscode.postMessage({ type: 'completeStep', stepNumber: stepNumber });
            }
        }

        function updateProgress() {
            const progress = (completedSteps.length / ${this._stepNames.length}) * 100;
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
        }

        function requestHelp(stepNumber) {
            // Show typing indicator in chat when requesting help
            showTypingIndicator();
            isProcessing = true;

            // Disable chat input while processing
            const input = document.getElementById('chatInput');
            const sendButton = document.getElementById('chatSendBtn');
            if (input) input.disabled = true;
            if (sendButton) sendButton.disabled = true;

            vscode.postMessage({ type: 'requestHelp', stepNumber: stepNumber });
        }

        let isProcessing = false;
        let typingIndicator = null;

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const sendButton = document.getElementById('chatSendBtn');
            const message = input.value.trim();

            if (message && !isProcessing) {
                isProcessing = true;

                // Add user message immediately
                addChatMessage('user', message);

                // Clear input immediately for better UX
                input.value = '';

                // Adjust textarea height back to original
                input.style.height = 'auto';

                // Disable input and button while processing
                input.disabled = true;
                if (sendButton) sendButton.disabled = true;

                // Show typing indicator
                showTypingIndicator();

                // Send message to extension
                vscode.postMessage({ type: 'askAI', question: message });
            }
        }

        function showTypingIndicator() {
            const chatMessages = document.getElementById('chatMessages');
            typingIndicator = document.createElement('div');
            typingIndicator.className = 'chat-message ai typing-indicator';
            typingIndicator.innerHTML = '<div class="typing-dots"><span>.</span><span>.</span><span>.</span></div>';
            typingIndicator.id = 'typing-indicator';
            chatMessages.appendChild(typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function hideTypingIndicator() {
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
                typingIndicator = null;
            }
        }

        function addChatMessage(role, message) {
            const chatMessages = document.getElementById('chatMessages');
            const chatWelcome = document.getElementById('chatWelcome');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message ' + role;

            // Hide welcome message on first message
            if (chatWelcome && chatWelcome.style.display !== 'none') {
                chatWelcome.style.display = 'none';
            }

            // Add role label
            const roleLabel = role === 'user' ? 'Tú' : 'Tutor AI';
            const labelHtml = '<strong>' + roleLabel + '</strong>';

            // Handle markdown-style formatting
            let formattedMessage = message
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // Bold
                .replace(/\*(.+?)\*/g, '<em>$1</em>')  // Italic
                .replace(/\`\`\`([\\s\\S]+?)\`\`\`/g, '<pre><code>$1</code></pre>')  // Code blocks
                .replace(/\`(.+?)\`/g, '<code>$1</code>')  // Inline code
                .replace(/\\n/g, '<br>');  // Line breaks

            messageDiv.innerHTML = labelHtml + formattedMessage;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Re-enable input after AI response
            if (role === 'ai') {
                const input = document.getElementById('chatInput');
                const sendButton = document.getElementById('chatSendBtn');
                if (input) {
                    input.disabled = false;
                    input.focus();
                }
                if (sendButton) sendButton.disabled = false;
                isProcessing = false;
            }
        }

        function completeTask() {
            if (completedSteps.length === ${this._stepNames.length}) {
                vscode.postMessage({ type: 'completeTask' });
            } else {
                alert('Debes completar todos los pasos antes de finalizar la tarea.');
            }
        }

        function closePanel() {
            vscode.postMessage({ type: 'closePanel' });
        }

        // Toggle chat visibility
        function toggleChat() {
            const chatBody = document.getElementById('chatBody');
            const chatToggle = document.getElementById('chatToggle');

            if (chatBody.classList.contains('collapsed')) {
                chatBody.classList.remove('collapsed');
                chatToggle.textContent = '▼ Minimizar';
            } else {
                chatBody.classList.add('collapsed');
                chatToggle.textContent = '▲ Expandir';
            }
        }

        // Handle Ctrl+Enter to send message in textarea
        document.getElementById('chatInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Handle messages from extension
        window.addEventListener('message', function(event) {
            const message = event.data;

            try {
                switch (message.type) {
                    case 'stepLoaded':
                        displayStepContent(message.stepNumber, message.content);
                        break;
                    case 'stepCompleted':
                        completeStep(message.stepNumber);
                        break;
                    case 'chatResponse':
                        hideTypingIndicator();
                        addChatMessage('ai', message.response);
                        break;
                    case 'error':
                        hideTypingIndicator();
                        displayError(message.message);
                        // Re-enable input on error
                        const input = document.getElementById('chatInput');
                        const sendButton = document.getElementById('chatSendBtn');
                        if (input) {
                            input.disabled = false;
                            input.focus();
                        }
                        if (sendButton) sendButton.disabled = false;
                        isProcessing = false;
                        break;
                    case 'taskInfo':
                        console.log('Task info:', message.info);
                        break;
                    case 'loadingStep':
                        showLoading();
                        break;
                    case 'status':
                        console.log('Status:', message.message);
                        break;
                }
            } catch (error) {
                console.error('Error handling message:', error);
                vscode.postMessage({ type: 'webviewError', stepNumber: currentStepIndex, error: error.toString() });
            }
        });

        function displayStepContent(stepNumber, content) {
            const contentDiv = document.getElementById('content-' + stepNumber);
            if (!contentDiv) return;

            let html = '';

            if (typeof content === 'string') {
                html = '<div class="content-section"><p>' + content + '</p></div>';
            } else if (typeof content === 'object') {
                for (const [key, value] of Object.entries(content)) {
                    html += '<div class="content-section">';
                    html += '<h3>' + formatKey(key) + '</h3>';
                    html += formatValue(value);
                    html += '</div>';
                }
            }

            html += '<div class="button-group">';
            html += '<button onclick="completeStep(' + stepNumber + ')">✅ Completar Paso</button>';
            html += '<button class="secondary" onclick="requestHelp(' + stepNumber + ')">💡 Necesito Ayuda</button>';
            html += '</div>';

            contentDiv.innerHTML = html;
            contentDiv.classList.add('visible');
        }

        function formatKey(key) {
            return key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) { return str.toUpperCase(); });
        }

        function formatValue(value) {
            if (typeof value === 'string') {
                // Check if it looks like code
                if (value.includes('function') || value.includes('const ') || value.includes('{')) {
                    return '<pre><code>' + escapeHtml(value) + '</code></pre>';
                }
                return '<p>' + value + '</p>';
            } else if (Array.isArray(value)) {
                return '<ul>' + value.map(function(item) { return '<li>' + formatValue(item) + '</li>'; }).join('') + '</ul>';
            } else if (typeof value === 'object') {
                let html = '';
                for (const [k, v] of Object.entries(value)) {
                    html += '<strong>' + formatKey(k) + ':</strong> ' + formatValue(v) + '<br>';
                }
                return html;
            }
            return String(value);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function displayError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            document.body.insertBefore(errorDiv, document.body.firstChild);

            setTimeout(function() { errorDiv.remove(); }, 5000);
        }

        function showLoading() {
            const content = document.getElementById('content-' + currentStepIndex);
            if (content) {
                content.innerHTML = '<div class="loading">⏳ Cargando contenido...</div>';
            }
        }

        // Load first step automatically
        setTimeout(function() { loadStep(0); }, 500);
    </script>
</body>
</html>
        `;

        return html;
    }

    public dispose() {
        TaskLearningPanel.currentPanel = undefined;

        // Limpieza de disposables
        this._disposables.forEach((disposable) => disposable.dispose());
        this._disposables = [];
    }

    private async _handleCompleteStep(stepNumber: number) {
        console.log('[TaskLearningPanel] _handleCompleteStep:', stepNumber);
        
        // End the micro-lesson timer
        if (this._learningState.sessionId && this._learningState.lessons) {
            MicroLearningService.endLesson(this._context, this._learningState.sessionId, stepNumber);
        }
        
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
            // Immediate validation
            if (!question || question.trim().length === 0) {
                throw new Error('La pregunta no puede estar vacía');
            }

            const state = ProjectStateService.getState(this._context);
            if (!state) {
                throw new Error('No hay estado de proyecto disponible');
            }

            const currentTask = ProjectStateService.getCurrentTask(state);
            if (!currentTask) {
                throw new Error('No hay tarea actual');
            }

            const apiKey = await ConfigService.getApiKey(this._context);
            if (!apiKey) {
                throw new Error('No hay API key configurada');
            }

            // Create AI service and generate response with timeout
            const aiService = AIServiceFactory.createService(apiKey);

            // Simplified prompt for faster responses
            const prompt = `Eres un mentor experto en programación. Un estudiante trabajando en "${currentTask.task}" pregunta:

"${question}"

Responde de forma clara y concisa (máximo 200 palabras) con:
- Respuesta directa
- Ejemplo práctico si aplica
- Un consejo clave

Usa Markdown. Sé educativo y amigable.`;

            // Set timeout for AI response (30 seconds)
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('La respuesta está tomando demasiado tiempo. Por favor, intenta de nuevo.')), 30000)
            );

            const responsePromise = aiService.generateContent(prompt);
            const response = await Promise.race([responsePromise, timeoutPromise]);

            this._panel.webview.postMessage({
                type: 'chatResponse',
                response: response
            });
        } catch (error) {
            console.error('[TaskLearningPanel] Error in _handleAskAI:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Send error to webview to hide typing indicator
            this._panel.webview.postMessage({
                type: 'chatResponse',
                response: `❌ **Error**: ${errorMessage}\n\nPor favor, intenta de nuevo o reformula tu pregunta.`
            });
        }
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
        console.log('[TaskLearningPanel] _handleLoadStep:', stepNumber);
        
        // Start the micro-lesson timer
        if (this._learningState.sessionId && this._learningState.lessons) {
            MicroLearningService.startLesson(this._context, this._learningState.sessionId, stepNumber);
        }
        
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

        // Send task information to webview
        this._panel.webview.postMessage({
            type: 'taskInfo',
            info: `${currentTask.phase.title}: ${currentTask.task}`
        });

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

            // Save content to file
            const stepName = this._stepNames[stepNumber];
            await this._saveStepContentToFile(stepNumber, stepName, stepContent, currentTask);

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

            // Get existing content to provide context for expansion
            const existingContent = this._learningState.cachedSteps[stepNumber] || {};
            
            // Build a prompt asking to expand the existing step content
            const prompt = `Eres un educador experto. Expande y enriquece el contenido del paso ${stepNumber + 1} ("${this._stepNames[stepNumber]}") para la tarea "${currentTask.task}".

El contenido actual es:
${JSON.stringify(existingContent, null, 2)}

**Objetivo**: Proporcionar contenido educativo MÁS PROFUNDO y DETALLADO que complemente (NO reemplace) el contenido existente.

Por favor, añade:
1. **Más ejemplos prácticos**: Al menos 2-3 ejemplos de código adicionales con diferentes casos de uso
2. **Recursos adicionales**: Enlaces a documentación oficial, tutoriales recomendados, artículos relevantes
3. **Explicaciones más profundas**: Detalles sobre el "por qué" y "cómo funciona internamente"
4. **Mejores prácticas**: Patrones recomendados y antipatrones a evitar
5. **Ejercicios opcionales**: Desafíos adicionales para practicar
6. **Casos de uso reales**: Ejemplos de aplicación en proyectos del mundo real

Responde SOLO con JSON válido manteniendo la estructura:
{
  "concepto": "...",
  "objetivos": [...],
  "contenido": "...",
  "ejemplos": [...],
  "ejemplosAvanzados": [...],  // NUEVO
  "recursos": [...],
  "recursosAdicionales": [...],  // NUEVO
  "desafios": [...],
  "mejoresPracticas": [...],  // NUEVO
  "casosDeUso": [...],  // NUEVO
  "codigoEjemplo": "..."
}`;

            this._panel.webview.postMessage({ type: 'status', message: 'Generando contenido adicional...' });

            const response = await aiService.generateContent(prompt);
            const parsed = this._parseStepResponse(response, stepNumber, 'Contenido adicional');

            // Merge the new content with existing content
            const merged = this._mergeStepContent(existingContent, parsed);
            this._learningState.cachedSteps[stepNumber] = merged;

            // Save to intelligent cache
            const cacheKey = IntelligentCacheService.generateKey(
                'step-content',
                currentTask.phase.title,
                currentTask.task,
                stepNumber.toString()
            );
            await IntelligentCacheService.set(cacheKey, merged);

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

        const prompt = this._buildStepPrompt(
            stepNumber,
            currentTask,
            progress,
            this._stepNames
        );

        const response = await aiService.generateContent(prompt);
        return this._parseStepResponse(response, stepNumber, 'Contenido del paso');
    }

    /**
     * Parsea la respuesta del AI para un paso específico
     */
    private _parseStepResponse(response: string, stepNumber: number, responseType: string): any {
        try {
            // Try to parse directly first
            return JSON.parse(response);
        } catch (err: any) {
            // If direct parse fails, try to extract JSON from response
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (innerErr) {
                console.error(`Error parsing JSON from response for step ${stepNumber}:`, innerErr);
            }

            // If all parsing attempts fail, return a structured object with the raw response
            console.error(`Error parsing ${responseType} for step ${stepNumber}:`, err);
            console.log('Raw response:', response);

            this._panel.webview.postMessage({
                type: 'error',
                message: `Error al parsear ${responseType}. Usando contenido de respaldo.`
            });

            // Return a fallback structured response
            return {
                concepto: `Contenido del paso ${stepNumber + 1}`,
                contenido: response,
                objetivos: ['Completar este paso del proceso de aprendizaje'],
                ejemplos: [],
                recursos: [],
                desafios: []
            };
        }
    }

    /**
     * Combina el contenido existente de un paso con el nuevo contenido generado
     */
    private _mergeStepContent(existingContent: any, newContent: any): any {
        if (typeof existingContent === 'string' && typeof newContent === 'string') {
            return existingContent + newContent;
        } else if (Array.isArray(existingContent) && Array.isArray(newContent)) {
            return existingContent.concat(newContent);
        } else if (typeof existingContent === 'object' && typeof newContent === 'object') {
            return { ...existingContent, ...newContent };
        } else {
            console.error('Incompatible types for merging step content:', existingContent, newContent);
            this._panel.webview.postMessage({
                type: 'error',
                message: 'Error al combinar contenido del paso'
            });
            return null;
        }
    }

    /**
     * Construye el prompt para la generación de contenido de un paso específico
     */
    private _buildStepPrompt(
        stepNumber: number,
        currentTask: any,
        progress: any,
        stepNames: string[]
    ): string {
        const stepName = stepNames[stepNumber];
        const progressInfo = `Progreso del proyecto: ${progress.completed}/${progress.total} tareas (${progress.percentage}%)`;

        return `Eres un tutor experto en programación. El estudiante está trabajando en el paso ${stepNumber + 1}
("${stepName}") de la tarea: "${currentTask.task}" dentro de la fase "${currentTask.phase.title}".

${progressInfo}

Por favor, proporciona contenido educativo DETALLADO para este paso en formato JSON. El JSON debe tener esta estructura:
{
  "concepto": "Explicación clara del concepto principal",
  "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"],
  "contenido": "Contenido detallado con explicaciones profundas",
  "ejemplos": ["Ejemplo práctico 1", "Ejemplo práctico 2"],
  "recursos": ["Recurso 1", "Recurso 2"],
  "desafios": ["Posible dificultad 1", "Posible dificultad 2"],
  "codigoEjemplo": "// Código de ejemplo si aplica"
}

Sé específico sobre conceptos clave, posibles dificultades y cómo superarlas. Si es apropiado, incluye ejemplos de código completos y funcionales. Tu respuesta debe ser útil, amigable y educativa. RESPONDE SOLO CON EL JSON, sin texto adicional antes o después.`;
    }

    /**
     * Guarda el contenido de un paso en un archivo
     */
    private async _saveStepContentToFile(
        stepNumber: number,
        stepName: string,
        stepContent: any,
        currentTask: any
    ) {
        const taskDir = path.join(this._context.globalStoragePath, 'tasks', currentTask.phase.title, currentTask.task);
        if (!fs.existsSync(taskDir)) {
            fs.mkdirSync(taskDir, { recursive: true });
        }

        const filePath = path.join(taskDir, `${stepNumber}-${stepName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(stepContent, null, 2), 'utf8');
    }

    /**
     * Maneja la solicitud de un consejo educativo
     */
    private async _handleRequestHint(message: any) {
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

            // Create a prompt for the AI tutor to provide a hint
            const basePrompt = this._buildStepPrompt(
                message.stepNumber,
                currentTask,
                ProjectStateService.getProgress(state),
                this._stepNames
            );

            const prompt = `${basePrompt}

**IMPORTANTE**: El estudiante ha solicitado un CONSEJO o PISTA para este paso.

Por favor, proporciona:
1. **Pista Conceptual**: Una dirección general sobre qué pensar o considerar (sin dar la solución completa)
2. **Pregunta Guiada**: Hazle preguntas al estudiante que lo ayuden a descubrir la solución por sí mismo
3. **Recurso Relevante**: Sugiérele dónde puede investigar más sobre este tema
4. **Mini-Ejemplo**: Un ejemplo muy simple que ilustre el concepto básico

NO des la solución completa. El objetivo es guiar al estudiante para que aprenda por sí mismo.
Responde en Markdown con formato claro.`;

            const response = await aiService.generateContent(prompt);

            // Send the response to the webview chat
            this._panel.webview.postMessage({
                type: 'chatResponse',
                response: `**Consejo para ${this._stepNames[message.stepNumber]}**\n\n${response}`
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error al obtener consejo: ${errorMessage}`
            });
        }
    }

    /**
     * Handle request for next level hint
     */
    private async _handleNextLevelHint(message: any) {
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

            // Create a prompt for the AI tutor to provide a next level hint
            const basePrompt = this._buildStepPrompt(
                message.stepNumber,
                currentTask,
                ProjectStateService.getProgress(state),
                this._stepNames
            );

            const prompt = `${basePrompt}

**IMPORTANTE**: El estudiante ha solicitado una PISTA DE NIVEL SUPERIOR (más detallada).

Por favor, proporciona:
1. **Explicación Más Detallada**: Profundiza en el concepto específico de este paso
2. **Ejemplo Parcial de Código**: Muestra un fragmento de código que ilustre la dirección correcta (NO la solución completa)
3. **Pasos Específicos**: Una lista de mini-pasos que el estudiante puede seguir
4. **Errores Comunes**: Advierte sobre los errores más frecuentes en este paso
5. **Recursos Avanzados**: Enlaces a documentación más técnica o artículos relevantes

Puedes dar más información que en una pista básica, pero aún NO des la solución completa.
Responde en Markdown con formato claro y secciones bien definidas.`;

            const response = await aiService.generateContent(prompt);

            // Send the response to the webview chat
            this._panel.webview.postMessage({
                type: 'chatResponse',
                response: `**Consejo de nivel superior para ${this._stepNames[message.stepNumber]}**\n\n${response}`
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error al obtener consejo de nivel superior: ${errorMessage}`
            });
        }
    }

    /**
     * Handle request for next task
     */
    private async _handleNextTask() {
        // Close current panel and open next task
        this.dispose();
        await vscode.commands.executeCommand('knowledgeforge.openLearningMode');
    }

    /**
     * Handle request for help from the tutor
     */
    private async _handleRequestHelp(stepNumber: number) {
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

            // Create a prompt for the AI tutor to provide help proactively
            const basePrompt = this._buildStepPrompt(
                stepNumber,
                currentTask,
                ProjectStateService.getProgress(state),
                this._stepNames
            );

            const prompt = `${basePrompt}

**CONTEXTO**: El estudiante acaba de comenzar este paso. Como tutor proactivo, ofrece ayuda inicial.

Por favor, proporciona un mensaje de bienvenida amigable que incluya:
1. **Introducción al Paso**: Una breve descripción de qué aprenderá en este paso (1-2 oraciones)
2. **Pregunta de Verificación**: Pregunta si el estudiante tiene alguna duda o necesita aclaración antes de comenzar
3. **Sugerencia Inicial**: Un consejo útil para abordar este paso de manera efectiva
4. **Motivación**: Una nota motivacional sobre por qué este paso es importante

Sé breve (máximo 4-5 oraciones), amigable y motivador. Usa Markdown con emojis apropiados.`;

            const response = await aiService.generateContent(prompt);

            // Send the response to the webview chat
            this._panel.webview.postMessage({
                type: 'chatResponse',
                response: `**Ayuda con ${this._stepNames[stepNumber]}**\n\n${response}`
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error al obtener ayuda: ${errorMessage}`
            });
        }
    }
}