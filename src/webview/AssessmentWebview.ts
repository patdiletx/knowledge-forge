import * as vscode from 'vscode';
import { AssessmentService } from '../services/AssessmentService';

export class AssessmentWebview {
    public static currentPanel: AssessmentWebview | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ) {
        const column = vscode.ViewColumn.One;

        if (AssessmentWebview.currentPanel) {
            AssessmentWebview.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'knowledgeForgeAssessment',
            '📝 Evaluación Adaptativa - KnowledgeForge',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        AssessmentWebview.currentPanel = new AssessmentWebview(panel, extensionUri, context);

        AssessmentService.startAssessment();
        const firstQuestion = AssessmentService.getNextQuestion();
        if (firstQuestion) {
            const questionsRemaining = AssessmentService.getQuestionsRemaining();
            panel.webview.postMessage({ 
                type: 'updateQuestion', 
                question: firstQuestion,
                questionsRemaining: questionsRemaining
            });
        }
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
            async message => {
                switch (message.type) {
                    case 'submitAnswer':
                        {
                            const question = AssessmentService.getQuestions().find(q => q.id === message.questionId);
                            if (question) {
                                const isCorrect = question.correctAnswer === message.answer;
                                
                                // Record the answer for skill profiling
                                AssessmentService.recordAnswer(question, isCorrect);
                                
                                const nextQuestion = AssessmentService.getNextQuestion(isCorrect);
                                if (nextQuestion) {
                                    const questionsRemaining = AssessmentService.getQuestionsRemaining();
                                    this._panel.webview.postMessage({ 
                                        type: 'updateQuestion', 
                                        question: nextQuestion,
                                        isCorrect: isCorrect,
                                        correctAnswer: question.correctAnswer,
                                        questionsRemaining: questionsRemaining
                                    });
                                } else {
                                    // Assessment finished
                                    const result = AssessmentService.getAssessmentResult();
                                    this._panel.webview.postMessage({ 
                                        type: 'finish', 
                                        result: result
                                    });
                                }
                            }
                            break;
                        }
                    case 'skipAssessment':
                        {
                            // User chose to skip assessment
                            this.dispose();
                            vscode.window.showInformationMessage('Evaluación saltada. Puedes comenzar directamente con un roadmap personalizado.');
                            break;
                        }
                    case 'continue':
                        {
                            // User wants to continue with roadmap generation
                            // Close the assessment panel
                            this.dispose();
                            
                            // Get assessment results
                            const result = AssessmentService.getAssessmentResult();
                            
                            // Create a summary of the user's skills for roadmap generation
                            let skillSummary = 'Basado en la evaluación, el usuario tiene los siguientes niveles de habilidad:\n';
                            for (const category in result.skillProfile) {
                                skillSummary += `- ${category}: ${result.skillProfile[category]}\n`;
                            }
                            skillSummary += `\nNivel general: ${result.overallLevel}\n`;
                            skillSummary += `Respuestas correctas: ${result.correctAnswers}/${result.totalQuestions}\n`;
                            
                            // Show a message to the user and ask if they want to generate a roadmap
                            const selection = await vscode.window.showInformationMessage(
                                'Evaluación completada. ¿Te gustaría generar un roadmap personalizado basado en tus resultados?',
                                'Generar Roadmap',
                                'Cancelar'
                            );
                            
                            if (selection === 'Generar Roadmap') {
                                // Execute the generate roadmap command with the skill summary
                                vscode.commands.executeCommand('knowledgeforge.generateRoadmap', skillSummary);
                            }
                            break;
                        }
                    case 'close':
                        {
                            // Close the assessment panel
                            this.dispose();
                            break;
                        }
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        AssessmentWebview.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.title = '📝 Evaluación Adaptativa - KnowledgeForge';
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evaluación Adaptativa - KnowledgeForge</title>
    <style>
        :root {
            --background: var(--vscode-editor-background);
            --foreground: var(--vscode-foreground);
            --button-background: var(--vscode-button-background);
            --button-foreground: var(--vscode-button-foreground);
            --button-hover: var(--vscode-button-hoverBackground);
            --input-background: var(--vscode-input-background);
            --input-foreground: var(--vscode-input-foreground);
            --border: var(--vscode-panel-border);
            --success: #4CAF50;
            --error: #F44336;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--foreground);
            background-color: var(--background);
            padding: 20px;
            margin: 0;
            line-height: 1.6;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border);
        }
        
        h1 {
            color: var(--foreground);
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        
        .assessment-container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .intro {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .intro p {
            margin-bottom: 20px;
        }
        
        .question-card {
            background-color: var(--vscode-sideBar-background);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .question-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        
        .question-text {
            font-size: 16px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .option {
            display: flex;
            align-items: flex-start;
            padding: 12px 15px;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .option:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .option input {
            margin-right: 10px;
            margin-top: 2px;
        }
        
        .option-label {
            flex: 1;
        }
        
        .feedback {
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            display: none;
        }
        
        .feedback.correct {
            background-color: rgba(76, 175, 80, 0.2);
            border: 1px solid var(--success);
            display: block;
        }
        
        .feedback.incorrect {
            background-color: rgba(244, 67, 54, 0.2);
            border: 1px solid var(--error);
            display: block;
        }
        
        .actions {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        button {
            background-color: var(--button-background);
            color: var(--button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        button:hover {
            background-color: var(--button-hover);
        }
        
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .skip-button {
            background-color: transparent;
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }
        
        .skip-button:hover {
            background-color: transparent;
            color: var(--vscode-textLink-activeForeground);
        }
        
        .result-container {
            text-align: center;
            padding: 30px;
        }
        
        .result-title {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .result-stats {
            font-size: 18px;
            margin-bottom: 20px;
        }
        
        .skill-profile {
            background-color: var(--vscode-sideBar-background);
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }
        
        .skill-profile h3 {
            margin-top: 0;
        }
        
        .skill-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .overall-level {
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0;
            padding: 15px;
            border-radius: 6px;
            background-color: var(--vscode-sideBar-background);
        }
        
        .hidden {
            display: none;
        }
        
        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            overflow-x: auto;
            margin: 10px 0;
        }
        
        pre {
            margin: 0;
        }
        
        .progress-info {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="assessment-container">
        <div class="header">
            <h1>📝 Evaluación Adaptativa</h1>
            <div class="subtitle">Evalúa tus conocimientos para personalizar tu roadmap de aprendizaje</div>
        </div>
        
        <div id="intro-screen" class="intro">
            <p>Esta evaluación determinará tu nivel actual de conocimiento para crear un roadmap personalizado.</p>
            <p>La evaluación se adapta dinámicamente a tus respuestas, ajustando la dificultad de las preguntas.</p>
            <p>Tiempo estimado: 5-10 minutos</p>
            <div class="actions">
                <button id="start-button">Comenzar Evaluación</button>
                <button id="skip-button" class="skip-button">Saltar Evaluación</button>
            </div>
        </div>
        
        <div id="assessment-screen" class="hidden">
            <div class="question-card">
                <div class="question-header">
                    <span id="question-counter">Pregunta 1</span>
                    <span id="difficulty-indicator">Dificultad: Básica</span>
                </div>
                <div id="question-text" class="question-text"></div>
                <div class="options" id="options-container"></div>
            </div>
            
            <div id="feedback-container" class="feedback"></div>
            
            <div class="progress-info" id="progress-info">
                Preguntas restantes: <span id="questions-remaining">-</span>
            </div>
            
            <div class="actions">
                <button id="submit-button" disabled>Enviar Respuesta</button>
            </div>
        </div>
        
        <div id="result-screen" class="hidden">
            <div class="result-container">
                <h2 class="result-title">Evaluación Finalizada</h2>
                <div class="result-stats">
                    <p>Respuestas correctas: <span id="correct-answers">0</span> de <span id="total-questions">0</span></p>
                    <p>Tiempo tomado: <span id="time-taken">0</span> segundos</p>
                </div>
                
                <div class="overall-level">
                    Nivel General: <span id="overall-level">-</span>
                </div>
                
                <div class="skill-profile">
                    <h3>Perfil de Habilidades</h3>
                    <div id="skill-profile-list"></div>
                </div>
                
                <div class="actions">
                    <button id="continue-button">Continuar con Roadmap</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            let currentQuestion = null;
            let questionCount = 0;
            let questionsRemaining = 0;
            
            // DOM Elements
            const introScreen = document.getElementById('intro-screen');
            const assessmentScreen = document.getElementById('assessment-screen');
            const resultScreen = document.getElementById('result-screen');
            
            const startButton = document.getElementById('start-button');
            const skipButton = document.getElementById('skip-button');
            const submitButton = document.getElementById('submit-button');
            const continueButton = document.getElementById('continue-button');
            
            const questionCounter = document.getElementById('question-counter');
            const difficultyIndicator = document.getElementById('difficulty-indicator');
            const questionText = document.getElementById('question-text');
            const optionsContainer = document.getElementById('options-container');
            const feedbackContainer = document.getElementById('feedback-container');
            const questionsRemainingEl = document.getElementById('questions-remaining');
            const progressInfo = document.getElementById('progress-info');
            
            const correctAnswersEl = document.getElementById('correct-answers');
            const totalQuestionsEl = document.getElementById('total-questions');
            const timeTakenEl = document.getElementById('time-taken');
            const overallLevelEl = document.getElementById('overall-level');
            const skillProfileList = document.getElementById('skill-profile-list');
            
            // Event Listeners
            startButton.addEventListener('click', () => {
                introScreen.classList.add('hidden');
                assessmentScreen.classList.remove('hidden');
            });
            
            skipButton.addEventListener('click', () => {
                vscode.postMessage({ type: 'skipAssessment' });
            });
            
            submitButton.addEventListener('click', () => {
                if (currentQuestion) {
                    const selected = document.querySelector('input[name="option"]:checked');
                    if (selected) {
                        vscode.postMessage({ 
                            type: 'submitAnswer', 
                            questionId: currentQuestion.id, 
                            answer: selected.value 
                        });
                        submitButton.disabled = true;
                    }
                }
            });
            
            continueButton.addEventListener('click', () => {
                // Close the assessment panel
                vscode.postMessage({ type: 'continue' });
            });
            
            // Listen for messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'updateQuestion':
                        currentQuestion = message.question;
                        questionCount++;
                        questionsRemaining = message.questionsRemaining || 0;
                        renderQuestion(currentQuestion);
                        updateProgressInfo();
                        submitButton.disabled = true;
                        
                        // Show feedback if available
                        if (message.isCorrect !== undefined) {
                            showFeedback(message.isCorrect, message.correctAnswer);
                        }
                        break;
                        
                    case 'finish':
                        const result = message.result;
                        showResults(result);
                        break;
                        
                    case 'skipped':
                        // Close the assessment panel when skipped
                        if (typeof vscode !== 'undefined') {
                            vscode.postMessage({ type: 'close' });
                        } else {
                            // Fallback for direct browser testing
                            window.close();
                        }
                        break;
                }
            });
            
            // Render a question
            function renderQuestion(q) {
                questionCounter.textContent = 'Pregunta ' + questionCount;
                
                // Set difficulty text
                let difficultyText = 'Básica';
                if (q.difficulty === 2) {
                    difficultyText = 'Intermedia';
                } else if (q.difficulty === 3) {
                    difficultyText = 'Avanzada';
                }
                difficultyIndicator.textContent = 'Dificultad: ' + difficultyText;
                
                // Render question text (handle code blocks)
                if (q.text.includes('\`\`\`')) {
                    const parts = q.text.split('\`\`\`');
                    let html = '';
                    for (let i = 0; i < parts.length; i++) {
                        if (i % 2 === 0) {
                            html += parts[i];
                        } else {
                            html += '<div class="code-block"><pre>' + parts[i] + '</pre></div>';
                        }
                    }
                    questionText.innerHTML = html;
                } else {
                    questionText.textContent = q.text;
                }
                
                // Clear feedback
                feedbackContainer.className = 'feedback';
                feedbackContainer.style.display = 'none';
                
                // Render options
                optionsContainer.innerHTML = '';
                q.options.forEach((option, index) => {
                    const optionElement = document.createElement('label');
                    optionElement.className = 'option';
                    optionElement.innerHTML = 
                        '<input type="radio" name="option" value="' + option + '">' +
                        '<span class="option-label">' + option + '</span>';
                    optionsContainer.appendChild(optionElement);
                    
                    // Add event listener to enable submit button when option is selected
                    const radio = optionElement.querySelector('input');
                    radio.addEventListener('change', () => {
                        submitButton.disabled = false;
                    });
                });
            }
            
            // Update progress information
            function updateProgressInfo() {
                questionsRemainingEl.textContent = questionsRemaining;
                progressInfo.style.display = 'block';
            }
            
            // Show feedback for the previous answer
            function showFeedback(isCorrect, correctAnswer) {
                feedbackContainer.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
                feedbackContainer.innerHTML = isCorrect ? 
                    '<strong>¡Correcto!</strong> Buen trabajo.' : 
                    '<strong>Incorrecto.</strong> La respuesta correcta es: ' + correctAnswer;
                feedbackContainer.style.display = 'block';
            }
            
            // Show final results
            function showResults(result) {
                assessmentScreen.classList.add('hidden');
                resultScreen.classList.remove('hidden');
                
                correctAnswersEl.textContent = result.correctAnswers;
                totalQuestionsEl.textContent = result.totalQuestions;
                timeTakenEl.textContent = result.timeTaken;
                overallLevelEl.textContent = result.overallLevel;
                
                // Render skill profile
                skillProfileList.innerHTML = '';
                for (const category in result.skillProfile) {
                    const skillItem = document.createElement('div');
                    skillItem.className = 'skill-item';
                    skillItem.innerHTML = 
                        '<span>' + category.charAt(0).toUpperCase() + category.slice(1) + '</span>' +
                        '<span>' + result.skillProfile[category] + '</span>';
                    skillProfileList.appendChild(skillItem);
                }
            }
        }());
    </script>
</body>
</html>`;
    }
}