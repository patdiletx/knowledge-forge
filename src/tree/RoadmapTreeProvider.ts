import * as vscode from 'vscode';
import { ProjectStateService, ProjectState, RoadmapInstance, TaskState } from '../services/ProjectStateService';
import { RoadmapPhase } from '../services/RoadmapService';

/**
 * Representa un item en el Tree View del roadmap
 */
export class RoadmapTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'roadmap' | 'phase' | 'task',
        public readonly roadmapId?: string,
        public readonly phaseIndex?: number,
        public readonly taskIndex?: number,
        public readonly completed?: boolean,
        public readonly isCurrent?: boolean
    ) {
        super(label, collapsibleState);

        // Configurar icono según el tipo y estado
        if (type === 'task') {
            if (completed) {
                this.iconPath = new vscode.ThemeIcon('check');
                this.contextValue = 'task-completed';
            } else if (isCurrent) {
                this.iconPath = new vscode.ThemeIcon('play');
                this.contextValue = 'task-current';
            } else {
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                this.contextValue = 'task-pending';
            }
        } else if (type === 'phase') {
            // Phase icon: highlight if current phase
            if (isCurrent) {
                this.iconPath = new vscode.ThemeIcon('star');
                this.contextValue = 'phase-current';
            } else {
                this.iconPath = new vscode.ThemeIcon('folder');
                this.contextValue = 'phase';
            }
        } else if (type === 'roadmap') {
            this.iconPath = new vscode.ThemeIcon('book');
            this.contextValue = 'roadmap';
        }

        // Añadir descripción para tareas
        if (type === 'task') {
            this.tooltip = completed ? 'Tarea completada' : 'Tarea pendiente';
        }
    }
}

/**
 * Provider para el Tree View del roadmap
 */
export class RoadmapTreeProvider implements vscode.TreeDataProvider<RoadmapTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RoadmapTreeItem | undefined | null | void> = new vscode.EventEmitter<RoadmapTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RoadmapTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RoadmapTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RoadmapTreeItem): Thenable<RoadmapTreeItem[]> {
        const state = ProjectStateService.getState(this.context);

        if (!state || !state.projectInitialized) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Root level - mostrar roadmaps (multi) o fases (legacy)
            if (state.roadmaps && state.roadmaps.length > 0) {
                return Promise.resolve(this.getRoadmapNodes(state));
            }

