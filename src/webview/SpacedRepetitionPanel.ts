import * as vscode from 'vscode';
import * as path from 'path';
import { SpacedRepetitionService, SpacedRepetitionItem, ReviewSession } from '../services/SpacedRepetitionService';

export class SpacedRepetitionPanel {
    public static currentPanel: SpacedRepetitionPanel | undefined;
    
    public static readonly viewType = 'spacedRepetition';
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    private _session: ReviewSession | undefined;
    private _currentItemIndex: number = 0;
    
    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        if (SpacedRepetitionPanel.currentPanel) {
            SpacedRepetitionPanel.currentPanel._panel.reveal(column);
            SpacedRepetitionPanel.currentPanel._update();
            return;
        }
        
        const panel = vscode.window.createWebviewPanel(
            SpacedRepetitionPanel.viewType,
            'Quick Review',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        SpacedRepetitionPanel.currentPanel = new SpacedRepetitionPanel(panel, extensionUri, context);
    }
    
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;
        
        // Create a new review session when panel opens
        this._session = SpacedRepetitionService.createReviewSession(context, 5);
        this._currentItemIndex = 0;
        
        this._update();
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'rateDifficulty':
                        this._handleRating(message.rating);
                        return;
                    case 'skipItem':
                        this._showNextItem();
                        return;
                    case 'completeSession':
                        this._completeSession();
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    
    public dispose() {
        SpacedRepetitionPanel.currentPanel = undefined;
        
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
        
        if (!this._session || this._session.items.length === 0) {
            return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quick Review</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        
        h1 {
            color: var(--vscode-foreground);
        }
        
        .message {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 5px;
            padding: 30px;
            margin: 20px 0;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Quick Review</h1>
        <div class="message">
            <p>No hay conceptos pendientes para revisar en este momento.</p>
            <p>Continúa trabajando en tus tareas y los conceptos importantes aparecerán aquí para revisión.</p>
        </div>
        <button class="btn" onclick="closePanel()">Cerrar</button>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function closePanel() {
            vscode.postMessage({ command: 'completeSession' });
        }
    </script>
</body>
</html>`;
        }
        
        const currentItem = this._session.items[this._currentItemIndex];
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quick Review</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1 {
            color: var(--vscode-foreground);
            text-align: center;
        }
        
        .progress {
            text-align: center;
            margin-bottom: 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 5px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .concept {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
        }
        
        .description {
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .hint {
            font-style: italic;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
        }
        
        .difficulty-buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 15px;
            border-radius: 3px;
            cursor: pointer;
            flex: 1;
            min-width: 120px;
            text-align: center;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-skip {
            background-color: var(--vscode-textSeparator-foreground);
        }
        
        .btn-again { background-color: #d32f2f; }
        .btn-hard { background-color: #f57c00; }
        .btn-good { background-color: #388e3c; }
        .btn-easy { background-color: #1976d2; }
        
        .btn-again:hover { background-color: #f44336; }
        .btn-hard:hover { background-color: #ff9800; }
        .btn-good:hover { background-color: #4caf50; }
        .btn-easy:hover { background-color: #2196f3; }
        
        .actions {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Quick Review</h1>
        <div class="progress">
            Tarjeta ${this._currentItemIndex + 1} de ${this._session.items.length}
        </div>
        
        <div class="card">
            <div class="concept">${currentItem.concept}</div>
            <div class="description">${currentItem.description}</div>
            <div class="hint">¿Recuerdas este concepto? Califica tu dificultad:</div>
            
            <div class="difficulty-buttons">
                <button class="btn btn-again" onclick="rateDifficulty(1)">Otra vez</button>
                <button class="btn btn-hard" onclick="rateDifficulty(2)">Difícil</button>
                <button class="btn btn-good" onclick="rateDifficulty(3)">Bien</button>
                <button class="btn btn-easy" onclick="rateDifficulty(4)">Fácil</button>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-skip" onclick="skipItem()">Saltar</button>
            <button class="btn" onclick="completeSession()">Finalizar Sesión</button>
        </div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function rateDifficulty(rating) {
            vscode.postMessage({ command: 'rateDifficulty', rating: rating });
        }
        
        function skipItem() {
            vscode.postMessage({ command: 'skipItem' });
        }
        
        function completeSession() {
            vscode.postMessage({ command: 'completeSession' });
        }
    </script>
</body>
</html>`;
    }
    
    private _handleRating(rating: number) {
        if (!this._session) return;
        
        const currentItem = this._session.items[this._currentItemIndex];
        try {
            SpacedRepetitionService.processReview(this._context, currentItem.id, rating);
            this._showNextItem();
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing review: ${error}`);
        }
    }
    
    private _showNextItem() {
        if (!this._session) return;
        
        this._currentItemIndex++;
        if (this._currentItemIndex >= this._session.items.length) {
            // Session completed
            this._completeSession();
        } else {
            this._update();
        }
    }
    
    private _completeSession() {
        if (this._session) {
            try {
                // Save session as completed
                const sessions = SpacedRepetitionService.getSessions(this._context);
                this._session.completedAt = new Date();
                this._session.score = this._currentItemIndex / this._session.items.length * 100;
                sessions.push(this._session);
                SpacedRepetitionService.saveSessions(this._context, sessions);
                
                vscode.window.showInformationMessage(
                    `Sesión de repaso completada. Has revisado ${this._currentItemIndex} conceptos.`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Error completing session: ${error}`);
            }
        }
        
        this.dispose();
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