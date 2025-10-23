import * as vscode from 'vscode';
import { ProjectStateService } from '../services/ProjectStateService';

export class ProjectStatusWebview {
    public static currentPanel: ProjectStatusWebview | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ProjectStatusWebview.currentPanel) {
            ProjectStatusWebview.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'knowledgeForgeProjectStatus',
            'Estado del Proyecto - KnowledgeForge',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        ProjectStatusWebview.currentPanel = new ProjectStatusWebview(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, []);
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Estado del Proyecto';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const state = ProjectStateService.getState(this._context);

        if (!state) {
            return `<body><h1>No hay un proyecto de KnowledgeForge activo.</h1></body>`;
        }

        const progress = ProjectStateService.getProgress(state);
        const totalXp = state.totalXp || 0;
        const unlockedBadges = state.unlockedBadges || [];

        // Aquí podrías tener una lista de todos los badges posibles
        const allBadges = {
            'phase_1_complete': { title: 'Fundamentos Sólidos', icon: '🧱', description: 'Completaste la fase de fundamentos.' },
            'phase_2_complete': { title: 'Constructor de Lógica', icon: '🏗️', description: 'Completaste la fase de backend/lógica.' },
            'project_complete': { title: 'Maestro Forjador', icon: '🏆', description: '¡Completaste todo el roadmap!' }
        };

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estado del Proyecto</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .progress-circle {
            width: 150px; height: 150px; border-radius: 50%;
            background: conic-gradient(var(--vscode-activityBarBadge-background) ${progress.percentage * 3.6}deg, var(--vscode-editor-inactiveSelectionBackground) 0deg);
            display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
        }
        .progress-text { font-size: 2.5em; font-weight: bold; }
        .stats { display: flex; justify-content: space-around; text-align: center; margin-bottom: 40px; }
        .stat h3 { font-size: 2em; margin-bottom: 5px; color: var(--vscode-activityBarBadge-background); }
        .badges-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 20px; }
        .badge {
            background: var(--vscode-editor-inactiveSelectionBackground); padding: 20px; border-radius: 8px; text-align: center; border: 1px solid var(--vscode-panel-border);
        }
        .badge.locked { opacity: 0.4; }
        .badge-icon { font-size: 3em; margin-bottom: 10px; }
        .badge-title { font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tu Progreso en KnowledgeForge</h1>
            <div class="progress-circle">
                <span class="progress-text">${progress.percentage}%</span>
            </div>
        </div>

        <div class="stats">
            <div class="stat">
                <h3>${progress.completed}/${progress.total}</h3>
                <p>Tareas Completadas</p>
            </div>
            <div class="stat">
                <h3>${totalXp}</h3>
                <p>Puntos de Experiencia (XP)</p>
            </div>
        </div>

        <h2>🏆 Logros Desbloqueados</h2>
        <div class="badges-grid">
            ${Object.entries(allBadges).map(([key, badge]) => `
                <div class="badge ${unlockedBadges.includes(key) ? 'unlocked' : 'locked'}" title="${badge.description}">
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-title">${badge.title}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
    }

    public dispose() {
        ProjectStatusWebview.currentPanel = undefined;
        this._panel.dispose();
    }
}
