import * as vscode from 'vscode';
import { ProjectStateService } from './ProjectStateService';

// Types for gamification system
export interface PlayerProfile {
    userId: string;
    totalXp: number;
    level: number;
    developerClass: DeveloperClass;
    badges: string[];
    achievements: string[];
    challengesCompleted: string[];
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: Date;
}

export interface DeveloperClass {
    name: string;
    level: number;
    requiredXp: number;
    description: string;
    icon: string;
}

export interface SkillTree {
    skills: SkillNode[];
    unlockedSkills: string[];
}

export interface SkillNode {
    id: string;
    name: string;
    description: string;
    requiredXp: number;
    parentId?: string;
    children: string[];
    unlocked: boolean;
    icon: string;
}

export interface Challenge {
    id: string;
    name: string;
    description: string;
    type: ChallengeType;
    difficulty: number; // 1-5
    xpReward: number;
    deadline?: Date;
    completed: boolean;
    startDate: Date;
}

export type ChallengeType = 'speedCoding' | 'deepDive' | 'codeReview' | 'refactor' | 'helpOthers';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockDate?: Date;
}

export class GamificationService {
    static readonly PROFILE_KEY = 'gamification.profile';
    static readonly SKILL_TREE_KEY = 'gamification.skillTree';
    static readonly CHALLENGES_KEY = 'gamification.challenges';
    static readonly ACHIEVEMENTS_KEY = 'gamification.achievements';

    // Developer classes progression
    static readonly DEVELOPER_CLASSES: DeveloperClass[] = [
        { name: 'Novice', level: 1, requiredXp: 0, description: 'Comenzando tu viaje como desarrollador', icon: '🐣' },
        { name: 'Junior Apprentice', level: 2, requiredXp: 100, description: 'Primeros pasos en el mundo del desarrollo', icon: '📚' },
        { name: 'Apprentice', level: 3, requiredXp: 500, description: 'Construyendo tu base de conocimientos', icon: '🔨' },
        { name: 'Developer', level: 4, requiredXp: 1500, description: 'Desarrollando con confianza', icon: '💻' },
        { name: 'Advanced Developer', level: 5, requiredXp: 3000, description: 'Dominando tecnologías clave', icon: '🚀' },
        { name: 'Code Warrior', level: 6, requiredXp: 6000, description: 'Resolviendo problemas complejos', icon: '⚔️' },
        { name: 'Senior Developer', level: 7, requiredXp: 12000, description: 'Liderando proyectos y equipos', icon: '👑' },
        { name: 'Architect Master', level: 8, requiredXp: 25000, description: 'Diseñando sistemas a gran escala', icon: '🏰' }
    ];

    // Predefined achievements
    static readonly ACHIEVEMENTS: Achievement[] = [
        { id: 'first_task', name: 'Primer Paso', description: 'Completa tu primera tarea', icon: '🏁', unlocked: false },
        { id: 'five_tasks', name: 'Cinco por Cinco', description: 'Completa 5 tareas', icon: '🖐️', unlocked: false },
        { id: 'ten_tasks', name: 'Diez en Raya', description: 'Completa 10 tareas', icon: '🔟', unlocked: false },
        { id: 'no_hints', name: 'Independiente', description: 'Completa una tarea sin usar pistas', icon: '🧍', unlocked: false },
        { id: 'speed_demon', name: 'Demonio de la Velocidad', description: 'Completa una tarea en menos de 10 minutos', icon: '⚡', unlocked: false },
        { id: 'perfectionist', name: 'Perfeccionista', description: 'Obtén una calificación perfecta en una revisión de código', icon: '💯', unlocked: false },
        { id: 'streak_7', name: 'Semana de Fuego', description: 'Mantén una racha de 7 días estudiando', icon: '🔥', unlocked: false },
        { id: 'streak_30', name: 'Mes de Consistencia', description: 'Mantén una racha de 30 días estudiando', icon: '📅', unlocked: false },
        { id: 'helper', name: 'Ayudante', description: 'Ayuda a otros usuarios 5 veces', icon: '🤝', unlocked: false },
        { id: 'explorer', name: 'Explorador', description: 'Completa tareas de 3 áreas diferentes', icon: '🗺️', unlocked: false }
    ];

    // Predefined challenges
    static readonly WEEKLY_CHALLENGES: Omit<Challenge, 'id' | 'startDate' | 'completed'>[] = [
        { 
            name: 'Speed Coding Monday', 
            description: 'Completa una micro-tarea en tiempo récord', 
            type: 'speedCoding', 
            difficulty: 2, 
            xpReward: 100 
        },
        { 
            name: 'Deep Dive Friday', 
            description: 'Investiga profundamente un tema avanzado', 
            type: 'deepDive', 
            difficulty: 4, 
            xpReward: 150 
        }
    ];

