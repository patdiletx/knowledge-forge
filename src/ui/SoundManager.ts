import * as vscode from 'vscode';

/**
 * Manager for playing sound effects in the extension
 */
export class SoundManager {
    // We'll use VS Code's webview audio capabilities to play sounds
    // In a real implementation, we would include actual audio files
    // For now, we'll simulate the sound playing functionality
    
    private static isEnabled: boolean = true;
    
    /**
     * Enable or disable sound effects
     */
    public static setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }
    
    /**
     * Play a sound effect for task completion
     */
    public static playTaskCompleted(): void {
        if (!this.isEnabled) return;
        
        // In a real implementation, we would play an actual sound file
        console.log('🎵 Playing task completed sound');
        // Simulate sound by showing a subtle notification
        vscode.window.setStatusBarMessage('✅ ¡Tarea completada! (+XP)', 2000);
    }
    
    /**
     * Play a sound effect for badge unlocked
     */
    public static playBadgeUnlocked(): void {
        if (!this.isEnabled) return;
        
        console.log('🎵 Playing badge unlocked sound');
        vscode.window.setStatusBarMessage('🏅 ¡Nuevo logro desbloqueado!', 2000);
    }
    
    /**
     * Play a sound effect for XP earned
     */
    public static playXpEarned(): void {
        if (!this.isEnabled) return;
        
        console.log('🎵 Playing XP earned sound');
        vscode.window.setStatusBarMessage('⭐ ¡XP ganados!', 1500);
    }
    
    /**
     * Play a sound effect for level up
     */
    public static playLevelUp(): void {
        if (!this.isEnabled) return;
        
        console.log('🎵 Playing level up sound');
        vscode.window.setStatusBarMessage('🚀 ¡Subida de nivel!', 2500);
    }
    
    /**
     * Play a sound effect for challenge completed
     */
    public static playChallengeCompleted(): void {
        if (!this.isEnabled) return;
        
        console.log('🎵 Playing challenge completed sound');
        vscode.window.setStatusBarMessage('🎯 ¡Desafío completado!', 2000);
    }
}