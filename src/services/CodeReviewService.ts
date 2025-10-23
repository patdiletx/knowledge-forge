import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIServiceFactory } from './AIServiceFactory';
import { ProjectStateService, ProjectState } from './ProjectStateService';
import { BadgesService } from './BadgesService';
import { RefactorChallengeService } from './RefactorChallengeService';

export interface Diagnostic {
    file: string;
    line: number;
    message: string;
    severity: 'Error' | 'Warning' | 'Information' | 'Hint';
}

/**
 * Resultado del code review
 */
export interface CodeReviewResult {
    approved: boolean;
    feedback: string;
    diagnostics: Diagnostic[];
    nextSteps?: string;
    xp?: number; // Puntos de experiencia otorgados si se aprueba
    refactorChallenge?: { 
        description: string;
        code: string; 
    };
}

/**
 * Servicio para realizar code review usando IA
 */
export class CodeReviewService {
    /**
     * Revisa el código actual y genera feedback
     */
    public static async reviewCurrentTask(
        context: vscode.ExtensionContext,
        apiKey: string
    ): Promise<CodeReviewResult | undefined> {
        const state = ProjectStateService.getState(context);

        if (!state || !state.projectInitialized) {
            vscode.window.showWarningMessage('No hay un proyecto activo. Inicializa un proyecto primero.');
            return undefined;
        }

        const currentTask = ProjectStateService.getCurrentTask(state);
        if (!currentTask) {
            vscode.window.showInformationMessage('¡Felicidades! Has completado todas las tareas del roadmap.');
            return undefined;
        }

        // Recopilar archivos del proyecto
        const projectFiles = await this.collectProjectFiles(state.projectPath!);

        if (projectFiles.length === 0) {
            // Si no hay archivos, dar guía de inicio
            return this.generateStarterGuidance(currentTask, state, apiKey);
        }

        // Generar review con IA
        const aiService = AIServiceFactory.createService(apiKey);
        const prompt = this.buildCodeReviewPrompt(currentTask, state, projectFiles);

        try {
            const response = await aiService.generateContent(prompt);
            const result = this.parseCodeReviewResponse(response);
            
            // Asegurar que el resultado tenga la estructura correcta
            if (result && typeof result === 'object') {
                return {
                    approved: !!result.approved,
                    feedback: result.feedback || 'No feedback provided',
                    diagnostics: Array.isArray(result.diagnostics) ? result.diagnostics : [],
                    nextSteps: result.nextSteps || 'No next steps provided',
                    xp: result.xp || 0,
                    refactorChallenge: result.refactorChallenge || undefined
                };
            }
            
            // Si la respuesta no tiene el formato esperado, usar un valor por defecto
            return {
                approved: false,
                feedback: 'La respuesta de la IA no tiene el formato esperado',
                diagnostics: [],
                nextSteps: 'Por favor, inténtalo nuevamente'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error al generar code review: ' + errorMessage);
        }
    }

    /**
     * Genera guía de inicio con recursos educativos cuando no hay código
     */
    private static async generateStarterGuidance(
        currentTask: { phase: any; task: string; phaseIndex: number; taskIndex: number },
        state: ProjectState,
        apiKey: string
    ): Promise<CodeReviewResult> {
        try {
            const aiService = AIServiceFactory.createService(apiKey);
            const prompt = this.buildStarterGuidancePrompt(currentTask, state);

            const response = await aiService.generateContent(prompt);
            const parsed = this.parseStarterGuidanceResponse(response);

            return parsed;
        } catch (error) {
            // Fallback si la IA falla
            return {
                approved: false,
                feedback: 'Aún no has empezado a trabajar en esta tarea. ¡Es hora de comenzar!\n\nTarea actual: ' + currentTask.task + '\nFase: ' + currentTask.phase.title,
                diagnostics: [],
                nextSteps: 'Empieza a escribir código para esta tarea y luego usa "Revisar Tarea" nuevamente para obtener feedback.'
            };
        }
    }

    /**
     * Construye el prompt para la guía de inicio
     */
    private static buildStarterGuidancePrompt(
        currentTask: { phase: any; task: string; phaseIndex: number; taskIndex: number },
        state: ProjectState
    ): string {
        const progress = ProjectStateService.getProgress(state);
        
        return `Eres un mentor experto en programación. Un estudiante necesita ayuda para comenzar una tarea.

**TAREA ACTUAL:**
Fase: ${currentTask.phase.title}
Tarea: ${currentTask.task}
Descripción de fase: ${currentTask.phase.description || 'Sin descripción'}

**PROGRESO GENERAL:**
${progress.completed}/${progress.total} tareas completadas

**INSTRUCCIONES:**
Proporciona una guía clara para comenzar esta tarea. Debes responder en formato JSON con esta estructura:

{
  "approved": false,
  "feedback": "Feedback general sobre cómo comenzar esta tarea",
  "diagnostics": [],
  "nextSteps": "Qué debería hacer el estudiante ahora",
  "xp": 0,
  "refactorChallenge": null
}

**REGLAS:**
- ⚠️ No uses markdown ni formatos de texto enriquecido
- ⚠️ No necesita ser perfecto, solo cumplir con la tarea
- **XP**: Si approved es true, asigna puntos de experiencia (entre 50 y 500) basados en la complejidad de la tarea. Si es false, xp debe ser 0
- **DIAGNOSTICS**: Proporciona diagnósticos específicos apuntando a líneas de código concretas. La severidad puede ser 'Error', 'Warning', 'Information'
- **REFACTOR CHALLENGE**: Si approved es true, puedes proponer opcionalmente un pequeño desafío de refactorización sobre el código entregado para ganar XP extra
`;
    }

    /**
     * Parsea la respuesta de guía de inicio
     */
    private static parseStarterGuidanceResponse(response: string): CodeReviewResult {
        try {
            // Clean the response to extract only the JSON part
            let cleanResponse = response.trim();
            
            // Remove any markdown code block indicators
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.substring(7);
            }
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.substring(3);
            }
            if (cleanResponse.endsWith('```')) {
                cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
            }
            
            // Parse the JSON
            const parsed = JSON.parse(cleanResponse);
            
            return {
                approved: parsed.approved,
                feedback: parsed.feedback,
                diagnostics: parsed.diagnostics || [],
                nextSteps: parsed.nextSteps,
                xp: parsed.xp,
                refactorChallenge: parsed.refactorChallenge
            };
        } catch (error) {
            console.error('Error parsing starter guidance response:', error);
            throw new Error('Failed to parse AI response');
        }
    }

    /**
     * Recopila los archivos del proyecto
     */
    private static async collectProjectFiles(projectPath: string): Promise<Array<{ path: string; content: string }>> {
        const files: Array<{ path: string; content: string }> = [];
        
        // Function to recursively read directory
        const readDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip node_modules and other large directories
                    if (!['node_modules', '.git', 'out', 'dist'].includes(entry.name)) {
                        readDir(fullPath);
                    }
                } else {
                    // Only read text files (avoid binary files)
                    if (['.ts', '.js', '.json', '.md', '.txt', '.html', '.css'].some(ext => entry.name.endsWith(ext))) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            files.push({
                                path: path.relative(projectPath, fullPath),
                                content: content
                            });
                        } catch (error) {
                            console.warn('Could not read file:', fullPath);
                        }
                    }
                }
            }
        };
        
        try {
            readDir(projectPath);
        } catch (error) {
            console.error('Error collecting project files:', error);
        }
        
        return files;
    }

    /**
     * Construye el prompt para el code review
     */
    private static buildCodeReviewPrompt(
        currentTask: { phase: any; task: string; phaseIndex: number; taskIndex: number },
        state: ProjectState,
        projectFiles: Array<{ path: string; content: string }>
    ): string {
        const progress = ProjectStateService.getProgress(state);
        
        // Limit file content to avoid exceeding token limits
        let filesContent = '';
        for (const file of projectFiles) {
            if (filesContent.length < 30000) { // Limit total content
                filesContent += '\n\n--- ' + file.path + ' ---\n' + file.content.substring(0, 5000); // Limit per file
            }
        }
        
        return 'Eres un mentor experto en programación haciendo code review. Un estudiante ha trabajado en una tarea y quiere recibir feedback.\n\n' +
            '**TAREA ACTUAL:**\n' +
            'Fase: ' + currentTask.phase.title + '\n' +
            'Tarea: ' + currentTask.task + '\n' +
            'Descripción de fase: ' + (currentTask.phase.description || 'Sin descripción') + '\n\n' +
            '**PROGRESO GENERAL:**\n' +
            progress.completed + '/' + progress.total + ' tareas completadas\n\n' +
            '**ARCHIVOS DEL PROYECTO:**\n' +
            filesContent + '\n\n' +
            '**INSTRUCCIONES:**\n' +
            'Analiza el código del estudiante y proporciona feedback constructivo. Debes responder en formato JSON con esta estructura:\n\n' +
            '{\n' +
            '  "approved": true/false,\n' +
            '  "feedback": "Feedback general sobre el trabajo realizado",\n' +
            '  "diagnostics": [\n' +
            '    {\n' +
            '      "file": "ruta/al/archivo.ts",\n' +
            '      "line": 10,\n' +
            '      "message": "Mensaje de feedback específico",\n' +
            '      "severity": "Warning"\n' +
            '    }\n' +
            '  ],\n' +
            '  "nextSteps": "Qué debería hacer el estudiante ahora",\n' +
            '  "xp": 100,\n' +
            '  "refactorChallenge": {\n' +
            '    "description": "(Opcional) Describe un desafío de refactorización para ganar XP extra. Ej: Reduce la complejidad de esta función.",\n' +
            '    "code": "(Opcional) El bloque de código exacto para el desafío"\n' +
            '  }\n' +
            '}\n\n' +
            '**REGLAS:**\n' +
            '- ⚠️ No uses markdown ni formatos de texto enriquecido\n' +
            '- ⚠️ No necesita ser perfecto, solo cumplir con la tarea\n' +
            '- **APPROVED**: Solo marca como aprobado si el código cumple con la tarea. Si hay mejoras importantes, marca como no aprobado\n' +
            '- **XP**: Si approved es true, asigna puntos de experiencia (entre 50 y 500) basados en la complejidad de la tarea. Si es false, xp debe ser 0\n' +
            '- **DIAGNOSTICS**: Proporciona diagnósticos específicos apuntando a líneas de código concretas. La severidad puede ser Error, Warning, Information\n' +
            '- **REFACTOR CHALLENGE**: Si approved es true, puedes proponer opcionalmente un pequeño desafío de refactorización sobre el código entregado para ganar XP extra\n';
    }

    /**
     * Parses the code review response from AI
     */
    private static parseCodeReviewResponse(response: string): CodeReviewResult {
        try {
            // Clean the response to extract only the JSON part
            let cleanResponse = response.trim();
            
            // Remove any markdown code block indicators
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.substring(7);
            }
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.substring(3);
            }
            if (cleanResponse.endsWith('```')) {
                cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
            }
            
            // Parse the JSON
            const parsed = JSON.parse(cleanResponse);
            
            return {
                approved: parsed.approved,
                feedback: parsed.feedback,
                diagnostics: parsed.diagnostics || [],
                nextSteps: parsed.nextSteps,
                xp: parsed.xp,
                refactorChallenge: parsed.refactorChallenge
            };
        } catch (error) {
            console.error('Error parsing code review response:', error);
            throw new Error('Failed to parse AI response');
        }
    }

    /**
     * Shows the review result to the user and updates task status if approved
     */
    public static async showReviewResult(
        result: CodeReviewResult,
        context: vscode.ExtensionContext
    ): Promise<void> {
        if (result.approved) {
            // Update task status
            const hasNext = await ProjectStateService.completeCurrentTask(
                context, 
                result.feedback,
                result.xp
            );

            // Check for newly unlocked badges
            const newBadges = await BadgesService.checkAndUnlockBadges(context);

            // Check if we should offer a refactor challenge
            if (result.refactorChallenge) {
                const shouldAttempt = await RefactorChallengeService.showRefactorChallenge({
                    id: 'challenge-' + Date.now(),
                    title: 'Desafío de Refactorización',
                    description: result.refactorChallenge.description || 'Mejora el código aplicando buenas prácticas',
                    initialCode: result.refactorChallenge.code,
                    goal: 'Refactorizar el código para mejorarlo',
                    hints: ['Considera la legibilidad', 'Reduce la complejidad', 'Aplica principios SOLID'],
                    xpReward: 50,
                    successCriteria: ['Código más limpio', 'Mejor estructura']
                });

                if (shouldAttempt) {
                    // Create a temporary document with the code
                    const document = await vscode.workspace.openTextDocument({
                        content: result.refactorChallenge.code,
                        language: 'javascript' // Could be dynamic based on project
                    });
                    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
                    
                    vscode.window.showInformationMessage(
                        'Abierto el código para refactorizar. ¡Buena suerte!',
                        'Entendido'
                    );
                }
            }

            if (hasNext) {
                const newState = ProjectStateService.getState(context);
                if (newState) {
                    const nextTask = ProjectStateService.getCurrentTask(newState);
                    if (nextTask) {
                        vscode.window.showInformationMessage(
                            '✅ ¡Tarea aprobada! XP ganados: ' + (result.xp || 0) + '\nSiguiente: ' + nextTask.task,
                            'Continuar'
                        );
                    }
                }
            } else {
                // All tasks completed
                vscode.window.showInformationMessage(
                    '🎉 ¡Felicidades! Has completado todas las tareas del roadmap.',
                    'Ver Progreso'
                ).then(action => {
                    if (action === 'Ver Progreso') {
                        vscode.commands.executeCommand('knowledgeforge.showProjectStatus');
                    }
                });
            }
        } else {
            // Show feedback for improvement
            vscode.window.showWarningMessage(
                '📝 Feedback del code review:\n' + result.feedback,
                'Entendido'
            );
        }
    }
}