    /**
     * Get or create player profile
     */
    static getPlayerProfile(context: vscode.ExtensionContext): PlayerProfile {
        const storedProfile = context.globalState.get<PlayerProfile>(this.PROFILE_KEY);
        if (storedProfile) {
            return {
                ...storedProfile,
                lastActiveDate: new Date(storedProfile.lastActiveDate)
            };
        }

        // Create new profile
        return {
            userId: 'user-' + Date.now(),
            totalXp: 0,
            level: 1,
            developerClass: this.DEVELOPER_CLASSES[0],
            badges: [],
            achievements: [],
            challengesCompleted: [],
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: new Date()
        };
    }

    /**
     * Save player profile
     */
    static savePlayerProfile(context: vscode.ExtensionContext, profile: PlayerProfile): void {
        context.globalState.update(this.PROFILE_KEY, profile);
    }

    /**
     * Award XP to player
     */
    static awardXp(context: vscode.ExtensionContext, xp: number, reason: string): void {
        const profile = this.getPlayerProfile(context);
        profile.totalXp += xp;
        
        // Check for level up
        const newClass = this.getDeveloperClassForXp(profile.totalXp);
        if (newClass.level > profile.developerClass.level) {
            profile.developerClass = newClass;
            vscode.window.showInformationMessage(`🎉 ¡Felicidades! Has alcanzado el nivel ${newClass.name}`);
        }
        
        // Update last active date
        profile.lastActiveDate = new Date();
        
        // Update streak
        profile.currentStreak = this.calculateCurrentStreak(profile);
        if (profile.currentStreak > profile.longestStreak) {
            profile.longestStreak = profile.currentStreak;
        }
        
        this.savePlayerProfile(context, profile);
        
        // Show XP gain notification
        vscode.window.showInformationMessage(`+${xp} XP por ${reason}`);
    }

    /**
     * Get developer class based on XP
     */
    static getDeveloperClassForXp(xp: number): DeveloperClass {
        // Find the highest class that the user qualifies for
        for (let i = this.DEVELOPER_CLASSES.length - 1; i >= 0; i--) {
            if (xp >= this.DEVELOPER_CLASSES[i].requiredXp) {
                return this.DEVELOPER_CLASSES[i];
            }
        }
        return this.DEVELOPER_CLASSES[0];
    }

    /**
     * Get skill tree
     */
    static getSkillTree(context: vscode.ExtensionContext): SkillTree {
        const storedTree = context.globalState.get<SkillTree>(this.SKILL_TREE_KEY);
        if (storedTree) {
            return storedTree;
        }

        // Create initial skill tree
        const skills: SkillNode[] = [
            {
                id: 'javascript-basics',
                name: 'JavaScript Básico',
                description: 'Fundamentos de JavaScript',
                requiredXp: 0,
                children: ['javascript-advanced'],
                unlocked: true,
                icon: '🟨'
            },
            {
                id: 'javascript-advanced',
                name: 'JavaScript Avanzado',
                description: 'Conceptos avanzados de JavaScript',
                requiredXp: 500,
                parentId: 'javascript-basics',
                children: ['typescript'],
                unlocked: false,
                icon: '🟨'
            },
            {
                id: 'typescript',
                name: 'TypeScript',
                description: 'Tipado estático en JavaScript',
                requiredXp: 1000,
                parentId: 'javascript-advanced',
                children: [],
                unlocked: false,
                icon: '🟦'
            },
            {
                id: 'nodejs',
                name: 'Node.js',
                description: 'Entorno de ejecución para JavaScript',
                requiredXp: 800,
                children: [],
                unlocked: false,
                icon: '🟢'
            },
            {
                id: 'react',
                name: 'React',
                description: 'Biblioteca para interfaces de usuario',
                requiredXp: 1200,
                children: [],
                unlocked: false,
                icon: '⚛️'
            }
        ];

        return {
            skills,
            unlockedSkills: ['javascript-basics']
        };
    }

    /**
     * Save skill tree
     */
    static saveSkillTree(context: vscode.ExtensionContext, tree: SkillTree): void {
        context.globalState.update(this.SKILL_TREE_KEY, tree);
    }

