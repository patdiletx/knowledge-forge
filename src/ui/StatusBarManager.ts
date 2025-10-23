import * as vscode from 'vscode';
import { ProjectStateService } from '../services/ProjectStateService';

export class StatusBarManager {
    private static statusBarItem: vscode.StatusBarItem;

    public static initialize(context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        context.subscriptions.push(this.statusBarItem);
        this.statusBarItem.command = 'knowledgeforge.showProjectStatus'; // Comando a ejecutar al hacer clic
    }

    public static update(context: vscode.ExtensionContext) {
        const state = ProjectStateService.getState(context);

        if (state && state.projectInitialized) {
            const progress = ProjectStateService.getProgress(state);
            const totalXp = state.totalXp || 0;

            this.statusBarItem.text = `🎓 KF: ${progress.percentage}% | ${totalXp} XP`;
            this.statusBarItem.tooltip = `KnowledgeForge: ${progress.completed}/${progress.total} tareas completadas.`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    public static dispose() {
        this.statusBarItem.dispose();
    }
}
