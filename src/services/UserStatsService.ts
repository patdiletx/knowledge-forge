import * as vscode from 'vscode';
import { ProjectStateService } from './ProjectStateService';


/**
 * Represents detailed user statistics
 */
export interface UserStats {
    totalTasks: number;
    completedTasks: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    weeklyActivity: {
        [day: string]: number; // Day of week -> tasks completed
    };
    phaseCompletion: {
        [phaseIndex: number]: {
            total: number;
            completed: number;
        };
    };
}

/**
 * Service for tracking and managing user statistics
 */
export class UserStatsService {
    private static readonly STATS_KEY = 'knowledgeforge.userStats';
    
    /**
     * Get user statistics
     */
    public static getStats(context: vscode.ExtensionContext): UserStats {
        const storedStats = context.workspaceState.get<UserStats>(this.STATS_KEY);
        
        if (storedStats) {
            return storedStats;
        }
        
        // Return default stats
        return {
            totalTasks: 0,
            completedTasks: 0,
            totalXP: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            weeklyActivity: {
                '0': 0, // Sunday
                '1': 0, // Monday
                '2': 0, // Tuesday
                '3': 0, // Wednesday
                '4': 0, // Thursday
                '5': 0, // Friday
                '6': 0  // Saturday
            },
            phaseCompletion: {}
        };
    }
    
    /**
     * Update user statistics based on project state
     */
    public static async updateStats(context: vscode.ExtensionContext, state: any): Promise<void> {
        const stats = this.getStats(context);
        
        // Update basic stats
        const s = state as any;
        const tasks = s && s.tasks ? s.tasks : [];
        const roadmaps = s && s.roadmaps ? s.roadmaps : [];
        let active: any = undefined;
        if (roadmaps.length > 0 && s.activeRoadmapId) {
            active = roadmaps.find((r: any) => r.id === s.activeRoadmapId) || roadmaps[0];
        }

        if (active) {
            stats.totalTasks = (active.tasks || []).length;
            stats.completedTasks = (active.tasks || []).filter((t: any) => t.completed).length;
            stats.totalXP = (active.totalXp !== undefined) ? active.totalXp : (s.totalXp || 0);
        } else {
            stats.totalTasks = tasks.length;
            stats.completedTasks = tasks.filter((t: any) => t.completed).length;
            stats.totalXP = s.totalXp || 0;
        }
        
        // Update streak
        const today = new Date().toISOString().split('T')[0];
        if (stats.lastActiveDate !== today) {
            if (stats.lastActiveDate) {
                // Parse safely
                const lastActive = new Date(stats.lastActiveDate);
                const todayDate = new Date(today);
                const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                const diffDays = Math.round(Math.abs((todayDate.getTime() - lastActive.getTime()) / oneDay));

                if (diffDays === 1) {
                    // Consecutive day
                    stats.currentStreak = (stats.currentStreak || 0) + 1;
                } else if (diffDays > 1) {
                    // Break in streak
                    stats.currentStreak = 1;
                }
            } else {
                // First activity
                stats.currentStreak = 1;
            }
            
            // Update longest streak
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
            
            stats.lastActiveDate = today;
        }
        
        // Update weekly activity
        const dayOfWeek = new Date().getDay().toString();
        if (stats.completedTasks > 0) {
            stats.weeklyActivity[dayOfWeek] = (stats.weeklyActivity[dayOfWeek] || 0) + 1;
        }
        
        // Update phase completion
        stats.phaseCompletion = {};
        // Prefer active roadmap if multi-roadmap
        if (s.roadmaps && s.activeRoadmapId) {
            const active = s.roadmaps.find((r: any) => r.id === s.activeRoadmapId) || s.roadmaps[0];
            (active.roadmap || []).forEach((_: any, index: number) => {
                const phaseTasks = (active.tasks || []).filter((t: any) => t.phaseIndex === index);
                stats.phaseCompletion[index] = {
                    total: phaseTasks.length,
                    completed: phaseTasks.filter((t: any) => t.completed).length
                };
            });
        } else if (s.roadmap) {
            (s.roadmap || []).forEach((_: any, index: number) => {
                const phaseTasks = (s.tasks || []).filter((t: any) => t.phaseIndex === index);
                stats.phaseCompletion[index] = {
                    total: phaseTasks.length,
                    completed: phaseTasks.filter((t: any) => t.completed).length
                };
            });
        }
        
        // Save updated stats
        await context.workspaceState.update(this.STATS_KEY, stats);
    }
    
    /**
     * Reset user statistics
     */
    public static async resetStats(context: vscode.ExtensionContext): Promise<void> {
        await context.workspaceState.update(this.STATS_KEY, undefined);
    }
    
    /**
     * Get user level based on XP
     */
    public static getLevel(xp: number): number {
        // Simple level calculation: level = sqrt(XP / 100)
        return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
    }
    
    /**
     * Get XP needed for next level
     */
    public static getXpToNextLevel(xp: number): number {
        const currentLevel = this.getLevel(xp);
        const nextLevelXp = Math.pow(currentLevel, 2) * 100;
        return nextLevelXp - xp;
    }
    
    /**
     * Get level progress as a percentage
     */
    public static getLevelProgress(xp: number): number {
        const currentLevel = this.getLevel(xp);
        const currentLevelXp = Math.pow(currentLevel - 1, 2) * 100;
        const nextLevelXp = Math.pow(currentLevel, 2) * 100;
        const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
        return Math.min(100, Math.max(0, progress));
    }
}