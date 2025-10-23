import * as vscode from 'vscode';
import { SoundManager } from './SoundManager';

/**
 * Manager for showing toast notifications and gamification feedback
 */
export class NotificationManager {
    /**
     * Show a gamification toast notification
     * @param title The main title of the notification
     * @param message The detailed message
     * @param xp The XP earned (if any)
     * @param badgeName The badge earned (if any)
     */
    public static showGamificationToast(
        title: string,
        message: string,
        xp?: number,
        badgeName?: string
    ) {
        let fullMessage = message;
        
        if (xp) {
            fullMessage += `\n\n🎉 ¡Has ganado ${xp} XP!`;
            SoundManager.playXpEarned();
        }
        
        if (badgeName) {
            fullMessage += `\n\n🏅 ¡Nuevo logro desbloqueado: ${badgeName}!`;
            SoundManager.playBadgeUnlocked();
        }

        vscode.window.showInformationMessage(title, { modal: false, detail: fullMessage });
        
        // Play appropriate sound based on notification type
        if (badgeName) {
            SoundManager.playBadgeUnlocked();
        } else if (xp) {
            SoundManager.playXpEarned();
        }
    }

    /**
     * Show XP earned notification
     * @param xp Amount of XP earned
     * @param taskName Name of the task that awarded the XP
     */
    public static showXpEarned(xp: number, taskName: string) {
        this.showGamificationToast(
            '¡Puntos de experiencia ganados!',
            `Has completado "${taskName}"`,
            xp
        );
        SoundManager.playXpEarned();
    }

    /**
     * Show badge unlocked notification
     * @param badgeName Name of the unlocked badge
     * @param badgeDescription Description of the badge
     * @param xp XP reward for the badge
     */
    public static showBadgeUnlocked(badgeName: string, badgeDescription: string, xp: number) {
        this.showGamificationToast(
            '¡Nuevo logro desbloqueado!',
            badgeDescription,
            xp,
            badgeName
        );
        SoundManager.playBadgeUnlocked();
    }

    /**
     * Show task completed notification
     * @param taskName Name of the completed task
     * @param xp XP earned from completing the task
     */
    public static showTaskCompleted(taskName: string, xp: number) {
        this.showGamificationToast(
            '¡Tarea completada!',
            `Has completado "${taskName}"`,
            xp
        );
        SoundManager.playTaskCompleted();
    }

    /**
     * Show phase completed notification
     * @param phaseName Name of the completed phase
     * @param xp XP earned from completing the phase
     * @param badgeName Badge earned for completing the phase (if any)
     */
    public static showPhaseCompleted(phaseName: string, xp: number, badgeName?: string) {
        this.showGamificationToast(
            '¡Fase completada!',
            `Has completado la fase "${phaseName}"`,
            xp,
            badgeName
        );
        SoundManager.playLevelUp();
    }

    /**
     * Show project completed notification
     * @param xp XP earned from completing the project
     * @param badgeName Badge earned for completing the project
     */
    public static showProjectCompleted(xp: number, badgeName: string) {
        this.showGamificationToast(
            '¡Proyecto completado!',
            '¡Felicidades! Has completado todas las tareas de tu roadmap.',
            xp,
            badgeName
        );
        SoundManager.playLevelUp();
    }
}