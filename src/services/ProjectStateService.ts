import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RoadmapPhase } from './RoadmapService';
import { UserStatsService } from './UserStatsService';

/**
 * Representa el estado de una tarea dentro del roadmap
 */
export interface TaskState {
    phaseIndex: number;
    taskIndex: number;
    completed: boolean;
    feedback?: string;
    completedAt?: Date;
    xp?: number; // Puntos de experiencia ganados por esta tarea
}

/**
 * Estado completo del proyecto del usuario
 */
export interface ProjectState {
    // Legacy single-roadmap fields (kept for backwards compatibility)
    roadmap?: RoadmapPhase[];
    currentPhaseIndex?: number;
    currentTaskIndex?: number;
    tasks?: TaskState[];

    // New multi-roadmap support
    roadmaps?: RoadmapInstance[];
    activeRoadmapId?: string;

    projectInitialized: boolean;
    projectPath?: string;
    createdAt: Date;
    lastUpdated: Date;
    totalXp: number; // Total de puntos de experiencia del usuario
    unlockedBadges: string[]; // Nombres de los logros desbloqueados
}

/**
 * Representa una instancia de roadmap para soportar múltiples caminos en paralelo
 */
export interface RoadmapInstance {
    id: string;
    title?: string;
    roadmap: RoadmapPhase[];
    currentPhaseIndex: number;
    currentTaskIndex: number;
    tasks: TaskState[];
    createdAt: Date;
    lastUpdated: Date;
    totalXp: number;
    unlockedBadges: string[];
}

/**
 * Servicio para gestionar el estado del proyecto del usuario
 * Usa workspaceState para persistencia
 */
export class ProjectStateService {
    private static readonly STATE_KEY = 'knowledgeforge.projectState';
    private static readonly STATE_DIR = '.knowledgeforge';
    private static readonly STATE_FILE = 'state.json';

    private static _onDidChangeState = new vscode.EventEmitter<ProjectState | undefined>();
    public static readonly onDidChangeState: vscode.Event<ProjectState | undefined> = this._onDidChangeState.event;

    /**
     * Obtiene el estado actual del proyecto
     * Primero intenta desde workspaceState, si no existe, carga desde archivo
     */
    public static getState(context: vscode.ExtensionContext): ProjectState | undefined {
        // Intentar obtener desde workspaceState
        let state = context.workspaceState.get<ProjectState>(this.STATE_KEY);

        // Si no existe en workspaceState, intentar cargar desde archivo
        if (!state) {
            state = this.loadStateFromFile();
            // Si se cargó desde archivo, guardarlo en workspaceState para futuros accesos
            if (state) {
                context.workspaceState.update(this.STATE_KEY, state);
            }
        }

        return state;
    }

    /**
     * Carga el estado del proyecto si existe en el workspace actual
     * Útil para cuando se abre un proyecto existente
     */
    public static async loadProjectState(context: vscode.ExtensionContext): Promise<ProjectState | undefined> {
        const state = this.loadStateFromFile();
        if (state) {
            // Guardar en workspaceState
            await context.workspaceState.update(this.STATE_KEY, state);
        }
        return state;
    }

    /**
     * Guarda el estado del proyecto en workspaceState Y en archivo
     */
    public static async saveState(context: vscode.ExtensionContext, state: ProjectState): Promise<void> {
        state.lastUpdated = new Date();

        // Guardar en workspaceState (para el workspace actual)
        await context.workspaceState.update(this.STATE_KEY, state);

        // Guardar también en archivo dentro del proyecto
        await this.saveStateToFile(state);
        
        // Actualizar estadísticas del usuario
        await UserStatsService.updateStats(context, state);

        // Notificar a los suscriptores que el estado ha cambiado
        this._onDidChangeState.fire(state);
    }

    /**
     * Guarda el estado en un archivo dentro del proyecto
     */
    private static async saveStateToFile(state: ProjectState): Promise<void> {
        try {
            // Obtener la ruta del workspace actual
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return; // No hay workspace abierto
            }

            const workspacePath = workspaceFolder.uri.fsPath;
            const stateDir = path.join(workspacePath, this.STATE_DIR);
            const stateFile = path.join(stateDir, this.STATE_FILE);

            // Crear directorio .knowledgeforge si no existe
            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }

