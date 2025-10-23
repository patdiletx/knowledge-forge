import * as vscode from 'vscode';
import { ProjectStateService } from '../services/ProjectStateService';
import { BadgesService } from '../services/BadgesService';
import { UserStatsService } from '../services/UserStatsService';

/**
 * Webview panel to display user dashboard with statistics and progress
 */
export class DashboardWebview {
    public static currentPanel: DashboardWebview | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    public static async createOrShow(
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ) {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (DashboardWebview.currentPanel) {
            DashboardWebview.currentPanel._panel.reveal(column);
            DashboardWebview.currentPanel._update(context);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'knowledgeForgeDashboard',
            '📊 Dashboard - KnowledgeForge',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        DashboardWebview.currentPanel = new DashboardWebview(panel, extensionUri, context);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        // Set the webview's initial html content
        this._update(context);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'refresh':
                        await this._update(this._context);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        DashboardWebview.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update(context: vscode.ExtensionContext) {
        this._panel.title = '📊 Dashboard - KnowledgeForge';
        this._panel.webview.html = await this._getHtmlForWebview(context);
    }

    private async _getHtmlForWebview(context: vscode.ExtensionContext) {
        const state = ProjectStateService.getState(context);
        
        if (!state) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - KnowledgeForge</title>
    <style>
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
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
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
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Dashboard de Progreso</h1>
    </div>
    <div class="empty-state">
        <p>No hay datos de proyecto disponibles.</p>
        <p>Genera un roadmap para comenzar a ver tus estadísticas.</p>
    </div>
</body>
</html>`;
        }

        const progress = ProjectStateService.getProgress(state);
        const allBadges = BadgesService.getAllBadges();
        const unlockedBadges = state.unlockedBadges || [];
        const unlockedCount = unlockedBadges.length;
        const completionPercentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
        
        // Get user stats
        const userStats = UserStatsService.getStats(context);
        const currentLevel = UserStatsService.getLevel(state.totalXp || 0);
        const xpToNextLevel = UserStatsService.getXpToNextLevel(state.totalXp || 0);
        const levelProgress = UserStatsService.getLevelProgress(state.totalXp || 0);

        // Calculate streak (simplified)
        const streak = userStats.currentStreak || 0;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - KnowledgeForge</title>
    <style>
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
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin: 10px 0;
        }
        .stat-label {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        .level-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .progress-bar-container {
            height: 10px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 5px;
            margin: 20px 0;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background-color: var(--vscode-textLink-foreground);
            border-radius: 5px;
            width: ${levelProgress}%;
        }
        .badges-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 30px;
        }
        .badge-card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .badge-card.locked {
            opacity: 0.5;
        }
        .badge-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        .badge-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .badge-description {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }
        .section-title {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin: 30px 0 20px 0;
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
        .actions {
            text-align: center;
            margin-top: 30px;
        }
        .weekly-chart {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            height: 100px;
            margin: 20px 0;
            padding: 0 10px;
        }
        .chart-bar {
            width: 30px;
            background-color: var(--vscode-textLink-foreground);
            border-radius: 3px 3px 0 0;
            position: relative;
        }
        .chart-bar-label {
            position: absolute;
            bottom: -20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.7em;
        }
        .chart-bar-value {
            position: absolute;
            top: -20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.7em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Dashboard de Progreso</h1>
        <p>Estadísticas y logros de tu aprendizaje</p>
    </div>

    <div class="stats-container">
        <div class="stat-card">
            <div class="stat-value">${progress.completed}</div>
            <div class="stat-label">Tareas Completadas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${progress.total}</div>
            <div class="stat-label">Tareas Totales</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completionPercentage}%</div>
            <div class="stat-label">Progreso</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${state.totalXp || 0}</div>
            <div class="stat-label">Puntos XP</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${unlockedCount}</div>
            <div class="stat-label">Logros</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${streak}</div>
            <div class="stat-label">Racha (días)</div>
        </div>
    </div>

    <h2 class="section-title">Nivel de Desarrollador</h2>
    <div class="stat-card">
        <div class="level-info">
            <span>Nivel ${currentLevel}</span>
            <span>${xpToNextLevel} XP para el nivel ${currentLevel + 1}</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar"></div>
        </div>
        <div>${state.totalXp || 0} XP</div>
    </div>

    <h2 class="section-title">Actividad Semanal</h2>
    <div class="weekly-chart">
        ${Object.entries(userStats.weeklyActivity || {}).map(([day, count]) => {
            const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const maxValue = Math.max(1, ...Object.values(userStats.weeklyActivity || {'0':0,'1':0,'2':0,'3':0,'4':0,'5':0,'6':0}));
            const height = Math.max(10, (count / maxValue) * 100);
            return `
                <div class="chart-bar" style="height: ${height}%">
                    <div class="chart-bar-value">${count}</div>
                    <div class="chart-bar-label">${dayNames[parseInt(day)]}</div>
                </div>
            `;
        }).join('')}
    </div>

    <h2 class="section-title">Tus Logros</h2>
    <div class="badges-container">
        ${allBadges.map(badge => `
            <div class="badge-card ${unlockedBadges.includes(badge.id) ? '' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
            </div>
        `).join('')}
    </div>

    <div class="actions">
        <button id="refresh-btn">Actualizar</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('refresh-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
        });
    </script>
</body>
</html>`;
    }
}