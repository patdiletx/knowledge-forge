import * as vscode from 'vscode';

export interface Hint {
    id: string;
    level: number; // 1 = vague, 2 = specific, 3 = example
    message: string;
    relatedFile?: string;
    relatedLine?: number;
}

export interface StrugglingPattern {
    id: string;
    name: string;
    description: string;
    detectionCondition: (context: vscode.ExtensionContext) => boolean;
    suggestedHintIds: string[];
}

export interface PraisePoint {
    id: string;
    name: string;
    description: string;
    detectionCondition: (context: vscode.ExtensionContext) => boolean;
    xpReward: number;
}

export class EducationalHintsService {
    private static readonly HINTS_STORAGE_KEY = 'educationalHints';
    private static readonly STRUGGLING_PATTERNS_STORAGE_KEY = 'strugglingPatterns';
    private static readonly PRAISE_POINTS_STORAGE_KEY = 'praisePoints';
    
    // Common programming hints by category
    private static commonHints: Hint[] = [
        // Data structures
        {
            id: 'ds-1',
            level: 1,
            message: "Piensa en la estructura de datos más eficiente para este problema."
        },
        {
            id: 'ds-2',
            level: 2,
            message: "Un Map sería más eficiente aquí porque necesitas asociar claves con valores."
        },
        {
            id: 'ds-3',
            level: 3,
            message: "Ejemplo: const myMap = new Map(); myMap.set('key', 'value');"
        },
        
        // Functions
        {
            id: 'func-1',
            level: 1,
            message: "Considera dividir esta lógica en funciones más pequeñas y reutilizables."
        },
        {
            id: 'func-2',
            level: 2,
            message: "Esta función está haciendo demasiadas cosas. Sepárala en funciones más pequeñas con una sola responsabilidad."
        },
        {
            id: 'func-3',
            level: 3,
            message: "Ejemplo: function processData(data) { return data.map(item => transformItem(item)); }"
        },
        
        // Performance
        {
            id: 'perf-1',
            level: 1,
            message: "Piensa en la eficiencia de tu solución. ¿Hay una forma más rápida de hacer esto?"
        },
        {
            id: 'perf-2',
            level: 2,
            message: "Este bucle anidado tiene complejidad O(n²). ¿Puedes optimizarlo usando un Map o Set?"
        },
        {
            id: 'perf-3',
            level: 3,
            message: "Ejemplo: En lugar de buscar en un array en cada iteración, usa un Set para búsquedas O(1)."
        },
        
        // Async
        {
            id: 'async-1',
            level: 1,
            message: "¿Estás manejando correctamente las operaciones asíncronas?"
        },
        {
            id: 'async-2',
            level: 2,
            message: "Usa async/await en lugar de callbacks para hacer el código más legible."
        },
        {
            id: 'async-3',
            level: 3,
            message: "Ejemplo: async function fetchData() { const response = await fetch(url); return response.json(); }"
        }
    ];
    
    // Common struggling patterns
    private static commonStrugglingPatterns: StrugglingPattern[] = [
        {
            id: 'struggle-1',
            name: "Long Editing Sessions",
            description: "User has been editing the same file for more than 5 minutes without saving progress",
            detectionCondition: (context: vscode.ExtensionContext) => {
                // This would be implemented with actual time tracking
                return false; // Placeholder
            },
            suggestedHintIds: ['func-1', 'func-2']
        },
        {
            id: 'struggle-2',
            name: "Frequent Undo/Redo",
            description: "User is frequently undoing and redoing changes, indicating confusion",
            detectionCondition: (context: vscode.ExtensionContext) => {
                // This would be implemented with actual action tracking
                return false; // Placeholder
            },
            suggestedHintIds: ['ds-1', 'ds-2']
        }
    ];
    
