import * as vscode from 'vscode';
import { ProjectStateService } from './ProjectStateService';

/**
 * Represents a badge that can be unlocked by the user
 */
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt?: Date;
    xpReward: number;
}

/**
 * Service to manage badges and achievements in KnowledgeForge
 */
export class BadgesService {
    // Predefined badges that users can unlock
    private static readonly BADGES: Badge[] = [
        {
            id: 'first_steps',
            name: ' primeros pasos',
            description: 'Completa tu primera tarea',
            icon: '⭐',
            xpReward: 50
        },
        {
            id: 'quick_learner',
            name: 'Aprendiz Rápido',
            description: 'Completa 5 tareas consecutivas',
            icon: '🚀',
            xpReward: 100
        },
        {
            id: 'solid_foundations',
            name: 'Fundamentos Sólidos',
            description: 'Completa la primera fase de tu roadmap',
            icon: '🏗️',
            xpReward: 200
        },
        {
            id: 'backend_architect',
            name: 'Arquitecto Backend',
            description: 'Completa una fase avanzada de backend',
            icon: '🖥️',
            xpReward: 300
        },
        {
            id: 'frontend_master',
            name: 'Maestro Frontend',
            description: 'Completa una fase avanzada de frontend',
            icon: '🎨',
            xpReward: 300
        },
        {
            id: 'full_stack',
            name: 'Desarrollador Full Stack',
            description: 'Completa fases tanto de frontend como de backend',
            icon: '🌐',
            xpReward: 500
        },
        {
            id: 'testing_champion',
            name: 'Campeón de Testing',
            description: 'Completa una fase centrada en pruebas',
            icon: '🧪',
            xpReward: 250
        },
        {
            id: 'devops_hero',
            name: 'Héroe DevOps',
            description: 'Completa una fase de despliegue o CI/CD',
            icon: '⚙️',
            xpReward: 300
        },
        {
            id: 'completionist',
            name: 'Perfeccionista',
            description: 'Completa todas las tareas de tu roadmap',
            icon: '🏆',
            xpReward: 1000
        }
    ];

    /**
     * Get all available badges
     */
    public static getAllBadges(): Badge[] {
        return [...this.BADGES];
    }

    /**
     * Check and unlock badges based on user progress
     */
    public static async checkAndUnlockBadges(context: vscode.ExtensionContext): Promise<Badge[]> {
        const state = ProjectStateService.getState(context);
        if (!state) {
            return [];
        }

        const newlyUnlockedBadges: Badge[] = [];
        const progress = ProjectStateService.getProgress(state);
        // Ensure unlockedBadges exists at top-level
        state.unlockedBadges = state.unlockedBadges || [];
        // Determine active roadmap instance (if any)
        const activeRoadmaps = state.roadmaps || [];
        const active = (state.activeRoadmapId && activeRoadmaps.length)
            ? activeRoadmaps.find(r => r.id === state.activeRoadmapId) || activeRoadmaps[0]
            : (activeRoadmaps[0] || undefined);
        // Ensure active unlockedBadges exists
        if (active) {
            active.unlockedBadges = active.unlockedBadges || [];
        }
        
        // Check for unlocked badges
        for (const badge of this.BADGES) {
            // Skip already unlocked badges
            if (state.unlockedBadges.includes(badge.id)) {
                continue;
            }

            let shouldUnlock = false;

            switch (badge.id) {
                case 'first_steps':
                    shouldUnlock = progress.completed > 0;
                    break;
                    
                case 'quick_learner':
                    shouldUnlock = progress.completed >= 5;
                    break;
                    
                case 'solid_foundations':
                    // Check if first phase is completed on the active roadmap
                    if (active && active.roadmap && active.roadmap.length > 0) {
                        const firstPhaseTasks = active.tasks.filter(t => t.phaseIndex === 0);
                        shouldUnlock = firstPhaseTasks.length > 0 && firstPhaseTasks.every(t => t.completed);
                    }
                    break;
                    
                case 'completionist':
                    shouldUnlock = progress.completed === progress.total;
                    break;
                    
                default:
                    // For specialized badges, we'll implement specific checks
                    // based on phase titles or other criteria
                    if (badge.id === 'backend_architect' || 
                        badge.id === 'frontend_master' || 
                        badge.id === 'testing_champion' || 
                        badge.id === 'devops_hero') {
                        shouldUnlock = this.checkSpecializedBadges(active || state, badge.id);
                    }
                    break;
            }

            if (shouldUnlock) {
                newlyUnlockedBadges.push(badge);
                await this.unlockBadge(context, badge);
            }
        }

        return newlyUnlockedBadges;
    }

    /**
     * Check for specialized badges based on phase content
     */
    private static checkSpecializedBadges(state: any, badgeId: string): boolean {
        // state can be either a full ProjectState (legacy) or a RoadmapInstance (preferred)
        const roadmap = state.roadmap || [];
        switch (badgeId) {
            case 'backend_architect':
                return roadmap.some((phase: any) => 
                    (phase.title || '').toLowerCase().includes('backend') || 
                    (phase.title || '').toLowerCase().includes('servidor') ||
                    (phase.title || '').toLowerCase().includes('api')
                );
                
            case 'frontend_master':
                return roadmap.some((phase: any) => 
                    (phase.title || '').toLowerCase().includes('frontend') || 
                    (phase.title || '').toLowerCase().includes('react') || 
                    (phase.title || '').toLowerCase().includes('angular') || 
                    (phase.title || '').toLowerCase().includes('vue')
                );
                
            case 'testing_champion':
                return roadmap.some((phase: any) => 
                    (phase.title || '').toLowerCase().includes('test') || 
                    (phase.title || '').toLowerCase().includes('prueba') || 
                    (phase.title || '').toLowerCase().includes('testing') || 
                    (phase.title || '').toLowerCase().includes('qa')
                );
                
            case 'devops_hero':
                return roadmap.some((phase: any) => 
                    (phase.title || '').toLowerCase().includes('deploy') || 
                    (phase.title || '').toLowerCase().includes('despliegue') ||
                    (phase.title || '').toLowerCase().includes('ci/cd') ||
                    (phase.title || '').toLowerCase().includes('devops') ||
                    (phase.title || '').toLowerCase().includes('docker')
                );
                
            default:
                return false;
        }
    }

    /**
     * Unlock a badge and award XP
     */
    private static async unlockBadge(context: vscode.ExtensionContext, badge: Badge): Promise<void> {
        const state = ProjectStateService.getState(context);
        if (!state) {
            return;
        }

        // Add badge to unlocked badges
        if (!state.unlockedBadges.includes(badge.id)) {
            state.unlockedBadges.push(badge.id);
            
            // Award XP
            state.totalXp += badge.xpReward;
            
            // Save updated state
            await ProjectStateService.saveState(context, state);
            
            // Show notification
            vscode.window.showInformationMessage(
                `🎉 ¡Nuevo logro desbloqueado! ${badge.name} - ${badge.description}`, 
                'Ver Logros'
            ).then(selection => {
                if (selection === 'Ver Logros') {
                    vscode.commands.executeCommand('knowledgeforge.showBadges');
                }
            });
        }
    }
}