            // Legacy single roadmap
            return Promise.resolve(this.getRoadmapPhases(state));
        } else {
            // If the element is a roadmap node, show its phases
            if (element.type === 'roadmap' && element.roadmapId) {
                return Promise.resolve(this.getPhasesForRoadmap(state, element.roadmapId));
            }

            // Children of phase - mostrar tareas
            if (element.type === 'phase' && element.phaseIndex !== undefined) {
                if (element.roadmapId) {
                    // Multi-roadmap case
                    return Promise.resolve(this.getPhaseTasks(state, element.roadmapId, element.phaseIndex));
                } else {
                    // Legacy single roadmap case
                    return Promise.resolve(this.getPhaseTasksLegacy(state, element.phaseIndex));
                }
            }
        }

        return Promise.resolve([]);
    }

    /**
     * Devuelve nodos de roadmap (cada roadmap como entry root)
     */
    private getRoadmapNodes(state: ProjectState): RoadmapTreeItem[] {
        const items: RoadmapTreeItem[] = [];

        // Header with overall or active progress
        const progress = ProjectStateService.getProgress(state);
        const headerLabel = `Progreso: ${progress.completed}/${progress.total} (${progress.percentage}%)`;
        const headerItem = new RoadmapTreeItem(
            headerLabel,
            vscode.TreeItemCollapsibleState.None,
            'task'
        );
        headerItem.iconPath = new vscode.ThemeIcon('graph');
        headerItem.contextValue = 'progress';
        headerItem.command = {
            command: 'knowledgeforge.showDashboard',
            title: 'Ver Dashboard'
        };
        items.push(headerItem);

        // Roadmap entries
        (state.roadmaps || []).forEach((rm: RoadmapInstance) => {
            const completed = rm.tasks.filter(t => t.completed).length;
            const total = rm.tasks.length;
            const isActive = state.activeRoadmapId === rm.id;

            const label = isActive ? `📍 ${rm.title || 'Roadmap'} (${completed}/${total})` : `${rm.title || 'Roadmap'} (${completed}/${total})`;

            const item = new RoadmapTreeItem(
                label,
                vscode.TreeItemCollapsibleState.Collapsed,
                'roadmap',
                rm.id
            );

            // Add command to activate roadmap when clicked
            item.command = {
                command: 'knowledgeforge.activateRoadmap',
                title: 'Activar Roadmap',
                arguments: [rm.id]
            };

            item.description = `${completed}/${total} tareas`;
            items.push(item);
        });

        return items;
    }

    private getRoadmapPhases(state: ProjectState): RoadmapTreeItem[] {
        // legacy helper: build phases from legacy single roadmap
        const items: RoadmapTreeItem[] = [];
        const progress = ProjectStateService.getProgress(state);

        const headerLabel = `Progreso: ${progress.completed}/${progress.total} (${progress.percentage}%)`;
        const headerItem = new RoadmapTreeItem(headerLabel, vscode.TreeItemCollapsibleState.None, 'task');
        headerItem.iconPath = new vscode.ThemeIcon('graph');
        headerItem.contextValue = 'progress';
        headerItem.command = { command: 'knowledgeforge.showDashboard', title: 'Ver Dashboard' };
        items.push(headerItem);

        const roadmap = state.roadmap || [];
        const tasks = state.tasks || [];
        const currentPhaseIndex = state.currentPhaseIndex || 0;

        roadmap.forEach((phase, index) => {
            const phaseCompleted = tasks.filter(t => t.phaseIndex === index).every(t => t.completed);

            const label = phaseCompleted ? `✅ ${phase.title}` : currentPhaseIndex === index ? `📍 ${phase.title} (Actual)` : phase.title;

            const item = new RoadmapTreeItem(label, vscode.TreeItemCollapsibleState.Collapsed, 'phase', undefined, index, undefined, currentPhaseIndex === index);

            const phaseTasks = tasks.filter(t => t.phaseIndex === index);
            const completedTasks = phaseTasks.filter(t => t.completed).length;
            item.description = `${completedTasks}/${phaseTasks.length} tareas`;

            items.push(item);
        });

        return items;
    }

    private getPhasesForRoadmap(state: ProjectState, roadmapId: string): RoadmapTreeItem[] {
        const items: RoadmapTreeItem[] = [];
        const roadmap = (state.roadmaps || []).find(r => r.id === roadmapId);
        if (!roadmap) return items;

        roadmap.roadmap.forEach((phase, index) => {
            const phaseCompleted = roadmap.tasks.filter(t => t.phaseIndex === index).every(t => t.completed);
            const isCurrent = state.activeRoadmapId === roadmapId && roadmap.currentPhaseIndex === index;

            const label = phaseCompleted ? `✅ ${phase.title}` : isCurrent ? `📍 ${phase.title} (Actual)` : phase.title;

            const item = new RoadmapTreeItem(label, vscode.TreeItemCollapsibleState.Collapsed, 'phase', roadmapId, index, undefined, isCurrent);
            const phaseTasks = roadmap.tasks.filter(t => t.phaseIndex === index);
            const completedTasks = phaseTasks.filter(t => t.completed).length;
            item.description = `${completedTasks}/${phaseTasks.length} tareas`;

            items.push(item);
        });

        return items;
    }

    private getPhaseTasks(state: ProjectState, roadmapId: string, phaseIndex: number): RoadmapTreeItem[] {
        const items: RoadmapTreeItem[] = [];
        const roadmap = (state.roadmaps || []).find(r => r.id === roadmapId);
        if (!roadmap) return items;

        const phaseData = roadmap.roadmap[phaseIndex];
        if (!phaseData) return items;

        phaseData.tasks.forEach((task, taskIndex) => {
            // Find task state
            const taskState = roadmap.tasks.find((t: TaskState) => t.phaseIndex === phaseIndex && t.taskIndex === taskIndex);

            const completed = taskState?.completed || false;

            const isCurrent = state.activeRoadmapId === roadmapId && roadmap.currentPhaseIndex === phaseIndex && roadmap.currentTaskIndex === taskIndex;

            const label = completed ? `✅ ${task}` : isCurrent ? `▶️ ${task} (Actual)` : task;

            const item = new RoadmapTreeItem(label, vscode.TreeItemCollapsibleState.None, 'task', roadmapId, phaseIndex, taskIndex, completed, isCurrent);

            // Add command to open learning mode for this task
            if (!completed) {
                item.command = {
                    command: 'knowledgeforge.openLearningMode',
                    title: 'Abrir Modo Aprendizaje',
                    arguments: [roadmapId, phaseIndex, taskIndex]
                };
            }

            items.push(item);
        });

        return items;
    }

    private getPhaseTasksLegacy(state: ProjectState, phaseIndex: number): RoadmapTreeItem[] {
        const items: RoadmapTreeItem[] = [];
        const roadmap = state.roadmap || [];
        const tasks = state.tasks || [];
        
        if (phaseIndex >= roadmap.length) return items;

        const phaseData = roadmap[phaseIndex];
        if (!phaseData) return items;

        phaseData.tasks.forEach((task, taskIndex) => {
            // Find task state
            const taskState = tasks.find((t: TaskState) => t.phaseIndex === phaseIndex && t.taskIndex === taskIndex);

            const completed = taskState?.completed || false;
            const isCurrent = state.currentPhaseIndex === phaseIndex && state.currentTaskIndex === taskIndex;

            const label = completed ? `✅ ${task}` : isCurrent ? `▶️ ${task} (Actual)` : task;

            const item = new RoadmapTreeItem(label, vscode.TreeItemCollapsibleState.None, 'task', undefined, phaseIndex, taskIndex, completed, isCurrent);

            // Add command to open learning mode for this task
            if (!completed) {
                item.command = {
                    command: 'knowledgeforge.openLearningMode',
                    title: 'Abrir Modo Aprendizaje',
                    arguments: [undefined, phaseIndex, taskIndex]
                };
            }

            items.push(item);
        });

        return items;
    }
}