            // Guardar estado como JSON
            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

            // También crear .gitignore para no versionar el estado local
            const gitignorePath = path.join(stateDir, '.gitignore');
            if (!fs.existsSync(gitignorePath)) {
                fs.writeFileSync(gitignorePath, 'state.json\n');
            }
        } catch (error) {
            console.error('Error guardando estado en archivo:', error);
            // No lanzar error, es un fallback
        }
    }

    /**
     * Carga el estado desde archivo si existe
     */
    private static loadStateFromFile(): ProjectState | undefined {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return undefined;
            }

            const workspacePath = workspaceFolder.uri.fsPath;
            const stateFile = path.join(workspacePath, this.STATE_DIR, this.STATE_FILE);

            if (!fs.existsSync(stateFile)) {
                return undefined;
            }

            const stateJson = fs.readFileSync(stateFile, 'utf-8');
            const state: ProjectState = JSON.parse(stateJson);

            // Convertir strings de fecha a objetos Date
            if (state.createdAt) state.createdAt = new Date(state.createdAt);
            if (state.lastUpdated) state.lastUpdated = new Date(state.lastUpdated);

            // Legacy tasks
            if (state.tasks) {
                state.tasks.forEach(task => {
                    if (task.completedAt) {
                        task.completedAt = new Date(task.completedAt as any);
                    }
                });
            }

            // If multi-roadmaps exist, normalize dates inside each instance
            if ((state as any).roadmaps) {
                (state as any).roadmaps.forEach((rm: any) => {
                    if (rm.createdAt) rm.createdAt = new Date(rm.createdAt);
                    if (rm.lastUpdated) rm.lastUpdated = new Date(rm.lastUpdated);
                    if (rm.tasks) {
                        rm.tasks.forEach((t: any) => {
                            if (t.completedAt) t.completedAt = new Date(t.completedAt);
                        });
                    }
                });
            }

            return state;
        } catch (error) {
            console.error('Error cargando estado desde archivo:', error);
            return undefined;
        }
    }

    /**
     * Verifica si el workspace actual es un proyecto de KnowledgeForge
     */
    public static isKnowledgeForgeProject(): boolean {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return false;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const stateFile = path.join(workspacePath, this.STATE_DIR, this.STATE_FILE);
        const roadmapFile = path.join(workspacePath, 'ROADMAP.md');

        return fs.existsSync(stateFile) || fs.existsSync(roadmapFile);
    }

    /**
     * Inicializa un nuevo estado de proyecto
     */
    public static initializeNewState(roadmap: RoadmapPhase[], projectPath: string): ProjectState {
        return {
            roadmap,
            currentPhaseIndex: 0,
            currentTaskIndex: 0,
            tasks: this.initializeTaskStates(roadmap),
            projectInitialized: true,
            projectPath,
            createdAt: new Date(),
            lastUpdated: new Date(),
            totalXp: 0,
            unlockedBadges: [] // Initialize with empty array
        };
    }

    /**
     * Inicializa los estados de las tareas
     */
    private static initializeTaskStates(roadmap: RoadmapPhase[]): TaskState[] {
        const tasks: TaskState[] = [];
        
        roadmap.forEach((phase, phaseIndex) => {
            phase.tasks.forEach((_, taskIndex) => {
                tasks.push({
                    phaseIndex,
                    taskIndex,
                    completed: false
                });
            });
        });
        
        return tasks;
    }

    /**
     * Inicializa un nuevo proyecto con un roadmap
     */
    public static async initializeProject(
        context: vscode.ExtensionContext,
        roadmap: RoadmapPhase[],
        projectPath: string
    ): Promise<ProjectState> {
        // Crear array de estados de tareas
        const tasks: TaskState[] = [];
        roadmap.forEach((phase, phaseIndex) => {
            phase.tasks.forEach((_, taskIndex) => {
                tasks.push({
                    phaseIndex,
                    taskIndex,
                    completed: false
                });
            });
        });

        const state: ProjectState = {
            roadmap,
            currentPhaseIndex: 0,
            currentTaskIndex: 0,
            tasks,
            projectInitialized: true,
            projectPath,
            createdAt: new Date(),
            lastUpdated: new Date(),
            totalXp: 0,
            unlockedBadges: []
        };

        // Guardar estado directamente en el proyecto nuevo (NO en el workspace actual)
        await this.saveStateToFileAtPath(state, projectPath);

        // También guardar en workspaceState del contexto actual (por si acaso)
        await context.workspaceState.update(this.STATE_KEY, state);

        return state;
    }

    /**
     * Guarda el estado en un archivo en una ruta específica
     */
    private static async saveStateToFileAtPath(state: ProjectState, projectPath: string): Promise<void> {
        try {
            const stateDir = path.join(projectPath, this.STATE_DIR);
            const stateFile = path.join(stateDir, this.STATE_FILE);

            // Crear directorio .knowledgeforge si no existe
            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }

            // Guardar estado como JSON
            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

            // También crear .gitignore
            const gitignorePath = path.join(stateDir, '.gitignore');
            if (!fs.existsSync(gitignorePath)) {
                fs.writeFileSync(gitignorePath, 'state.json\n');
            }

            console.log(`Estado guardado exitosamente en: ${stateFile}`);
        } catch (error) {
            console.error('Error guardando estado en archivo:', error);
            throw new Error(`No se pudo guardar el estado del proyecto: ${error}`);
        }
    }

    /**
     * Helper to migrate legacy ProjectState (single roadmap) into multi-roadmap shape
     */
    private static migrateLegacyStateToMulti(state: ProjectState): ProjectState {
        const roadmap = state.roadmap || [];
        const tasks = state.tasks || this.initializeTaskStates(roadmap);

        const instance: RoadmapInstance = {
            id: `roadmap_migrated_${Date.now()}`,
            title: 'Migrated Roadmap',
            roadmap,
            currentPhaseIndex: state.currentPhaseIndex || 0,
            currentTaskIndex: state.currentTaskIndex || 0,
            tasks,
            createdAt: state.createdAt || new Date(),
            lastUpdated: state.lastUpdated || new Date(),
            totalXp: state.totalXp || 0,
            unlockedBadges: state.unlockedBadges || []
        };

        const migrated: ProjectState = {
            roadmaps: [instance],
            activeRoadmapId: instance.id,
            projectInitialized: state.projectInitialized,
            projectPath: state.projectPath,
            createdAt: state.createdAt || new Date(),
            lastUpdated: new Date(),
            totalXp: state.totalXp || 0,
            unlockedBadges: state.unlockedBadges || []
        } as ProjectState;

        return migrated;
    }

    /**
     * Returns the active roadmap instance (migrating legacy state if necessary)
     */
    private static getActiveRoadmapInstance(state: ProjectState): RoadmapInstance | undefined {
        if (!state) return undefined;
        if (state.roadmaps && state.activeRoadmapId) {
            return state.roadmaps.find(r => r.id === state.activeRoadmapId) || state.roadmaps[0];
        }

        // If legacy shape is still present, create a temporary instance
        if (state.roadmap) {
            const tasks = state.tasks || this.initializeTaskStates(state.roadmap);
            return {
                id: `roadmap_temp_${Date.now()}`,
                title: 'Legacy Roadmap',
                roadmap: state.roadmap,
                currentPhaseIndex: state.currentPhaseIndex || 0,
                currentTaskIndex: state.currentTaskIndex || 0,
                tasks,
                createdAt: state.createdAt || new Date(),
                lastUpdated: state.lastUpdated || new Date(),
                totalXp: state.totalXp || 0,
                unlockedBadges: state.unlockedBadges || []
            };
        }

        return undefined;
    }

    /* ------------------ Roadmap CRUD helpers ------------------ */

    public static listRoadmaps(state: ProjectState): RoadmapInstance[] {
        if (!state) return [];
        if (state.roadmaps && state.roadmaps.length > 0) return state.roadmaps;

        // If legacy, create a temporary instance
        if (state.roadmap) {
            const tasks = state.tasks || this.initializeTaskStates(state.roadmap);
            return [{
                id: 'legacy_roadmap_0',
                title: 'Default',
                roadmap: state.roadmap,
                currentPhaseIndex: state.currentPhaseIndex || 0,
                currentTaskIndex: state.currentTaskIndex || 0,
                tasks,
                createdAt: state.createdAt || new Date(),
                lastUpdated: state.lastUpdated || new Date(),
                totalXp: state.totalXp || 0,
                unlockedBadges: state.unlockedBadges || []
            }];
        }

        return [];
    }

    public static async createRoadmap(context: vscode.ExtensionContext, title: string, roadmap: RoadmapPhase[]): Promise<RoadmapInstance | undefined> {
        const state = this.getState(context);
        if (!state) return undefined;

        const instance: RoadmapInstance = {
            id: `roadmap_${Date.now()}`,
            title,
            roadmap,
            currentPhaseIndex: 0,
            currentTaskIndex: 0,
            tasks: this.initializeTaskStates(roadmap),
            createdAt: new Date(),
            lastUpdated: new Date(),
            totalXp: 0,
            unlockedBadges: []
        };

        state.roadmaps = state.roadmaps || [];
        state.roadmaps.push(instance);
        state.activeRoadmapId = instance.id;
        await this.saveState(context, state);
        return instance;
    }

    public static async renameRoadmap(context: vscode.ExtensionContext, roadmapId: string, newTitle: string): Promise<boolean> {
        const state = this.getState(context);
        if (!state || !state.roadmaps) return false;
        const idx = state.roadmaps.findIndex(r => r.id === roadmapId);
        if (idx < 0) return false;
        state.roadmaps[idx].title = newTitle;
        state.roadmaps[idx].lastUpdated = new Date();
        await this.saveState(context, state);
        return true;
    }

    public static async cloneRoadmap(context: vscode.ExtensionContext, roadmapId: string, newTitle?: string): Promise<RoadmapInstance | undefined> {
        const state = this.getState(context);
        if (!state || !state.roadmaps) return undefined;
        const orig = state.roadmaps.find(r => r.id === roadmapId);
        if (!orig) return undefined;

        const clone: RoadmapInstance = {
            id: `roadmap_clone_${Date.now()}`,
            title: newTitle || `${orig.title} (copia)`,
            roadmap: JSON.parse(JSON.stringify(orig.roadmap)),
            currentPhaseIndex: 0,
            currentTaskIndex: 0,
            tasks: JSON.parse(JSON.stringify(orig.tasks)),
            createdAt: new Date(),
            lastUpdated: new Date(),
            totalXp: 0,
            unlockedBadges: []
        };

        state.roadmaps.push(clone);
        state.activeRoadmapId = clone.id;
        await this.saveState(context, state);
        return clone;
    }

    public static async deleteRoadmap(context: vscode.ExtensionContext, roadmapId: string): Promise<boolean> {
        const state = this.getState(context);
        if (!state || !state.roadmaps) return false;
        const idx = state.roadmaps.findIndex(r => r.id === roadmapId);
        if (idx < 0) return false;

        state.roadmaps.splice(idx, 1);

        // If we removed the active roadmap, choose another or clear
        if (state.activeRoadmapId === roadmapId) {
            if (state.roadmaps.length > 0) state.activeRoadmapId = state.roadmaps[0].id; else delete state.activeRoadmapId;
        }

        await this.saveState(context, state);
        return true;
    }

    public static async setActiveRoadmap(context: vscode.ExtensionContext, roadmapId: string): Promise<boolean> {
        const state = this.getState(context);
        if (!state || !state.roadmaps) return false;
        const exists = state.roadmaps.some(r => r.id === roadmapId);
        if (!exists) return false;
        state.activeRoadmapId = roadmapId;
        await this.saveState(context, state);
        return true;
    }

    /**
     * Appends new phases to an existing roadmap instance and updates task states
     */
    public static async appendPhasesToRoadmap(context: vscode.ExtensionContext, roadmapId: string, newPhases: RoadmapPhase[]): Promise<boolean> {
        const state = this.getState(context);
        if (!state || !state.roadmaps) return false;
        const idx = state.roadmaps.findIndex(r => r.id === roadmapId);
        if (idx < 0) return false;

        const instance = state.roadmaps[idx];
        // Append phases
        instance.roadmap = instance.roadmap.concat(newPhases);

        // Append task states for each new task
        newPhases.forEach((phase, pIndex) => {
            const globalPhaseIndex = instance.roadmap.length - newPhases.length + pIndex;
            phase.tasks.forEach((_, tIndex) => {
                instance.tasks.push({ phaseIndex: globalPhaseIndex, taskIndex: tIndex, completed: false });
            });
        });

        instance.lastUpdated = new Date();

        // Persist back
        state.roadmaps[idx] = instance;
        await this.saveState(context, state);
        return true;
    }

    /**
     * Obtiene la tarea actual en la que está trabajando el usuario
     */
    public static getCurrentTask(state: ProjectState): {
        phase: RoadmapPhase;
        task: string;
        phaseIndex: number;
        taskIndex: number;
    } | undefined {
        if (!state) return undefined;

        const active = this.getActiveRoadmapInstance(state);
        if (!active) return undefined;

        if (active.currentPhaseIndex >= active.roadmap.length) return undefined;
        const phase = active.roadmap[active.currentPhaseIndex];
        if (active.currentTaskIndex >= phase.tasks.length) return undefined;

        return {
            phase,
            task: phase.tasks[active.currentTaskIndex],
            phaseIndex: active.currentPhaseIndex,
            taskIndex: active.currentTaskIndex
        };
    }

    /**
     * Marca la tarea actual como completada y avanza a la siguiente
     */
    public static async completeCurrentTask(
        context: vscode.ExtensionContext,
        feedback?: string,
        xpGained?: number
    ): Promise<{ hasNext: boolean; unlockedBadge?: string }> {
        const state = this.getState(context);
        if (!state) return { hasNext: false };

        const active = this.getActiveRoadmapInstance(state);
        if (!active) return { hasNext: false };

        let unlockedBadge: string | undefined = undefined;
        const oldPhaseIndex = active.currentPhaseIndex;

        // Encontrar el estado de la tarea actual dentro del active roadmap
        const taskState = active.tasks.find(
            t => t.phaseIndex === active.currentPhaseIndex && t.taskIndex === active.currentTaskIndex
        );

        if (taskState && !taskState.completed) {
            taskState.completed = true;
            taskState.completedAt = new Date();
            taskState.feedback = feedback;
            taskState.xp = xpGained || 0;
            state.totalXp = (state.totalXp || 0) + (xpGained || 0);
            active.totalXp = (active.totalXp || 0) + (xpGained || 0);
        }

        // Avanzar a la siguiente tarea dentro del active roadmap
        const hasNext = this.advanceToNextTaskInInstance(active);

        // Comprobar si se completó una fase
        if (active.currentPhaseIndex > oldPhaseIndex || !hasNext) {
            const completedPhaseIndex = !hasNext ? active.roadmap.length - 1 : oldPhaseIndex;
            const badgeKey = `phase_${completedPhaseIndex + 1}_complete`;

            if (!active.unlockedBadges.includes(badgeKey)) {
                active.unlockedBadges.push(badgeKey);
                unlockedBadge = badgeKey;
            }

            // Comprobar si se completó el roadmap
            if (!hasNext) {
                const projectBadge = 'roadmap_complete';
                if (!active.unlockedBadges.includes(projectBadge)) {
                    active.unlockedBadges.push(projectBadge);
                    unlockedBadge = projectBadge;
                }
            }
        }

        // Persist changes: find and replace active roadmap in state.roadmaps if present
        if (state.roadmaps && state.activeRoadmapId) {
            const idx = state.roadmaps.findIndex(r => r.id === state.activeRoadmapId);
            if (idx >= 0) {
                state.roadmaps[idx] = active;
            }
        } else {
            // fallback: update legacy fields for compatibility
            state.roadmap = active.roadmap;
            state.currentPhaseIndex = active.currentPhaseIndex;
            state.currentTaskIndex = active.currentTaskIndex;
            state.tasks = active.tasks;
        }

        await this.saveState(context, state);

        return { hasNext, unlockedBadge };
    }

    /**
     * Avanza el puntero a la siguiente tarea pendiente
     */
    private static advanceToNextTask(state: ProjectState): boolean {
        // Deprecated: keep for compatibility but route to instance-based advance
        if (!state) return false;
        const active = this.getActiveRoadmapInstance(state);
        if (!active) return false;
        return this.advanceToNextTaskInInstance(active);
    }

    private static advanceToNextTaskInInstance(instance: RoadmapInstance): boolean {
        const currentPhase = instance.roadmap[instance.currentPhaseIndex];

        if (instance.currentTaskIndex + 1 < currentPhase.tasks.length) {
            instance.currentTaskIndex++;
            return true;
        }

        if (instance.currentPhaseIndex + 1 < instance.roadmap.length) {
            instance.currentPhaseIndex++;
            instance.currentTaskIndex = 0;
            return true;
        }

        return false;
    }

    /**
     * Mueve el puntero a la siguiente tarea sin marcar la actual como completada
     * Devuelve true si existe la siguiente tarea
     */
    public static async moveToNextTask(context: vscode.ExtensionContext): Promise<boolean> {
        const state = this.getState(context);
        if (!state) return false;

        const active = this.getActiveRoadmapInstance(state);
        if (!active) return false;

        // Intentar avanzar dentro de la fase actual
        if (active.currentTaskIndex + 1 < active.roadmap[active.currentPhaseIndex].tasks.length) {
            active.currentTaskIndex++;
        } else if (active.currentPhaseIndex + 1 < active.roadmap.length) {
            // Intentar avanzar a la siguiente fase
            active.currentPhaseIndex++;
            active.currentTaskIndex = 0;
        } else {
            return false;
        }

        // Persist changes back to state
        if (state.roadmaps && state.activeRoadmapId) {
            const idx = state.roadmaps.findIndex(r => r.id === state.activeRoadmapId);
            if (idx >= 0) state.roadmaps[idx] = active;
        } else {
            // fallback to legacy fields
            state.roadmap = active.roadmap;
            state.currentPhaseIndex = active.currentPhaseIndex;
            state.currentTaskIndex = active.currentTaskIndex;
            state.tasks = active.tasks;
        }

        await this.saveState(context, state);
        return true;
    }

    /**
     * Obtiene el progreso general del proyecto
     */
    public static getProgress(state: ProjectState): {
        completed: number;
        total: number;
        percentage: number;
    } {
        // If multi-roadmap, compute progress for active roadmap if available
        if (state.roadmaps && state.activeRoadmapId) {
            const active = state.roadmaps.find(r => r.id === state.activeRoadmapId) || state.roadmaps[0];
            const completed = active.tasks.filter(t => t.completed).length;
            const total = active.tasks.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { completed, total, percentage };
        }

        const completed = (state.tasks || []).filter(t => t.completed).length;
        const total = (state.tasks || []).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
    }

    /**
     * Verifica si el proyecto está completo
     */
    public static isProjectComplete(state: ProjectState): boolean {
        if (state.roadmaps && state.activeRoadmapId) {
            const active = state.roadmaps.find(r => r.id === state.activeRoadmapId) || state.roadmaps[0];
            return active.tasks.every(t => t.completed);
        }

        return (state.tasks || []).every(t => t.completed);
    }

    /**
     * Resetea el estado del proyecto
     */
    public static async resetProject(context: vscode.ExtensionContext): Promise<void> {
        await context.workspaceState.update(this.STATE_KEY, undefined);
    }

    /**
     * Obtiene un resumen del estado del proyecto
     */
    public static getProjectSummary(state: ProjectState): string {
        const progress = this.getProgress(state);
        const currentTask = this.getCurrentTask(state);

        if (this.isProjectComplete(state)) {
            return `🎉 ¡Proyecto completado! ${progress.completed}/${progress.total} tareas`;
        }

        if (!currentTask) {
            return `📊 Progreso: ${progress.completed}/${progress.total} tareas (${progress.percentage}%)`;
        }

        // Determine active roadmap phase index for display
        let phaseNumber = 0;
        if (state.roadmaps && state.activeRoadmapId) {
            const active = state.roadmaps.find(r => r.id === state.activeRoadmapId) || state.roadmaps[0];
            phaseNumber = active.currentPhaseIndex;
        } else if (state.currentPhaseIndex !== undefined) {
            phaseNumber = state.currentPhaseIndex;
        }

        return `📍 Fase ${phaseNumber + 1}: ${currentTask.phase.title}
📝 Tarea actual: ${currentTask.task}
📊 Progreso: ${progress.completed}/${progress.total} tareas (${progress.percentage}%)`;
    }
}