    /**
     * Unlock a skill
     */
    static unlockSkill(context: vscode.ExtensionContext, skillId: string): void {
        const tree = this.getSkillTree(context);
        const skillIndex = tree.skills.findIndex(s => s.id === skillId);
        
        if (skillIndex !== -1 && !tree.skills[skillIndex].unlocked) {
            tree.skills[skillIndex].unlocked = true;
            tree.unlockedSkills.push(skillId);
            this.saveSkillTree(context, tree);
            
            const skill = tree.skills[skillIndex];
            vscode.window.showInformationMessage(`🔓 ¡Has desbloqueado ${skill.name}!`);
        }
    }

    /**
     * Get achievements
     */
    static getAchievements(context: vscode.ExtensionContext): Achievement[] {
        const storedAchievements = context.globalState.get<Achievement[]>(this.ACHIEVEMENTS_KEY);
        if (storedAchievements) {
            return storedAchievements.map(ach => ({
                ...ach,
                unlockDate: ach.unlockDate ? new Date(ach.unlockDate) : undefined
            }));
        }
        
        return [...this.ACHIEVEMENTS];
    }

    /**
     * Save achievements
     */
    static saveAchievements(context: vscode.ExtensionContext, achievements: Achievement[]): void {
        context.globalState.update(this.ACHIEVEMENTS_KEY, achievements);
    }

    /**
     * Unlock an achievement
     */
    static unlockAchievement(context: vscode.ExtensionContext, achievementId: string): void {
        const achievements = this.getAchievements(context);
        const achievementIndex = achievements.findIndex(a => a.id === achievementId);
        
        if (achievementIndex !== -1 && !achievements[achievementIndex].unlocked) {
            achievements[achievementIndex].unlocked = true;
            achievements[achievementIndex].unlockDate = new Date();
            this.saveAchievements(context, achievements);
            
            const achievement = achievements[achievementIndex];
            vscode.window.showInformationMessage(`🏆 ¡Logro desbloqueado: ${achievement.name}!`);
            
            // Also add to player profile
            const profile = this.getPlayerProfile(context);
            if (!profile.achievements.includes(achievementId)) {
                profile.achievements.push(achievementId);
                this.savePlayerProfile(context, profile);
            }
        }
    }

    /**
     * Get weekly challenges
     */
    static getWeeklyChallenges(context: vscode.ExtensionContext): Challenge[] {
        const storedChallenges = context.globalState.get<Challenge[]>(this.CHALLENGES_KEY);
        if (storedChallenges) {
            return storedChallenges.map(ch => ({
                ...ch,
                startDate: new Date(ch.startDate),
                deadline: ch.deadline ? new Date(ch.deadline) : undefined
            }));
        }
        
        // Create new weekly challenges
        const now = new Date();
        const challenges: Challenge[] = this.WEEKLY_CHALLENGES.map((ch, index) => ({
            ...ch,
            id: `challenge-${Date.now()}-${index}`,
            startDate: now,
            completed: false
        }));
        
        // Set deadlines (end of week)
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        
        challenges.forEach(ch => {
            ch.deadline = endOfWeek;
        });
        
        context.globalState.update(this.CHALLENGES_KEY, challenges);
        return challenges;
    }

    /**
     * Save weekly challenges
     */
    static saveWeeklyChallenges(context: vscode.ExtensionContext, challenges: Challenge[]): void {
        context.globalState.update(this.CHALLENGES_KEY, challenges);
    }

    /**
     * Complete a challenge
     */
    static completeChallenge(context: vscode.ExtensionContext, challengeId: string): void {
        const challenges = this.getWeeklyChallenges(context);
        const challengeIndex = challenges.findIndex(c => c.id === challengeId);
        
        if (challengeIndex !== -1 && !challenges[challengeIndex].completed) {
            challenges[challengeIndex].completed = true;
            this.saveWeeklyChallenges(context, challenges);
            
            const challenge = challenges[challengeIndex];
            this.awardXp(context, challenge.xpReward, `completar el desafío "${challenge.name}"`);
            
            // Add to player profile
            const profile = this.getPlayerProfile(context);
            if (!profile.challengesCompleted.includes(challengeId)) {
                profile.challengesCompleted.push(challengeId);
                this.savePlayerProfile(context, profile);
            }
            
            vscode.window.showInformationMessage(`🎯 ¡Desafío completado: ${challenge.name}! +${challenge.xpReward} XP`);
        }
    }

    /**
     * Calculate current streak based on last active date
     */
    private static calculateCurrentStreak(profile: PlayerProfile): number {
        const today = new Date();
        const lastActive = new Date(profile.lastActiveDate);
        
        // If last active today
        if (lastActive.toDateString() === today.toDateString()) {
            return profile.currentStreak;
        }
        
        // If last active yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActive.toDateString() === yesterday.toDateString()) {
            return profile.currentStreak + 1;
        }
        
        // Otherwise reset streak
        return 1;
    }
}