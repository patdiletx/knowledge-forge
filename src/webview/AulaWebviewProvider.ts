import * as vscode from 'vscode';
import * as path from 'path';
import { RoadmapService } from '../services/RoadmapService';
import { ProjectGeneratorService } from '../services/ProjectGeneratorService';
import { ProjectStateService } from '../services/ProjectStateService';
import { ConfigService } from '../services/ConfigService';
import { AIServiceFactory } from '../services/AIServiceFactory';

export class AulaWebviewProvider {
    public static currentPanel: AulaWebviewProvider | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (AulaWebviewProvider.currentPanel) {
            AulaWebviewProvider.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'knowledgeForgeAula',
            'KnowledgeForge - Aula del Conocimiento',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        AulaWebviewProvider.currentPanel = new AulaWebviewProvider(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'analyzeCv':
                        await this._handleAnalyzeCv(message.cvText);
                        break;
                    case 'liveAnalyzeCv':
                        await this._handleLiveAnalyzeCv(message.cvText);
                        break;
                    case 'initializeProject':
                        await this._handleInitializeProject(message);
                        break;
                    case 'generateProject':
                        try {
                            // Validar que tenemos un roadmap válido
                            if (!message.roadmap) {
                                throw new Error('No se recibió un roadmap válido');
                            }

                            // Crear carpeta para el proyecto
                            const projectName = message.roadmap.title || 'knowledge-forge-project';
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            
                            if (!workspaceFolders || workspaceFolders.length === 0) {
                                throw new Error('No hay workspace abierto');
                            }
                            
                            const projectPath = path.join(workspaceFolders[0].uri.fsPath, projectName);
                            
                            // Verificar si el directorio ya existe
                            try {
                                await vscode.workspace.fs.stat(vscode.Uri.file(projectPath));
                                throw new Error(`Ya existe un proyecto con el nombre "${projectName}" en esta ubicación`);
                            } catch (e) {
                                // Si el error es porque no existe, continuar
                                if ((e as any).code !== 'FileNotFound') {
                                    throw e;
                                }
                            }
                            
                            // Generar estructura del proyecto
                            await ProjectGeneratorService.generateProjectStructure(message.roadmap, projectPath);
                            
                            // Guardar estado del proyecto
                            const state = ProjectStateService.initializeNewState(message.roadmap, projectPath);
                            await ProjectStateService.saveState(this._context, state);
                            
                            // Abrir la carpeta del proyecto
                            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
                            
                            // Cerrar panel
                            this._panel.dispose();
                        } catch (error) {
                            // Registrar el error en consola para debugging
                            console.error('Error generando proyecto:', error);
                            
                            // Enviar mensaje de error al webview
                            this._panel.webview.postMessage({
                                type: 'error',
                                message: `Error generando proyecto: ${error instanceof Error ? error.message : String(error)}`
                            });
                        }
                        break;
                    case 'analyzeText':
                        try {
                            // Verificar que tenemos una API key
                            const hasApiKey = await ConfigService.hasApiKey(this._context);
                            if (!hasApiKey) {
                                this._panel.webview.postMessage({
                                    type: 'error',
                                    message: 'No se encontró una API Key válida. Por favor, configura tu API Key en la configuración de la extensión.'
                                });
                                return;
                            }

                            // Obtener la API key
                            const apiKey = await ConfigService.getApiKey(this._context);
                            
                            // Analizar texto con IA
                            const analysis = await RoadmapService.analyzeExperience(message.text, apiKey!);
                            
                            // Enviar respuesta al webview
                            this._panel.webview.postMessage({
                                type: 'analysisResult',
                                isLive: true,
                                data: analysis
                            });
                        } catch (error) {
                            this._panel.webview.postMessage({
                                type: 'error',
                                message: `Error analizando texto: ${error}`
                            });
                        }
                        break;
                        
                    case 'generateRoadmap':
                        try {
                            // Verificar que tenemos una API key
                            const hasApiKey = await ConfigService.hasApiKey(this._context);
                            if (!hasApiKey) {
                                this._panel.webview.postMessage({
                                    type: 'error',
                                    message: 'No se encontró una API Key válida. Por favor, configura tu API Key en la configuración de la extensión.'
                                });
                                return;
                            }

                            // Enviar mensaje de inicio de generación
                            this._panel.webview.postMessage({
                                type: 'generatingRoadmap',
                                message: 'Analizando tu experiencia y generando roadmap personalizado...'
                            });

                            // Obtener la API key
                            const apiKey = await ConfigService.getApiKey(this._context);

                            // Actualizar progreso
                            this._panel.webview.postMessage({
                                type: 'generatingProgress',
                                message: 'Consultando con IA para crear el mejor plan de aprendizaje...'
                            });

                            // Generar roadmap con IA
                            const roadmap = await RoadmapService.generateRoadmap(message.text, apiKey!);

                            // Actualizar progreso final
                            this._panel.webview.postMessage({
                                type: 'generatingProgress',
                                message: 'Finalizando y estructurando tu roadmap personalizado...'
                            });

                            // Enviar respuesta al webview (coincide con el handler en el webview)
                            this._panel.webview.postMessage({
                                type: 'roadmapGenerated',
                                roadmap: roadmap
                            });
                        } catch (error) {
                            this._panel.webview.postMessage({
                                type: 'error',
                                message: `Error generando roadmap: ${error}`
                            });
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleLiveAnalyzeCv(cvText: string) {
        if (!cvText || cvText.length < 50) return; // No analizar textos muy cortos

        try {
            // Verificar que tenemos una API key
            const hasApiKey = await ConfigService.hasApiKey(this._context);
            if (!hasApiKey) {
                this._panel.webview.postMessage({
                    type: 'error',
                    message: 'No se encontró una API Key válida. Por favor, configura tu API Key en la configuración de la extensión.'
                });
                return;
            }

            // Obtener la API key
            const apiKey = await ConfigService.getApiKey(this._context);
            if (!apiKey) return;

            const aiService = AIServiceFactory.createService(apiKey);
            const prompt = `Eres un asistente de análisis de perfiles. Analiza el siguiente texto de un desarrollador y extrae en formato JSON sus habilidades (skills), sus objetivos (goals) y posibles carencias (gaps). Sé breve y directo.

Texto: "${cvText}"

Formato JSON: { "skills": ["..."], "goals": ["..."], "gaps": ["..."] }`;

            const response = await aiService.generateContent(prompt);
            
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const analysis = JSON.parse(jsonMatch[0]);
                    
                    // Send analysis results to webview
                    this._panel.webview.postMessage({
                        type: 'liveAnalysisResult',
                        analysis: analysis
                    });
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    console.error('Failed JSON:', jsonMatch[0]);
                }
            }
        } catch (error) {
            // Silencioso para no molestar al usuario
            console.error('Error en análisis en vivo:', error);
        }
    }

    private async _handleAnalyzeCv(cvText: string) {
        try {
            // Verificar que tenemos una API key
            const hasApiKey = await ConfigService.hasApiKey(this._context);
            if (!hasApiKey) {
                this._panel.webview.postMessage({
                    type: 'error',
                    message: 'No se encontró una API Key válida. Por favor, configura tu API Key en la configuración de la extensión.'
                });
                return;
            }

            // Obtener la API key
            const apiKey = await ConfigService.getApiKey(this._context);
            const roadmap = await RoadmapService.generateRoadmap(cvText, apiKey!);

            this._panel.webview.postMessage({
                type: 'roadmapGenerated',
                roadmap: roadmap
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error al analizar CV: ${error}`);
            this._panel.webview.postMessage({ type: 'error', message: String(error) });
        }
    }

    private async _handleInitializeProject(message: { roadmap: any }) {
        try {
            // Pedir al usuario la carpeta destino donde crear el proyecto
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Seleccionar carpeta destino para crear el proyecto'
            });

            if (!folderUri || folderUri.length === 0) {
                this._panel.webview.postMessage({ type: 'error', message: 'No se seleccionó carpeta destino' });
                return;
            }

            const targetPath = folderUri[0].fsPath;

            // Generar la estructura del proyecto en la carpeta seleccionada
            await ProjectGeneratorService.generateProjectStructure(message.roadmap, targetPath);

            // Inicializar y guardar el estado del proyecto
            const state = await ProjectStateService.initializeProject(this._context, message.roadmap, targetPath);

            // Notificar al usuario y abrir la carpeta en el workspace
            vscode.window.showInformationMessage('Roadmap y estructura de proyecto generados con éxito');
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath));
        } catch (error) {
            vscode.window.showErrorMessage(`Error al inicializar el proyecto: ${error}`);
            this._panel.webview.postMessage({ type: 'error', message: String(error) });
        }
    }

    public dispose() {
        AulaWebviewProvider.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'KnowledgeForge - Aula';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = this._getNonce();
        
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KnowledgeForge - Aula</title>
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
            margin-bottom: 30px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
        }
        h1 {
            color: var(--vscode-foreground);
            margin-bottom: 10px;
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        .input-container {
            margin-bottom: 30px;
        }
        textarea {
            width: 100%;
            height: 300px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            resize: vertical;
            font-family: var(--vscode-font-family);
            font-size: 14px;
            line-height: 1.5;
        }
        textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .analysis-results {
            margin-top: 30px;
            padding: 20px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            display: none;
        }
        .analysis-item {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 4px;
            background-color: var(--vscode-editor-background);
        }
        .analysis-item.skill {
            border-left: 4px solid var(--vscode-terminal-ansiGreen);
        }
        .analysis-item.gap {
            border-left: 4px solid var(--vscode-errorForeground);
        }
        .analysis-item.suggestion {
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            display: none;
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 20px;
            text-align: center;
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            margin: 20px 0;
            display: none;
        }
        .live-analysis {
            margin-top: 15px;
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            min-height: 50px;
        }
        .live-analysis-item {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 3px;
        }
        .live-analysis-item.skill {
            background-color: rgba(45, 150, 45, 0.2);
            border-left: 3px solid var(--vscode-terminal-ansiGreen);
        }
        .live-analysis-item.gap {
            background-color: rgba(200, 60, 60, 0.2);
            border-left: 3px solid var(--vscode-errorForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎓 Bienvenido a KnowledgeForge</h1>
        <p class="subtitle">Pega tu CV o describe tu experiencia para generar un roadmap personalizado</p>
    </div>

    <div class="input-container">
        <textarea id="experience-input" placeholder="Pega aquí tu CV, LinkedIn o una descripción de tu experiencia técnica...&#10;&#10;Ejemplo:&#10;Soy desarrollador junior con 1 año de experiencia en JavaScript y React. He trabajado en proyectos pequeños de frontend pero quiero especializarme en backend con Node.js y bases de datos. Tengo conocimientos básicos de HTML, CSS y Git."></textarea>
        
        <div class="live-analysis" id="live-analysis">
            <p><em>El análisis en vivo aparecerá aquí mientras escribes...</em></p>
        </div>
        
        <div class="buttons">
            <button id="analyze-btn">Analizar Experiencia</button>
            <button id="generate-btn" disabled>Generar Roadmap</button>
        </div>
    </div>

    <div id="loading" class="loading">
        <p>Analizando tu experiencia con IA...</p>
    </div>

    <div id="error" class="error">
        <p id="error-message"></p>
    </div>

    <div id="analysis-results" class="analysis-results">
        <h2>📊 Análisis de tu Perfil</h2>
        <div id="analysis-content"></div>
        <div class="buttons">
            <button id="confirm-generate-btn">Generar Roadmap Personalizado</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // DOM Elements
        const experienceInput = document.getElementById('experience-input');
        const analyzeBtn = document.getElementById('analyze-btn');
        const generateBtn = document.getElementById('generate-btn');
        const confirmGenerateBtn = document.getElementById('confirm-generate-btn');
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        const errorMessageElement = document.getElementById('error-message');
        const analysisResults = document.getElementById('analysis-results');
        const analysisContent = document.getElementById('analysis-content');
        const liveAnalysis = document.getElementById('live-analysis');
        
        // State
        let analysisData = null;
        let debounceTimer = null;
        
        // Event listeners
        experienceInput.addEventListener('input', handleTextChange);
    analyzeBtn.addEventListener('click', analyzeExperience);
    generateBtn.addEventListener('click', generateRoadmap);
    confirmGenerateBtn.addEventListener('click', initializeProjectFromRoadmap);
        
        // Handle text change with debouncing for live analysis
        function handleTextChange() {
            const text = experienceInput.value.trim();
            
            // Enable/disable buttons
            analyzeBtn.disabled = text.length === 0;
            
            // Clear previous timer
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            // Set new timer for live analysis
            if (text.length > 20) {
                debounceTimer = setTimeout(() => {
                    performLiveAnalysis(text);
                }, 500);
            } else {
                // Show placeholder when text is too short
                liveAnalysis.innerHTML = '<p><em>El análisis en vivo aparecerá aquí mientras escribes...</em></p>';
            }
        }
        
        // Perform live analysis
        function performLiveAnalysis(text) {
            // Send message to extension for live analysis
            vscode.postMessage({
                type: 'liveAnalyzeCv',
                cvText: text
            });
        }
        
        // Analyze experience
        function analyzeExperience() {
            const text = experienceInput.value.trim();
            if (!text) return;
            
            showLoading();
            
            // Send message to extension
            vscode.postMessage({
                type: 'analyzeCv',
                cvText: text
            });
        }
        
        // Generate roadmap (ask extension to create a roadmap based on the text)
        function generateRoadmap() {
            const text = experienceInput.value.trim();
            if (!text) return;

            showLoading();

            // Send message to extension to generate a roadmap
            vscode.postMessage({
                type: 'generateRoadmap',
                text: text
            });
        }

        // Initialize project from the generated roadmap (sends the roadmap object to the extension)
        function initializeProjectFromRoadmap() {
            if (!analysisData) {
                showError('No hay roadmap generado para inicializar');
                return;
            }

            // Send message to extension to initialize the project using the generated roadmap
            vscode.postMessage({
                type: 'initializeProject',
                roadmap: analysisData
            });
        }
        
        // Show loading indicator
        function showLoading() {
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';
            analysisResults.style.display = 'none';
        }

        // Show generating progress with custom message
        function showGeneratingProgress(message) {
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';
            analysisResults.style.display = 'none';

            // Update loading message
            const loadingText = loadingElement.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }

        // Update generating progress message
        function updateGeneratingProgress(message) {
            const loadingText = loadingElement.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }

        // Show error message
        function showError(message) {
            loadingElement.style.display = 'none';
            errorElement.style.display = 'block';
            errorMessageElement.textContent = message;
        }
        
        // Show analysis results
        function showAnalysisResults(data) {
            loadingElement.style.display = 'none';
            errorElement.style.display = 'none';
            analysisResults.style.display = 'block';
            
            // Render analysis content
            let content = '';
            
            // Skills section
            if (data.skills && data.skills.length > 0) {
                content += '<h3>✅ Habilidades Detectadas</h3>';
                data.skills.forEach(skill => {
                    content += '<div class="analysis-item skill">' +
                        '<strong>' + skill.name + '</strong>' +
                        '<p>' + skill.description + '</p>' +
                        '<small>Nivel: ' + skill.level + '</small>' +
                    '</div>';
                });
            }
            
            // Gaps section
            if (data.gaps && data.gaps.length > 0) {
                content += '<h3>⚠️ Lagunas de Conocimiento</h3>';
                data.gaps.forEach(gap => {
                    content += '<div class="analysis-item gap">' +
                        '<strong>' + gap.name + '</strong>' +
                        '<p>' + gap.description + '</p>' +
                        '<small>Importancia: ' + gap.importance + '</small>' +
                    '</div>';
                });
            }
            
            // Suggestions section
            if (data.suggestions && data.suggestions.length > 0) {
                content += '<h3>💡 Sugerencias de Enfoque</h3>';
                data.suggestions.forEach(suggestion => {
                    content += '<div class="analysis-item suggestion">' +
                        '<strong>' + suggestion.title + '</strong>' +
                        '<p>' + suggestion.description + '</p>' +
                    '</div>';
                });
            }
            
            analysisContent.innerHTML = content;
            generateBtn.disabled = false;
        }
        
        // Update live analysis display
        function updateLiveAnalysis(data) {
            if (!data || (!data.skills && !data.gaps)) {
                liveAnalysis.innerHTML = '<p><em>El análisis en vivo aparecerá aquí mientras escribes...</em></p>';
                return;
            }
            
            let content = '<h4>Análisis en Vivo:</h4>';
            
            // Skills
            if (data.skills && data.skills.length > 0) {
                data.skills.slice(0, 3).forEach(skill => {
                    content += '<div class="live-analysis-item skill">' +
                        '<strong>' + skill.name + '</strong> - ' + skill.level +
                    '</div>';
                });
            }
            
            // Gaps
            if (data.gaps && data.gaps.length > 0) {
                data.gaps.slice(0, 3).forEach(gap => {
                    content += '<div class="live-analysis-item gap">' +
                        '<strong>' + gap.name + '</strong>' +
                    '</div>';
                });
            }
            
            if (content === '<h4>Análisis en Vivo:</h4>') {
                content = '<p><em>Analizando texto...</em></p>';
            }
            
            liveAnalysis.innerHTML = content;
        }
        
        // Handle messages from extension
        window.addEventListener('message', function(event) {
            const message = event.data;

            switch(message.type) {
                case 'liveAnalysisResult':
                    updateLiveAnalysis(message.analysis);
                    break;

                case 'generatingRoadmap':
                    showGeneratingProgress(message.message);
                    break;

                case 'generatingProgress':
                    updateGeneratingProgress(message.message);
                    break;

                case 'roadmapGenerated':
                    analysisData = message.roadmap;
                    showAnalysisResults(message.roadmap);
                    break;

                case 'error':
                    showError(message.message);
                    break;
            }
        });
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
}