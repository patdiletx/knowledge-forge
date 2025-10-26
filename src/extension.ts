import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AulaWebviewProvider } from './webview/AulaWebviewProvider';
import { TaskLearningPanel } from './webview/TaskLearningPanel';
import { ConfigService } from './services/ConfigService';
import { RoadmapTreeProvider } from './tree/RoadmapTreeProvider';
import { ProjectStateService } from './services/ProjectStateService';
import { RoadmapService } from './services/RoadmapService';
import { ProjectGeneratorService } from './services/ProjectGeneratorService';
import { CodeReviewService } from './services/CodeReviewService';
import { LearningResourcesService } from './services/LearningResourcesService';
import { StatusBarManager } from './ui/StatusBarManager';
import { DiagnosticManager } from './ui/DiagnosticManager';
import { NotificationManager } from './ui/NotificationManager';
import { BadgesService } from './services/BadgesService';
import { RefactorChallengeService } from './services/RefactorChallengeService';
import { SoundManager } from './ui/SoundManager';
import { ProjectStatusWebview } from './webview/ProjectStatusWebview';
import { BadgesWebview } from './webview/BadgesWebview';
import { DashboardWebview } from './webview/DashboardWebview';
import { AssessmentWebview } from './webview/AssessmentWebview';
import { MicroLearningService } from './services/MicroLearningService';
import { EducationalHintsService } from './services/EducationalHintsService';
import { LearningAnalyticsPanel } from './webview/LearningAnalyticsPanel';
import { SpacedRepetitionPanel } from './webview/SpacedRepetitionPanel';
import { GamificationPanel } from './webview/GamificationPanel';
import { CommunitySolutionsPanel } from './webview/CommunitySolutionsPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('KnowledgeForge está activa!');

    // Inicializar UI Managers
    StatusBarManager.initialize(context);
    DiagnosticManager.initialize(context);

    // Crear Tree View Provider
    const roadmapTreeProvider = new RoadmapTreeProvider(context);
    const treeView = vscode.window.createTreeView('knowledgeforgeRoadmap', {
        treeDataProvider: roadmapTreeProvider
    });

    // Suscribirse a cambios de estado para actualizar UI
    context.subscriptions.push(
        ProjectStateService.onDidChangeState(state => {
            roadmapTreeProvider.refresh();
            StatusBarManager.update(context);
        })
    );

    // Detectar si el workspace actual es un proyecto de KnowledgeForge
    if (ProjectStateService.isKnowledgeForgeProject()) {
        // Cargar el estado del proyecto
        ProjectStateService.loadProjectState(context).then(state => {
            if (state) {
                // Refrescar UI
                roadmapTreeProvider.refresh();
                StatusBarManager.update(context);

                // Mostrar mensaje de bienvenida
                const currentTask = ProjectStateService.getCurrentTask(state);
                const progress = ProjectStateService.getProgress(state);

                if (currentTask) {
                    const message = `📚 Proyecto KnowledgeForge cargado\n\n` +
                        `Progreso: ${progress.completed}/${progress.total} tareas (${progress.percentage}%)\n\n` +
                        `Tarea actual: ${currentTask.task}`;

                    vscode.window.showInformationMessage(
                        message,
                        'Ver Sidebar',
                        'Continuar'
                    ).then(action => {
                        if (action === 'Ver Sidebar') {
                            // Forzar mostrar la vista de KnowledgeForge
                            vscode.commands.executeCommand('workbench.view.extension.knowledgeforge');
                        }
                    });
                } else if (ProjectStateService.isProjectComplete(state)) {
                    vscode.window.showInformationMessage(
                        '🎉 ¡Felicidades! Has completado todas las tareas de tu roadmap.',
                        'Ver Progreso'
                    ).then(action => {
                        if (action === 'Ver Progreso') {
                            vscode.commands.executeCommand('knowledgeforge.showProjectStatus');
                        }
                    });
                }
            } else {
                console.warn('No se pudo cargar el estado del proyecto de KnowledgeForge');
            }
        }).catch(error => {
            console.error('Error al cargar estado del proyecto:', error);
        });
    }

    // Registrar el comando principal
    const openAulaCommand = vscode.commands.registerCommand('knowledgeforge.openAula', () => {
        AulaWebviewProvider.createOrShow(context.extensionUri, context);
    });

    // Comando para abrir Modo Aprendizaje (NUEVO - Dinámico e Interactivo)
    // Puede llamarse como openLearningMode(phaseIndex, taskIndex) o openLearningMode(roadmapId, phaseIndex, taskIndex)
    const openLearningModeCommand = vscode.commands.registerCommand('knowledgeforge.openLearningMode', async (...args: any[]) => {
        let roadmapId: string | undefined;
        let phaseIndex: number | undefined;
        let taskIndex: number | undefined;

        if (args.length === 3 && typeof args[0] === 'string') {
            roadmapId = args[0];
            phaseIndex = args[1];
            taskIndex = args[2];
        } else if (args.length >= 2) {
            // legacy
            phaseIndex = args[0];
            taskIndex = args[1];
        }
        const state = ProjectStateService.getState(context);
        if (!state || !state.projectInitialized) {
            vscode.window.showWarningMessage(
                'Necesitas tener un proyecto activo para usar el Modo Aprendizaje.',
                'Crear Proyecto'
            ).then(action => {
                if (action === 'Crear Proyecto') {
                    vscode.commands.executeCommand('knowledgeforge.openAula');
                }
            });
            return;
        }

        // Verificar API Key
        const hasApiKey = await ConfigService.hasApiKey(context);
        if (!hasApiKey) {
            const action = await vscode.window.showWarningMessage(
                'El Modo Aprendizaje requiere API Key para generar contenido dinámico con IA.',
                'Configurar API Key',
                'Más Tarde'
            );
            if (action === 'Configurar API Key') {
                await ConfigService.promptForApiKey(context);
            }
            return;
        }

        await TaskLearningPanel.createOrShow(context.extensionUri, context, phaseIndex, taskIndex, roadmapId);
    });

    // Comando para configurar API Key
    const configureApiKeyCommand = vscode.commands.registerCommand('knowledgeforge.configureApiKey', async () => {
        await ConfigService.promptForApiKey(context);
    });

    // Comando para cambiar el proveedor de IA
    const changeProviderCommand = vscode.commands.registerCommand('knowledgeforge.changeProvider', async () => {
        await ConfigService.changeProvider(context);
    });

    // Comando para iniciar la evaluación adaptativa
    const startAdaptiveAssessmentCommand = vscode.commands.registerCommand('knowledgeforge.startAdaptiveAssessment', async () => {
        AssessmentWebview.createOrShow(context.extensionUri, context);
    });

    // Comando para mostrar instrucciones de API Key
    const showApiKeyInstructionsCommand = vscode.commands.registerCommand('knowledgeforge.showApiKeyInstructions', () => {
        const instructions = ConfigService.getApiKeyInstructions();
        vscode.window.showInformationMessage(instructions, { modal: true });
    });

    // Comando para refrescar el Tree View
    const refreshRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.refreshRoadmap', () => {
        roadmapTreeProvider.refresh();
    });

    // Comando para generar un roadmap a partir de CV / texto y crear el proyecto
    const generateRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.generateRoadmap', async (skillSummary?: string) => {
        let experienceText: string | undefined;
        
        if (skillSummary) {
            // If we have a skill summary from the assessment, use it directly
            experienceText = skillSummary;
        } else {
            // Preguntar por el texto del CV (o pegar)
            experienceText = await vscode.window.showInputBox({
                prompt: 'Pega tu CV o describe tu experiencia profesional (puedes escribir o pegar un texto largo)',
                placeHolder: 'Ej: 3 años como desarrollador Node.js, 1 año usando React, experiencia en APIs REST, etc.',
                ignoreFocusOut: true,
                validateInput: (v) => (v && v.trim().length > 10) ? null : 'Escribe al menos 10 caracteres para que el análisis sea útil'
            });
        }

        if (!experienceText) {
            return;
        }

        // Verificar API Key (si no hay, ofrecer modo mock)
        const hasKey = await ConfigService.hasApiKey(context);
        let apiKey: string | undefined = undefined;

        if (!hasKey) {
            const useMock = await vscode.window.showQuickPick(['Usar modo MOCK (sin IA)', 'Configurar API Key ahora'], { placeHolder: 'No hay API Key configurada' });
            if (!useMock) return;
            if (useMock === 'Configurar API Key ahora') {
                const configured = await ConfigService.promptForApiKey(context);
                if (!configured) {
                    vscode.window.showInformationMessage('No se configuró API Key. Usando modo mock.');
                } else {
                    apiKey = await ConfigService.getApiKey(context);
                }
            }
        } else {
            apiKey = await ConfigService.getApiKey(context);
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generando roadmap personalizado...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: 'Analizando tu experiencia...' });
                const roadmap = await RoadmapService.generateRoadmap(experienceText, apiKey || '');

                // Preguntar dónde crear el proyecto
                const folderUri = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Seleccionar carpeta para crear el proyecto'
                });

                if (!folderUri || folderUri.length === 0) {
                    vscode.window.showWarningMessage('No se seleccionó carpeta. Operación cancelada.');
                    return;
                }

                const targetPath = folderUri[0].fsPath;

                progress.report({ message: 'Creando estructura del proyecto...' });
                await ProjectGeneratorService.generateProjectStructure(roadmap, targetPath, apiKey);

                // Inicializar estado del proyecto y guardarlo en .knowledgeforge/state.json
                const state = await ProjectStateService.initializeProject(context, roadmap, targetPath);

                // Guardar en workspaceState y notificar
                await ProjectStateService.saveState(context, state);

                vscode.window.showInformationMessage('Proyecto KnowledgeForge generado correctamente.', 'Abrir Proyecto').then(async (action) => {
                    if (action === 'Abrir Proyecto') {
                        // Abrir carpeta seleccionada como workspace (nota: en VS Code este comando puede abrir en la misma ventana)
                        await vscode.commands.executeCommand('vscode.openFolder', folderUri[0], true);
                    }
                });

                // Refresh UI
                roadmapTreeProvider.refresh();
                StatusBarManager.update(context);
            } catch (error) {
                vscode.window.showErrorMessage(`Error generando roadmap/proyecto: ${error}`);
            }
        });
    });

    // Comando para ver estado del proyecto
    const showProjectStatusCommand = vscode.commands.registerCommand('knowledgeforge.showProjectStatus', () => {
        const state = ProjectStateService.getState(context);
        if (!state) {
            vscode.window.showInformationMessage('No hay un proyecto activo. Genera un roadmap e inicializa un proyecto primero.');
            return;
        }

        ProjectStatusWebview.createOrShow(context.extensionUri, context);
    });

    // Comando para mostrar insignias
    const showBadgesCommand = vscode.commands.registerCommand('knowledgeforge.showBadges', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) {
            vscode.window.showInformationMessage('No hay un proyecto activo. Genera un roadmap e inicializa un proyecto primero.');
            return;
        }

        // Check for newly unlocked badges
        const newBadges = await BadgesService.checkAndUnlockBadges(context);
        
        BadgesWebview.createOrShow(context.extensionUri, context);
    });

    // Comando para mostrar dashboard
    const showDashboardCommand = vscode.commands.registerCommand('knowledgeforge.showDashboard', async () => {
        DashboardWebview.createOrShow(context.extensionUri, context);
    });

    // Comando para revisar tarea actual con IA
    const reviewTaskCommand = vscode.commands.registerCommand('knowledgeforge.reviewTask', async () => {
        const state = ProjectStateService.getState(context);
        if (!state || !state.projectInitialized) {
            vscode.window.showWarningMessage('No hay un proyecto activo. Inicializa un proyecto primero.');
            return;
        }

        // Verificar API Key
        const hasApiKey = await ConfigService.hasApiKey(context);
        if (!hasApiKey) {
            const action = await vscode.window.showWarningMessage(
                'Necesitas configurar tu API Key para usar el code review con IA.',
                'Configurar Ahora',
                'Cancelar'
            );

            if (action === 'Configurar Ahora') {
                const configured = await ConfigService.promptForApiKey(context);
                if (!configured) {
                    return;
                }
            } else {
                return;
            }
        }

        const apiKey = await ConfigService.getApiKey(context);
        if (!apiKey) {
            return;
        }

        // Ejecutar review
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Revisando tu código con IA...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: 'Analizando archivos del proyecto...' });

                const result = await CodeReviewService.reviewCurrentTask(context, apiKey);

                if (result) {
                    // Mostrar diagnósticos en el editor
                    if (state.projectPath && result.diagnostics) {
                        DiagnosticManager.updateDiagnostics(state.projectPath, result.diagnostics);
                    }

                    progress.report({ message: 'Generando feedback...' });
                    await CodeReviewService.showReviewResult(result, context);

                    // Refrescar tree view
                    roadmapTreeProvider.refresh();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error al revisar tarea: ${error}`);
            }
        });
    });

    // Comando para ver tarea actual
    const showCurrentTaskCommand = vscode.commands.registerCommand('knowledgeforge.showCurrentTask', () => {
        const state = ProjectStateService.getState(context);
        if (!state || !state.projectInitialized) {
            vscode.window.showInformationMessage('No hay un proyecto activo. Inicializa un proyecto primero.');
            return;
        }

        const currentTask = ProjectStateService.getCurrentTask(state);
        if (!currentTask) {
            vscode.window.showInformationMessage('¡Felicidades! Has completado todas las tareas.');
            return;
        }

        const message = `📍 **Tarea Actual**\n\n**Fase ${currentTask.phaseIndex + 1}:** ${currentTask.phase.title}\n\n**Tarea:** ${currentTask.task}\n\n${currentTask.phase.description || ''}`;

        vscode.window.showInformationMessage('Tarea Actual', { modal: true, detail: message });
    });

    // Comando para ver recursos de aprendizaje de la tarea actual
    const showLearningResourcesCommand = vscode.commands.registerCommand('knowledgeforge.showLearningResources', async () => {
        const state = ProjectStateService.getState(context);
        if (!state || !state.projectInitialized) {
            vscode.window.showInformationMessage('No hay un proyecto activo. Inicializa un proyecto primero.');
            return;
        }

        const currentTask = ProjectStateService.getCurrentTask(state);
        if (!currentTask) {
            vscode.window.showInformationMessage('¡Has completado todas las tareas!');
            return;
        }

        // Buscar el archivo de guía de la fase actual
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const phaseGuideFile = path.join(
            workspaceFolder.uri.fsPath,
            'docs',
            `Fase${currentTask.phaseIndex + 1}_Guia.md`
        );

        // Verificar si existe el archivo de guía
        if (fs.existsSync(phaseGuideFile)) {
            // Abrir el archivo de guía
            const doc = await vscode.workspace.openTextDocument(phaseGuideFile);
            await vscode.window.showTextDocument(doc, { preview: false });
        } else {
            // Si no existe, generar guía con IA
            const apiKey = await ConfigService.getApiKey(context);
            if (!apiKey) {
                vscode.window.showWarningMessage(
                    'No hay guías de estudio disponibles. Configura tu API Key y regenera el proyecto para obtener guías educativas.',
                    'Configurar API Key'
                ).then(action => {
                    if (action === 'Configurar API Key') {
                        vscode.commands.executeCommand('knowledgeforge.configureApiKey');
                    }
                });
                return;
            }

            // Generar guía rápida con IA
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generando guía de estudio...',
                cancellable: false
            }, async () => {
                try {
                    const guide = await LearningResourcesService.getCurrentTaskGuide(
                        currentTask.task,
                        currentTask.phase,
                        apiKey
                    );

                    // Mostrar en un documento nuevo (Markdown)
                    const doc = await vscode.workspace.openTextDocument({
                        content: guide,
                        language: '``'

                    });
                    await vscode.window.showTextDocument(doc, { preview: false });
                } catch (error) {
                    vscode.window.showErrorMessage(`Error generando guía: ${error}`);
                }
            });
        }
    });

    // Comando para mostrar estadísticas de micro-aprendizaje
    const showMicroLearningStatsCommand = vscode.commands.registerCommand('knowledgeforge.showMicroLearningStats', async () => {
        const stats = MicroLearningService.getLearningStatistics(context);
        
        const message = `
📊 **Estadísticas de Micro-Aprendizaje**

**Sesiones:** ${stats.totalSessions}
**Lecciones Completadas:** ${stats.completedLessons}/${stats.totalLessons} (${stats.totalLessons > 0 ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0}%)
**Tiempo Promedio por Lección:** ${stats.averageTimePerLesson.toFixed(1)} minutos
        `.trim();
        
        vscode.window.showInformationMessage(message, { modal: true });
    });

    // Comando para solicitar una pista educativa
    const requestEducationalHintCommand = vscode.commands.registerCommand('knowledgeforge.requestEducationalHint', async () => {
        // In a real implementation, this would determine the context and provide relevant hints
        const hints = EducationalHintsService.getHints(context, 1);
        if (hints.length > 0) {
            const hint = hints[0];
            await EducationalHintsService.showProgressiveHint(context, hint);
        } else {
            vscode.window.showInformationMessage('No hay pistas disponibles en este momento.');
        }
    });

    // Comando para mostrar el panel de analytics de aprendizaje
    const showLearningAnalyticsCommand = vscode.commands.registerCommand('knowledgeforge.showLearningAnalytics', () => {
        LearningAnalyticsPanel.createOrShow(context.extensionUri, context);
    });
    
    // Comando para mostrar el panel de repetición espaciada
    const showSpacedRepetitionCommand = vscode.commands.registerCommand('knowledgeforge.showSpacedRepetition', () => {
        SpacedRepetitionPanel.createOrShow(context.extensionUri, context);
    });
    
    // Comando para mostrar el panel de gamificación
    const showGamificationCommand = vscode.commands.registerCommand('knowledgeforge.showGamification', () => {
        GamificationPanel.createOrShow(context.extensionUri, context);
    });
    
    // Comando para mostrar el panel de soluciones comunitarias
    const showCommunitySolutionsCommand = vscode.commands.registerCommand('knowledgeforge.showCommunitySolutions', (taskId?: string, roadmapId?: string) => {
        CommunitySolutionsPanel.createOrShow(context.extensionUri, context, taskId, roadmapId);
    });

    context.subscriptions.push(
    treeView,
        openAulaCommand,
        openLearningModeCommand,
        configureApiKeyCommand,
        changeProviderCommand,
        showApiKeyInstructionsCommand,
        refreshRoadmapCommand,
        generateRoadmapCommand,
        showProjectStatusCommand,
        showBadgesCommand,
        showDashboardCommand,
        reviewTaskCommand,
        showCurrentTaskCommand,
        showLearningResourcesCommand,
        showMicroLearningStatsCommand,
        requestEducationalHintCommand,
        startAdaptiveAssessmentCommand,
        showLearningAnalyticsCommand,
        showSpacedRepetitionCommand,
        showGamificationCommand,
        showCommunitySolutionsCommand
    );

    // Comando para compartir/exportar el progreso del roadmap activo
    const shareProgressCommand = vscode.commands.registerCommand('knowledgeforge.shareProgress', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) {
            vscode.window.showInformationMessage('No hay proyecto activo para compartir.');
            return;
        }

        // Build export object for active roadmap
        let exportObj: any = { project: state.projectPath || 'workspace', createdAt: state.createdAt, totalXp: state.totalXp };
        if (state.roadmaps && state.activeRoadmapId) {
            const active = state.roadmaps.find(r => r.id === state.activeRoadmapId) || state.roadmaps[0];
            exportObj.roadmap = active;
        } else {
            exportObj.roadmap = {
                roadmap: state.roadmap,
                currentPhaseIndex: state.currentPhaseIndex,
                currentTaskIndex: state.currentTaskIndex,
                tasks: state.tasks
            };
        }

        const exportJson = JSON.stringify(exportObj, null, 2);

        // Copy to clipboard
        await vscode.env.clipboard.writeText(exportJson);
        const save = await vscode.window.showInformationMessage('El progreso se copió al portapapeles. ¿Deseas guardar un archivo JSON?', 'Sí', 'No');
        if (save === 'Sí') {
            const uri = await vscode.window.showSaveDialog({ filters: { 'JSON': ['json'] }, defaultUri: vscode.Uri.file(path.join((vscode.workspace.workspaceFolders?.[0]?.uri.fsPath) || '', 'roadmap-progress.json')) });
            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(exportJson, 'utf8'));
                vscode.window.showInformationMessage('Progreso guardado en: ' + uri.fsPath);
            }
        }
    });

    context.subscriptions.push(shareProgressCommand);

    // Comando para activar un roadmap (multi-roadmap)
    const activateRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.activateRoadmap', async (roadmapId: string) => {
        const state = ProjectStateService.getState(context);
        if (!state || !state.roadmaps) return;
        state.activeRoadmapId = roadmapId;
        await ProjectStateService.saveState(context, state);
        roadmapTreeProvider.refresh();
        StatusBarManager.update(context);
    });

    context.subscriptions.push(activateRoadmapCommand);

    // CRUD commands for roadmaps
    const listRoadmapsCommand = vscode.commands.registerCommand('knowledgeforge.listRoadmaps', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) {
            vscode.window.showInformationMessage('No hay proyecto activo');
            return;
        }

        const roadmaps = ProjectStateService.listRoadmaps(state);
        if (roadmaps.length === 0) {
            vscode.window.showInformationMessage('No hay roadmaps disponibles');
            return;
        }

        const items = roadmaps.map(r => ({ label: r.title || '(Sin título)', description: `${r.tasks.filter(t=>t.completed).length}/${r.tasks.length}`, id: r.id }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Selecciona un roadmap para activar' });
        if (pick) {
            await ProjectStateService.setActiveRoadmap(context, pick.id);
            roadmapTreeProvider.refresh();
            StatusBarManager.update(context);
        }
    });

    const createRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.createRoadmap', async () => {
        // Ask for title
        const title = await vscode.window.showInputBox({ prompt: 'Título del nuevo roadmap', placeHolder: 'p. ej. Roadmap - Backend Avanzado' });
        if (!title) return;

        // Ask whether to generate with IA or use template
        const choice = await vscode.window.showQuickPick(['Generar con IA', 'Crear plantilla vacía'], { placeHolder: 'Cómo quieres crear el roadmap?' });
        if (!choice) return;

        let roadmap: any[] = [];
        if (choice === 'Generar con IA') {
            // Ask for brief profile text
            const profile = await vscode.window.showInputBox({ prompt: 'Describe brevemente la experiencia / objetivo para generar el roadmap', placeHolder: 'Ej: 2 años Node.js, quiere especializarse en microservicios' });
            if (!profile) return;
            const apiKey = await ConfigService.getApiKey(context);
            if (!apiKey) {
                vscode.window.showWarningMessage('No hay API Key configurada. No se puede generar con IA.');
                return;
            }
            roadmap = await RoadmapService.generateRoadmap(profile, apiKey as string);
        } else {
            // Simple empty template
            roadmap = [
                { title: 'Fase 1: Introducción', description: 'Descripción', tasks: ['Tarea 1', 'Tarea 2'], duration: '2 semanas' }
            ];
        }

        const instance = await ProjectStateService.createRoadmap(context, title, roadmap);
        if (instance) {
            vscode.window.showInformationMessage('Roadmap creado y activado: ' + instance.title);
            roadmapTreeProvider.refresh();
            StatusBarManager.update(context);
        }
    });

    const renameRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.renameRoadmap', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) return;
        const items = ProjectStateService.listRoadmaps(state).map(r => ({ label: r.title || '(Sin título)', id: r.id }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Selecciona roadmap a renombrar' });
        if (!pick) return;
        const newTitle = await vscode.window.showInputBox({ prompt: 'Nuevo título', value: pick.label });
        if (!newTitle) return;
        const ok = await ProjectStateService.renameRoadmap(context, pick.id, newTitle);
        if (ok) { roadmapTreeProvider.refresh(); vscode.window.showInformationMessage('Renombrado'); }
    });

    const cloneRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.cloneRoadmap', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) return;
        const items = ProjectStateService.listRoadmaps(state).map(r => ({ label: r.title || '(Sin título)', id: r.id }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Selecciona roadmap a clonar' });
        if (!pick) return;
        const newTitle = await vscode.window.showInputBox({ prompt: 'Título de la copia', value: (pick.label + ' (copia)') });
        if (!newTitle) return;
        const clone = await ProjectStateService.cloneRoadmap(context, pick.id, newTitle);
        if (clone) { roadmapTreeProvider.refresh(); StatusBarManager.update(context); vscode.window.showInformationMessage('Copiado'); }
    });

    const deleteRoadmapCommand = vscode.commands.registerCommand('knowledgeforge.deleteRoadmap', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) return;
        const items = ProjectStateService.listRoadmaps(state).map(r => ({ label: r.title || '(Sin título)', id: r.id }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Selecciona roadmap a eliminar' });
        if (!pick) return;
        const confirm = await vscode.window.showQuickPick(['Sí', 'No'], { placeHolder: `Confirmar eliminación de ${pick.label}?` });
        if (confirm !== 'Sí') return;
        const ok = await ProjectStateService.deleteRoadmap(context, pick.id);
        if (ok) { roadmapTreeProvider.refresh(); StatusBarManager.update(context); vscode.window.showInformationMessage('Eliminado'); }
    });

    context.subscriptions.push(listRoadmapsCommand, createRoadmapCommand, renameRoadmapCommand, cloneRoadmapCommand, deleteRoadmapCommand);

    // Command to generate next phases for active roadmap
    const generateNextPhaseCommand = vscode.commands.registerCommand('knowledgeforge.generateNextPhase', async () => {
        const state = ProjectStateService.getState(context);
        if (!state) { vscode.window.showInformationMessage('No hay proyecto activo'); return; }

        const activeId = state.activeRoadmapId || (state.roadmaps && state.roadmaps[0]?.id);
        if (!activeId) { vscode.window.showInformationMessage('No hay roadmap activo'); return; }

        const countStr = await vscode.window.showInputBox({ prompt: '¿Cuántas fases generar ahora?', value: '1' });
        if (!countStr) return;
        const count = parseInt(countStr, 10) || 1;

        // Determine start index from active roadmap
        const active = state.roadmaps?.find(r => r.id === activeId);
        const start = active ? active.roadmap.length : 0;

        const apiKey = await ConfigService.getApiKey(context);
        if (!apiKey) { vscode.window.showWarningMessage('Necesitas configurar API Key para generar contenido con IA'); return; }

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generando fases del roadmap...' }, async (progress) => {
            try {
                const newPhases = await RoadmapService.generateRoadmapPartial('Contexto: generar fases adicionales', apiKey, start, count);
                if (!newPhases || newPhases.length === 0) {
                    vscode.window.showInformationMessage('No se generaron fases');
                    return;
                }

                const ok = await ProjectStateService.appendPhasesToRoadmap(context, activeId, newPhases as any);
                if (ok) {
                    vscode.window.showInformationMessage(`Se agregaron ${newPhases.length} fase(s) al roadmap activo`);
                    roadmapTreeProvider.refresh();
                } else {
                    vscode.window.showErrorMessage('Error agregando fases al roadmap');
                }
            } catch (error) {
                vscode.window.showErrorMessage('Error generando fases: ' + error);
            }
        });
    });

    context.subscriptions.push(generateNextPhaseCommand);
}

export function deactivate() {}
