import * as vscode from 'vscode';

export interface MicroLesson {
    id: string;
    title: string;
    description: string;
    estimatedTime: number; // in minutes
    completed: boolean;
    startTime?: Date;
    endTime?: Date;
    actualTime?: number; // in minutes
}

export interface MicroLearningSession {
    taskId: string;
    lessons: MicroLesson[];
    currentLessonIndex: number;
    startedAt: Date;
    completedAt?: Date;
}

export class MicroLearningService {
    private static readonly SESSIONS_STORAGE_KEY = 'microLearningSessions';
    
    /**
     * Create micro-lessons for a task based on the 5-step learning approach
     */
    public static createMicroLessonsForTask(taskId: string, stepNames: string[]): MicroLesson[] {
        // Default estimated times for each step (in minutes)
        const estimatedTimes = [3, 5, 7, 8, 3]; // Total ~26 minutes
        
        return stepNames.map((name, index) => ({
            id: `${taskId}-lesson-${index}`,
            title: name,
            description: this.getLessonDescription(name),
            estimatedTime: estimatedTimes[index] || 5,
            completed: false
        }));
    }
    
    /**
     * Start a micro-learning session for a task
     */
    public static startSession(context: vscode.ExtensionContext, taskId: string, stepNames: string[]): MicroLearningSession {
        const lessons = this.createMicroLessonsForTask(taskId, stepNames);
        
        const session: MicroLearningSession = {
            taskId,
            lessons,
            currentLessonIndex: 0,
            startedAt: new Date()
        };
        
        this.saveSession(context, session);
        return session;
    }
    
    /**
     * Start a specific lesson
     */
    public static startLesson(context: vscode.ExtensionContext, sessionId: string, lessonIndex: number): void {
        const session = this.getSession(context, sessionId);
        if (!session) return;
        
        // End previous lesson if it was started but not ended
        if (session.lessons[session.currentLessonIndex].startTime && !session.lessons[session.currentLessonIndex].endTime) {
            this.endLesson(context, sessionId, session.currentLessonIndex);
        }
        
        session.currentLessonIndex = lessonIndex;
        session.lessons[lessonIndex].startTime = new Date();
        
        this.saveSession(context, session);
    }
    
    /**
     * End a specific lesson
     */
    public static endLesson(context: vscode.ExtensionContext, sessionId: string, lessonIndex: number): void {
        const session = this.getSession(context, sessionId);
        if (!session) return;
        
        const lesson = session.lessons[lessonIndex];
        if (lesson.startTime) {
            lesson.endTime = new Date();
            const durationMs = lesson.endTime.getTime() - lesson.startTime.getTime();
            lesson.actualTime = durationMs / (1000 * 60); // Convert to minutes
            lesson.completed = true;
            
            this.saveSession(context, session);
            
            // Show notification when lesson is completed
            vscode.window.showInformationMessage(
                `✅ Lección completada: ${lesson.title} (${lesson.actualTime.toFixed(1)} minutos)`
            );
        }
    }
    
    /**
     * Get session by task ID
     */
    public static getSession(context: vscode.ExtensionContext, taskId: string): MicroLearningSession | undefined {
        const sessions = context.workspaceState.get<{[key: string]: MicroLearningSession}>(this.SESSIONS_STORAGE_KEY, {});
        return sessions[taskId];
    }
    
    /**
     * Save session
     */
    private static saveSession(context: vscode.ExtensionContext, session: MicroLearningSession): void {
        const sessions = context.workspaceState.get<{[key: string]: MicroLearningSession}>(this.SESSIONS_STORAGE_KEY, {});
        sessions[session.taskId] = session;
        context.workspaceState.update(this.SESSIONS_STORAGE_KEY, sessions);
    }
    
    /**
     * Get lesson description based on step name
     */
    private static getLessonDescription(stepName: string): string {
        const descriptions: {[key: string]: string} = {
            '🎯 Entender el Objetivo': 'Comprende claramente qué necesitas lograr y por qué es importante',
            '📚 Conceptos Clave': 'Aprende los fundamentos teóricos necesarios para esta tarea',
            '💡 Ejemplo Guiado': 'Sigue un ejemplo completo y comentado paso a paso',
            '✍️ Tu Turno - Práctica': 'Aplica lo aprendido en un ejercicio práctico',
            '✅ Validación': 'Verifica que has completado correctamente todos los requisitos'
        };
        
        return descriptions[stepName] || 'Lección de micro-aprendizaje';
    }
    
    /**
     * Get statistics for all sessions
     */
    public static getLearningStatistics(context: vscode.ExtensionContext): {
        totalSessions: number;
        completedLessons: number;
        totalLessons: number;
        averageTimePerLesson: number;
    } {
        const sessions = context.workspaceState.get<{[key: string]: MicroLearningSession}>(this.SESSIONS_STORAGE_KEY, {});
        
        let totalSessions = 0;
        let completedLessons = 0;
        let totalLessons = 0;
        let totalTime = 0;
        let lessonsWithTime = 0;
        
        Object.values(sessions).forEach(session => {
            totalSessions++;
            session.lessons.forEach(lesson => {
                totalLessons++;
                if (lesson.completed) {
                    completedLessons++;
                }
                if (lesson.actualTime) {
                    totalTime += lesson.actualTime;
                    lessonsWithTime++;
                }
            });
        });
        
        return {
            totalSessions,
            completedLessons,
            totalLessons,
            averageTimePerLesson: lessonsWithTime > 0 ? totalTime / lessonsWithTime : 0
        };
    }
}