    // Praise points for good practices
    private static commonPraisePoints: PraisePoint[] = [
        {
            id: 'praise-1',
            name: "Good Variable Naming",
            description: "Using descriptive variable names that clearly indicate their purpose",
            detectionCondition: (context: vscode.ExtensionContext) => {
                // This would be implemented with actual code analysis
                return false; // Placeholder
            },
            xpReward: 10
        },
        {
            id: 'praise-2',
            name: "Effective Modularity",
            description: "Breaking code into small, reusable functions",
            detectionCondition: (context: vscode.ExtensionContext) => {
                // This would be implemented with actual code analysis
                return false; // Placeholder
            },
            xpReward: 15
        }
    ];
    
    /**
     * Get hints for a specific context or file
     */
    public static getHints(context: vscode.ExtensionContext, level: number = 1, category?: string): Hint[] {
        // In a real implementation, this would filter hints based on:
        // 1. The current task context
        // 2. The level of hint requested
        // 3. The category of issue (if specified)
        // 4. User's progress and past hints
        
        return this.commonHints.filter(hint => 
            hint.level === level && 
            (!category || hint.id.startsWith(category))
        );
    }
    
    /**
     * Get next level hint for a specific hint ID
     */
    public static getNextLevelHint(context: vscode.ExtensionContext, currentHintId: string): Hint | undefined {
        const currentHint = this.commonHints.find(h => h.id === currentHintId);
        if (!currentHint || currentHint.level >= 3) {
            return undefined; // No next level
        }
        
        const nextLevel = currentHint.level + 1;
        // Try to find a hint in the same category
        const category = currentHintId.split('-')[0];
        return this.commonHints.find(h => 
            h.id.startsWith(category) && 
            h.level === nextLevel
        );
    }
    
    /**
     * Detect if user is struggling based on patterns
     */
    public static detectStrugglingPatterns(context: vscode.ExtensionContext): StrugglingPattern[] {
        return this.commonStrugglingPatterns.filter(pattern => 
            pattern.detectionCondition(context)
        );
    }
    
    /**
     * Detect praise points for good practices
     */
    public static detectPraisePoints(context: vscode.ExtensionContext): PraisePoint[] {
        return this.commonPraisePoints.filter(point => 
            point.detectionCondition(context)
        );
    }
    
    /**
     * Show progressive hint in the UI
     */
    public static async showProgressiveHint(context: vscode.ExtensionContext, hint: Hint): Promise<void> {
        const hintLevelLabels = ['Vago', 'Específico', 'Ejemplo'];
        const levelLabel = hintLevelLabels[hint.level - 1] || 'Desconocido';
        
        const message = `[💡 Pista Nivel ${hint.level} - ${levelLabel}] ${hint.message}`;
        
        // Save hint to history
        await this.saveHintToHistory(context, hint);
        
        vscode.window.showInformationMessage(message, 'Siguiente nivel', 'Cerrar')
            .then(selection => {
                if (selection === 'Siguiente nivel') {
                    const nextHint = this.getNextLevelHint(context, hint.id);
                    if (nextHint) {
                        this.showProgressiveHint(context, nextHint);
                    } else {
                        vscode.window.showInformationMessage('No hay más pistas disponibles para esta categoría.');
                    }
                }
            });
    }
    
    /**
     * Save hint to user's history
     */
    private static async saveHintToHistory(context: vscode.ExtensionContext, hint: Hint): Promise<void> {
        const hintHistory = context.workspaceState.get<Hint[]>(this.HINTS_STORAGE_KEY, []);
        hintHistory.push(hint);
        await context.workspaceState.update(this.HINTS_STORAGE_KEY, hintHistory);
    }
    
    /**
     * Get user's hint history
     */
    public static getHintHistory(context: vscode.ExtensionContext): Hint[] {
        return context.workspaceState.get<Hint[]>(this.HINTS_STORAGE_KEY, []);
    }
    
    /**
     * Show praise message for good practices
     */
    public static async showPraise(context: vscode.ExtensionContext, praisePoint: PraisePoint): Promise<void> {
        const message = `🎉 ¡Excelente trabajo! ${praisePoint.name}: ${praisePoint.description}`;
        vscode.window.showInformationMessage(message);
        
        // In a real implementation, we would award XP here
        // For now, we just show the message
    }
}