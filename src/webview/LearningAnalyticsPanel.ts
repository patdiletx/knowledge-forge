import * as vscode from 'vscode';
import * as path from 'path';
import { LearningAnalyticsService, AnalyticsDashboardData } from '../services/LearningAnalyticsService';

export class LearningAnalyticsPanel {
    public static currentPanel: LearningAnalyticsPanel | undefined;
    
    public static readonly viewType = 'learningAnalytics';
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    
    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        if (LearningAnalyticsPanel.currentPanel) {
            LearningAnalyticsPanel.currentPanel._panel.reveal(column);
            LearningAnalyticsPanel.currentPanel._update();
            return;
        }
        
        const panel = vscode.window.createWebviewPanel(
            LearningAnalyticsPanel.viewType,
            'Learning Analytics',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        LearningAnalyticsPanel.currentPanel = new LearningAnalyticsPanel(panel, extensionUri, context);
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
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    
    public dispose() {
        LearningAnalyticsPanel.currentPanel = undefined;
        
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
        
        // Get dashboard data
        const dashboardData: AnalyticsDashboardData = LearningAnalyticsService.getDashboardData(this._context);
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learning Analytics Dashboard</title>
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
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .card-title {
            font-size: 1.2em;
            font-weight: bold;
            margin: 0;
        }
        
        .streak-container {
            display: flex;
            justify-content: space-around;
            text-align: center;
        }
        
        .streak-item {
            padding: 10px;
        }
        
        .streak-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--vscode-charts-green);
        }
        
        .streak-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        
        .heatmap {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
        }
        
        .heatmap-day {
            height: 20px;
            background-color: var(--vscode-charts-blue);
            opacity: 0.2;
            border-radius: 2px;
        }
        
        .heatmap-day.active {
            opacity: 1;
        }
        
        .chart-container {
            height: 200px;
            display: flex;
            align-items: flex-end;
            gap: 5px;
            padding: 10px 0;
        }
        
        .bar {
            flex: 1;
            background-color: var(--vscode-charts-blue);
            text-align: center;
            color: white;
            position: relative;
        }
        
        .bar-label {
            position: absolute;
            bottom: -20px;
            left: 0;
            right: 0;
            font-size: 0.7em;
        }
        
        .radar-chart {
            width: 100%;
            height: 200px;
            position: relative;
        }
        
        .prediction-list {
            list-style: none;
            padding: 0;
        }
        
        .prediction-item {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
        }
        
        .prediction-item:last-child {
            border-bottom: none;
        }
        
        .prediction-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        
        .confidence-meter {
            height: 5px;
            background-color: var(--vscode-progressBar-background);
            margin-top: 5px;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .confidence-level {
            height: 100%;
            background-color: var(--vscode-charts-green);
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            text-align: center;
        }
        
        .metric-card {
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 5px;
        }
        
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-charts-green);
        }
        
        .metric-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>📊 Learning Analytics Dashboard</h1>
    
    <div class="metric-grid">
        <div class="metric-card">
            <div class="metric-value">${dashboardData.streakData.currentStreak}</div>
            <div class="metric-label">Current Streak</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${Object.keys(dashboardData.heatmapData).length}</div>
            <div class="metric-label">Active Days</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${dashboardData.timeToMasteryPredictions.length}</div>
            <div class="metric-label">Skills Tracked</div>
        </div>
    </div>
    
    <div class="dashboard">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Activity Heatmap</h2>
            </div>
            <div class="heatmap" id="heatmap">
                ${this._generateHeatmapHTML(dashboardData.heatmapData)}
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Learning Streak</h2>
            </div>
            <div class="streak-container">
                <div class="streak-item">
                    <div class="streak-value">${dashboardData.streakData.currentStreak}</div>
                    <div class="streak-label">Current</div>
                </div>
                <div class="streak-item">
                    <div class="streak-value">${dashboardData.streakData.longestStreak}</div>
                    <div class="streak-label">Longest</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Velocity Chart</h2>
            </div>
            <div class="chart-container">
                ${this._generateVelocityChartHTML(dashboardData.velocityData)}
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Skills Radar</h2>
            </div>
            <div class="radar-chart">
                <!-- Simplified radar chart representation -->
                <ul>
                    ${dashboardData.skillsRadarData.map(skill => `
                        <li>${skill.skill}: ${skill.level}%</li>
                    `).join('')}
                </ul>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Time to Mastery Predictions</h2>
            </div>
            <ul class="prediction-list">
                ${dashboardData.timeToMasteryPredictions.map(prediction => `
                    <li class="prediction-item">
                        <div class="prediction-header">
                            <span>${prediction.skill}</span>
                            <span>${prediction.predictedDays} days</span>
                        </div>
                        <div>Confidence: ${prediction.confidence}%</div>
                        <div class="confidence-meter">
                            <div class="confidence-level" style="width: ${prediction.confidence}%"></div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    </div>
    
    <script nonce="${nonce}">
        // Add interactivity if needed
        console.log('Learning Analytics Dashboard loaded');
    </script>
</body>
</html>`;
    }
    
    private _generateHeatmapHTML(heatmapData: any[]): string {
        return heatmapData.map(day => {
            const intensity = Math.min(1, day.value / 60); // Normalize to max 1 hour
            const opacity = day.value > 0 ? 0.2 + (intensity * 0.8) : 0.2;
            return `<div class="heatmap-day" style="opacity: ${opacity}" title="${day.date}: ${day.value} minutes"></div>`;
        }).join('');
    }
    
    private _generateVelocityChartHTML(velocityData: any[]): string {
        if (velocityData.length === 0) return '';
        
        const maxValue = Math.max(...velocityData.map(d => d.tasksPerWeek), 1);
        
        return velocityData.map(data => {
            const height = (data.tasksPerWeek / maxValue) * 100;
            return `
                <div class="bar" style="height: ${height}%" title="${data.week}: ${data.tasksPerWeek} tasks">
                    <div class="bar-label">${data.week}</div>
                </div>
            `;
        }).join('');
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