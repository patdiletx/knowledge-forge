import * as vscode from 'vscode';
import { AIServiceFactory } from './AIServiceFactory';
import { ProjectStateService } from './ProjectStateService';

/**
 * Represents a refactoring challenge
 */
export interface RefactorChallenge {
    id: string;
    title: string;
    description: string;
    initialCode: string;
    goal: string;
    hints: string[];
    xpReward: number;
    successCriteria: string[];
}

/**
 * Result of a refactor challenge
 */
export interface RefactorChallengeResult {
    completed: boolean;
    feedback: string;
    xpEarned: number;
}

/**
 * Service for managing refactoring challenges
 */
export class RefactorChallengeService {
    /**
     * Generates a refactor challenge based on the completed task
     * @param taskDescription Description of the completed task
     * @param apiKey API key for AI service
     * @returns A refactor challenge or null if not applicable
     */
    public static async generateRefactorChallenge(
        taskDescription: string,
        apiKey: string
    ): Promise<RefactorChallenge | null> {
        const aiService = AIServiceFactory.createService(apiKey);
        
        const prompt = `Genera un desafío de refactorización opcional basado en la siguiente tarea completada:

Tarea completada:
${taskDescription}

Por favor, genera un desafío de refactorización en el siguiente formato JSON:

{
  "id": "ID único del desafío",
  "title": "Título del desafío",
  "description": "Descripción detallada del desafío",
  "initialCode": "Código inicial para refactorizar",
  "goal": "Objetivo del desafío de refactorización",
  "hints": [
    "Pista 1",
    "Pista 2",
    "Pista 3"
  ],
  "xpReward": 50,
  "successCriteria": [
    "Criterio de éxito 1",
    "Criterio de éxito 2"
  ]
}

El desafío debe:
1. Estar relacionado con la tarea completada
2. Tener un código inicial que pueda mejorarse
3. Incluir objetivos claros de refactorización (ej. reducir complejidad, mejorar legibilidad, aplicar patrones de diseño)
4. Proporcionar pistas útiles
5. Tener criterios de éxito medibles

Si no es posible crear un desafío relevante para esta tarea, responde con: null

Responde únicamente con el JSON solicitado o null, sin ningún texto adicional.`;

        try {
            const response = await aiService.generateContent(prompt);
            
            if (response.trim().toLowerCase() === 'null') {
                return null;
            }
            
            const challenge = JSON.parse(response);
            return challenge;
        } catch (error) {
            console.error('Error generating refactor challenge:', error);
            return null;
        }
    }

    /**
     * Shows a refactor challenge to the user
     * @param challenge The refactor challenge to show
     * @returns Promise that resolves when the challenge is completed or skipped
     */
    public static async showRefactorChallenge(challenge: RefactorChallenge): Promise<boolean> {
        const choice = await vscode.window.showInformationMessage(
            `🎯 Desafío de Refactorización: ${challenge.title}`,
            {
                modal: true,
                detail: `${challenge.description}\n\n¿Quieres intentar este desafío opcional para ganar ${challenge.xpReward} XP extra?`
            },
            'Aceptar Desafío', 
            'Omitir'
        );

        return choice === 'Aceptar Desafío';
    }

    /**
     * Shows the refactor challenge in a webview panel
     * @param challenge The refactor challenge to show
     * @param extensionUri Extension URI for webview resources
     * @returns Promise that resolves with the result of the challenge
     */
    public static async showRefactorChallengePanel(
        challenge: RefactorChallenge,
        extensionUri: vscode.Uri
    ): Promise<RefactorChallengeResult> {
        return new Promise((resolve) => {
            const panel = vscode.window.createWebviewPanel(
                'refactorChallenge',
                `🎯 ${challenge.title}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [extensionUri],
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = this.getWebviewContent(challenge);

            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.type) {
                        case 'submitChallenge':
                            // In a real implementation, we would evaluate the code
                            // For now, we'll just assume success
                            const result: RefactorChallengeResult = {
                                completed: true,
                                feedback: '¡Buen trabajo! Has completado el desafío de refactorización.',
                                xpEarned: challenge.xpReward
                            };
                            
                            panel.dispose();
                            resolve(result);
                            break;
                            
                        case 'skipChallenge':
                            const skipResult: RefactorChallengeResult = {
                                completed: false,
                                feedback: 'Has omitido el desafío. ¡Sigue con la siguiente tarea!',
                                xpEarned: 0
                            };
                            
                            panel.dispose();
                            resolve(skipResult);
                            break;
                    }
                },
                undefined
            );

            panel.onDidDispose(() => {
                const result: RefactorChallengeResult = {
                    completed: false,
                    feedback: 'Has cerrado el desafío. ¡Sigue con la siguiente tarea!',
                    xpEarned: 0
                };
                resolve(result);
            });
        });
    }

    /**
     * Generates the HTML content for the refactor challenge webview
     * @param challenge The refactor challenge
     * @returns HTML content for the webview
     */
    private static getWebviewContent(challenge: RefactorChallenge): string {
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${challenge.title} - Desafío de Refactorización</title>
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
        .challenge-section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .challenge-section h2 {
            color: var(--vscode-foreground);
            margin-top: 0;
        }
        .code-container {
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            border: 1px solid var(--vscode-panel-border);
        }
        .hint {
            background-color: rgba(64, 90, 120, 0.2);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 10px;
            margin: 10px 0;
            border-radius: 0 4px 4px 0;
        }
        .criteria {
            padding-left: 20px;
        }
        .criteria li {
            margin-bottom: 8px;
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
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .reward {
            text-align: center;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 ${challenge.title}</h1>
        <p class="subtitle">${challenge.description}</p>
    </div>

    <div class="reward">🎁 Recompensa: ${challenge.xpReward} XP</div>

    <div class="challenge-section">
        <h2>📝 Objetivo</h2>
        <p>${challenge.goal}</p>
    </div>

    <div class="challenge-section">
        <h2>💻 Código Inicial</h2>
        <div class="code-container">
            <pre>${challenge.initialCode}</pre>
        </div>
    </div>

    <div class="challenge-section">
        <h2>💡 Pistas</h2>
        <ul>
            ${challenge.hints.map(hint => `<li class="hint">${hint}</li>`).join('')}
        </ul>
    </div>

    <div class="challenge-section">
        <h2>✅ Criterios de Éxito</h2>
        <ul class="criteria">
            ${challenge.successCriteria.map(criterion => `<li>${criterion}</li>`).join('')}
        </ul>
    </div>

    <div class="buttons">
        <button id="skip-btn" class="secondary">Omitir Desafío</button>
        <button id="submit-btn">Hecho - Revisar Solución</button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        document.getElementById('skip-btn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'skipChallenge'
            });
        });
        
        document.getElementById('submit-btn').addEventListener('click', () => {
            // In a real implementation, we would send the user's code
            vscode.postMessage({
                type: 'submitChallenge'
            });
        });
    </script>
</body>
</html>`;
    }

    /**
     * Generates a random nonce for Content Security Policy
     */
    private static getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}