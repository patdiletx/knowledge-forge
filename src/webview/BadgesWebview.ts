import * as vscode from 'vscode';
import { BadgesService, Badge } from '../services/BadgesService';
import { ProjectStateService } from '../services/ProjectStateService';

/**
 * Webview panel to display user badges and achievements
 */
export class BadgesWebview {
    public static currentPanel: BadgesWebview | undefined;
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
        if (BadgesWebview.currentPanel) {
            BadgesWebview.currentPanel._panel.reveal(column);
            BadgesWebview.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'knowledgeForgeBadges',
            '🏅 Logros - KnowledgeForge',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        BadgesWebview.currentPanel = new BadgesWebview(panel, extensionUri, context);
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
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'getBadges':
                        await this._handleGetBadges();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleGetBadges() {
        try {
            const state = ProjectStateService.getState(this._context);
            if (!state) {
                console.error('Project state is not available.');
                return;
            }

            const allBadges = BadgesService.getAllBadges() || [];
            const unlockedBadges = state.unlockedBadges || [];
            
            const stats = {
                unlockedCount: unlockedBadges.length,
                totalCount: allBadges.length,
                completionPercentage: allBadges.length > 0 ? (unlockedBadges.length / allBadges.length) * 100 : 0
            };

            this._panel.webview.postMessage({
                type: 'updateBadges',
                badges: allBadges,
                unlockedBadges: unlockedBadges,
                stats: stats
            });
        } catch (error) {
            console.error('Error occurred while fetching badges:', error);
        }
    }

    public dispose() {
        BadgesWebview.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.title = '🏅 Logros - KnowledgeForge';
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logros - KnowledgeForge</title>
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
        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        .badges-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }
        .badge-card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .badge-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .badge-card.unlocked {
            border-color: var(--vscode-terminal-ansiGreen);
            background-color: rgba(45, 150, 45, 0.1);
        }
        .badge-card.locked {
            opacity: 0.6;
        }
        .badge-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .badge-icon {
            font-size: 32px;
            margin-right: 15px;
            width: 40px;
            text-align: center;
        }
        .badge-title {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
            color: var(--vscode-foreground);
        }
        .badge-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
            font-size: 14px;
            line-height: 1.4;
        }
        .badge-status {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-unlocked {
            background-color: rgba(45, 150, 45, 0.2);
            color: var(--vscode-terminal-ansiGreen);
        }
        .status-locked {
            background-color: rgba(150, 150, 150, 0.2);
            color: var(--vscode-descriptionForeground);
        }
        .xp-reward {
            font-size: 13px;
            color: var(--vscode-textLink-foreground);
            font-weight: bold;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .stat-label {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏅 Tus Logros</h1>
        <p class="subtitle">Completa tareas y desafíos para desbloquear insignias especiales</p>
    </div>

    <div id="stats-container"></div>
    
    <div id="badges-container" class="badges-container">
        <!-- Badges will be populated by JavaScript -->
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
            // Initial data request
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'updateBadges':
                        renderBadges(message.badges, message.unlockedBadges, message.stats);
                        break;
                }
            });
            
            // Request initial data
            vscode.postMessage({ type: 'getBadges' });
            
            function renderBadges(allBadges, unlockedBadges, stats) {
                // Update stats
                const statsContainer = document.getElementById('stats-container');
                statsContainer.innerHTML = \`
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-value">\${stats.unlockedCount}</div>
                            <div class="stat-label">Logros Desbloqueados</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">\${stats.totalCount}</div>
                            <div class="stat-label">Logros Totales</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">\${Math.round(stats.completionPercentage)}%</div>
                            <div class="stat-label">Completado</div>
                        </div>
                    </div>
                \`;
                
                // Render badges
                const container = document.getElementById('badges-container');
                
                if (allBadges.length === 0) {
                    container.innerHTML = '<div class="empty-state"><p>No hay logros disponibles aún.</p></div>';
                    return;
                }
                
                container.innerHTML = allBadges.map(badge => {
                    const isUnlocked = unlockedBadges.includes(badge.id);
                    return \`
                        <div class="badge-card \${isUnlocked ? 'unlocked' : 'locked'}">
                            <div class="badge-header">
                                <div class="badge-icon">\${badge.icon}</div>
                                <h3 class="badge-title">\${badge.name}</h3>
                            </div>
                            <p class="badge-description">\${badge.description}</p>
                            <div>
                                <span class="badge-status \${isUnlocked ? 'status-unlocked' : 'status-locked'}">
                                    \${isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                                </span>
                                <span class="xp-reward">+ \${badge.xpReward} XP</span>
                            </div>
                        </div>
                    \`;
                }).join('');
            }
        }());
    </script>
</body>
</html>`;
    }
}