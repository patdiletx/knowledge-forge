import * as vscode from 'vscode';
import { GamificationService, PlayerProfile, SkillTree, Achievement, Challenge } from '../services/GamificationService';

export class GamificationPanel {
    public static currentPanel: GamificationPanel | undefined;
    
    public static readonly viewType = 'gamification';
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    
    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        if (GamificationPanel.currentPanel) {
            GamificationPanel.currentPanel._panel.reveal(column);
            GamificationPanel.currentPanel._update();
            return;
        }
        
        const panel = vscode.window.createWebviewPanel(
            GamificationPanel.viewType,
            'Gamification Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        GamificationPanel.currentPanel = new GamificationPanel(panel, extensionUri, context);
    }
    
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;
        
        this._update();
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'showAchievements':
                        this._showAchievements();
                        return;
                    case 'showChallenges':
                        this._showChallenges();
                        return;
                    case 'showSkillTree':
                        this._showSkillTree();
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    
    public dispose() {
        GamificationPanel.currentPanel = undefined;
        
        this._panel.dispose();
        
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    
    private _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    
    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = this._getNonce();
        
        // Get gamification data
        const profile: PlayerProfile = GamificationService.getPlayerProfile(this._context);
        const skillTree: SkillTree = GamificationService.getSkillTree(this._context);
        const achievements: Achievement[] = GamificationService.getAchievements(this._context);
        const challenges: Challenge[] = GamificationService.getWeeklyChallenges(this._context);
        
        // Calculate XP progress to next level
        const currentClass = profile.developerClass;
        const nextClass = GamificationService.DEVELOPER_CLASSES.find(c => c.level === currentClass.level + 1);
        const xpProgress = nextClass 
            ? Math.min(100, Math.max(0, (profile.totalXp - currentClass.requiredXp) / (nextClass.requiredXp - currentClass.requiredXp) * 100))
            : 100;
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gamification Dashboard</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        h1, h2, h3 {
            color: var(--vscode-foreground);
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .profile-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .avatar {
            font-size: 2.5em;
        }
        
        .profile-info h2 {
            margin: 0 0 5px 0;
        }
        
        .profile-info p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
        }
        
        .xp-bar-container {
            margin: 15px 0;
        }
        
        .xp-bar-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .xp-bar {
            height: 10px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 5px;
            overflow: hidden;
        }
        
        .xp-progress {
            height: 100%;
            background-color: var(--vscode-charts-green);
            width: ${xpProgress}%;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            text-align: center;
        }
        
        .stat-card {
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 5px;
        }
        
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-charts-blue);
        }
        
        .stat-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 25px 0 15px 0;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .achievements-grid, .challenges-list, .skills-tree {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .achievement-card, .challenge-card, .skill-node {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 5px;
            padding: 15px;
            text-align: center;
        }
        
        .achievement-card.locked, .skill-node.locked {
            opacity: 0.5;
        }
        
        .achievement-icon, .skill-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .achievement-name, .skill-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .achievement-desc, .skill-desc {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        
        .challenge-card.completed {
            border-color: var(--vscode-charts-green);
        }
        
        .challenge-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .challenge-name {
            font-weight: bold;
        }
        
        .challenge-xp {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.8em;
        }
        
        .challenge-difficulty {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }
        
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            padding-bottom: 10px;
        }
        
        .tab {
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .tab.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
    </style>
</head>
<body>
    <h1>🎮 Gamification Dashboard</h1>
    
    <div class="dashboard">
        <div class="card">
            <div class="profile-header">
                <div class="avatar">${currentClass.icon}</div>
                <div class="profile-info">
                    <h2>${currentClass.name}</h2>
                    <p>Nivel ${currentClass.level}</p>
                    <p>${currentClass.description}</p>
                </div>
            </div>
            
            <div class="xp-bar-container">
                <div class="xp-bar-label">
                    <span>${profile.totalXp} XP</span>
                    <span>${nextClass ? nextClass.name : 'Máximo nivel'} (${nextClass ? nextClass.requiredXp : '∞'} XP)</span>
                </div>
                <div class="xp-bar">
                    <div class="xp-progress"></div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>Estadísticas</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${profile.currentStreak}</div>
                    <div class="stat-label">Racha Actual</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${profile.longestStreak}</div>
                    <div class="stat-label">Mejor Racha</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${achievements.filter(a => a.unlocked).length}/${achievements.length}</div>
                    <div class="stat-label">Logros</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="tabs">
        <div class="tab active" onclick="showTab('achievements')">🏅 Logros</div>
        <div class="tab" onclick="showTab('challenges')">🎯 Desafíos</div>
        <div class="tab" onclick="showTab('skills')">🌳 Árbol de Habilidades</div>
    </div>
    
    <div id="achievements-tab">
        <div class="section-header">
            <h2>Logros</h2>
        </div>
        <div class="achievements-grid">
            ${achievements.map(achievement => `
                <div class="achievement-card ${achievement.unlocked ? '' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                    ${achievement.unlocked ? `<div class="achievement-date">Desbloqueado: ${achievement.unlockDate?.toLocaleDateString()}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    
    <div id="challenges-tab" style="display: none;">
        <div class="section-header">
            <h2>Desafíos de la Semana</h2>
        </div>
        <div class="challenges-list">
            ${challenges.map(challenge => `
                <div class="challenge-card ${challenge.completed ? 'completed' : ''}">
                    <div class="challenge-header">
                        <div class="challenge-name">${challenge.name}</div>
                        <div class="challenge-xp">${challenge.xpReward} XP</div>
                    </div>
                    <div class="challenge-desc">${challenge.description}</div>
                    <div class="challenge-difficulty">
                        Dificultad: ${'★'.repeat(challenge.difficulty)}${'☆'.repeat(5 - challenge.difficulty)}
                    </div>
                    ${challenge.completed ? '<div class="challenge-status">✅ Completado</div>' : 
                      challenge.deadline ? `<div class="challenge-deadline">📅 Finaliza: ${challenge.deadline.toLocaleDateString()}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    
    <div id="skills-tab" style="display: none;">
        <div class="section-header">
            <h2>Árbol de Habilidades</h2>
        </div>
        <div class="skills-tree">
            ${skillTree.skills.map(skill => `
                <div class="skill-node ${skill.unlocked ? '' : 'locked'}">
                    <div class="skill-icon">${skill.icon}</div>
                    <div class="skill-name">${skill.name}</div>
                    <div class="skill-desc">${skill.description}</div>
                    ${skill.unlocked ? '<div class="skill-status">🔓 Desbloqueado</div>' : `<div class="skill-requirement">${skill.requiredXp} XP requeridos</div>`}
                </div>
            `).join('')}
        </div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function showTab(tabName) {
            // Hide all tabs
            document.getElementById('achievements-tab').style.display = 'none';
            document.getElementById('challenges-tab').style.display = 'none';
            document.getElementById('skills-tab').style.display = 'none';
            
            // Show selected tab
            document.getElementById(tabName + '-tab').style.display = 'block';
            
            // Update active tab
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
        }
        
        // Set initial active tab
        document.querySelector('.tab').classList.add('active');
    </script>
</body>
</html>`;
    }
    
    private _showAchievements() {
        // In a more complex implementation, we might show a detailed achievements view
        vscode.window.showInformationMessage('Mostrando logros...');
    }
    
    private _showChallenges() {
        // In a more complex implementation, we might show a detailed challenges view
        vscode.window.showInformationMessage('Mostrando desafíos...');
    }
    
    private _showSkillTree() {
        // In a more complex implementation, we might show a detailed skill tree view
        vscode.window.showInformationMessage('Mostrando árbol de habilidades...');
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