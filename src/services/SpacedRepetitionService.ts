import * as vscode from 'vscode';

// Review item interface
export interface SpacedRepetitionItem {
    id: string;
    concept: string;
    description: string;
    difficulty: number; // 1-5 scale
    lastReviewed: Date;
    nextReview: Date;
    interval: number; // in days
    easeFactor: number; // SM-2 algorithm factor
    repetitionCount: number;
    reviewHistory: ReviewHistoryEntry[];
}

export interface ReviewHistoryEntry {
    date: Date;
    rating: number; // 1-4 (again, hard, good, easy)
    interval: number;
}

// Review session interface
export interface ReviewSession {
    id: string;
    items: SpacedRepetitionItem[];
    createdAt: Date;
    completedAt?: Date;
    score?: number;
}

export class SpacedRepetitionService {
    static readonly ITEMS_KEY = 'spacedRepetition.items';
    static readonly SESSIONS_KEY = 'spacedRepetition.sessions';

    /**
     * Initialize a new spaced repetition item
     */
    static createItem(concept: string, description: string, difficulty: number = 3): SpacedRepetitionItem {
        const now = new Date();
        return {
            id: this.generateId(),
            concept,
            description,
            difficulty,
            lastReviewed: now,
            nextReview: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day default
            interval: 1,
            easeFactor: 2.5,
            repetitionCount: 0,
            reviewHistory: []
        };
    }

    /**
     * Get all spaced repetition items
     */
    static getItems(context: vscode.ExtensionContext): SpacedRepetitionItem[] {
        const storedItems = context.globalState.get<SpacedRepetitionItem[]>(this.ITEMS_KEY, []);
        return storedItems.map(item => ({
            ...item,
            lastReviewed: new Date(item.lastReviewed),
            nextReview: new Date(item.nextReview),
            reviewHistory: item.reviewHistory.map(entry => ({
                ...entry,
                date: new Date(entry.date)
            }))
        }));
    }

    /**
     * Save all spaced repetition items
     */
    static saveItems(context: vscode.ExtensionContext, items: SpacedRepetitionItem[]): void {
        context.globalState.update(this.ITEMS_KEY, items);
    }

    /**
     * Add a new item to the spaced repetition system
     */
    static addItem(context: vscode.ExtensionContext, item: SpacedRepetitionItem): void {
        const items = this.getItems(context);
        items.push(item);
        this.saveItems(context, items);
    }

    /**
     * Get items that are due for review
     */
    static getDueItems(context: vscode.ExtensionContext): SpacedRepetitionItem[] {
        const items = this.getItems(context);
        const now = new Date();
        return items.filter(item => item.nextReview <= now);
    }

    /**
     * Process a review for an item using the SM-2 algorithm
     * Rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
     */
    static processReview(context: vscode.ExtensionContext, itemId: string, rating: number): void {
        if (rating < 1 || rating > 4) {
            throw new Error('Rating must be between 1 and 4');
        }

        const items = this.getItems(context);
        const itemIndex = items.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            throw new Error(`Item with id ${itemId} not found`);
        }

        const item = items[itemIndex];
        const now = new Date();
        
        // Add to review history
        item.reviewHistory.push({
            date: now,
            rating,
            interval: item.interval
        });

        // Update last reviewed date
        item.lastReviewed = now;
        
        // Apply SM-2 algorithm
        if (rating < 3) {
            // If rating is "again" or "hard", reset repetition count
            item.repetitionCount = 0;
            item.interval = 1;
        } else {
            // If rating is "good" or "easy"
            if (item.repetitionCount === 0) {
                item.interval = 1;
            } else if (item.repetitionCount === 1) {
                item.interval = 6;
            } else {
                item.interval = Math.round(item.interval * item.easeFactor);
            }
            
            item.repetitionCount++;
        }

        // Adjust ease factor
        item.easeFactor = item.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        if (item.easeFactor < 1.3) {
            item.easeFactor = 1.3;
        }

        // Calculate next review date
        item.nextReview = new Date(now.getTime() + item.interval * 24 * 60 * 60 * 1000);

        // Update items
        items[itemIndex] = item;
        this.saveItems(context, items);
    }

    /**
     * Create a new review session with due items
     */
    static createReviewSession(context: vscode.ExtensionContext, maxItems: number = 5): ReviewSession {
        const dueItems = this.getDueItems(context);
        const selectedItems = dueItems.slice(0, maxItems);
        
        return {
            id: this.generateId(),
            items: selectedItems,
            createdAt: new Date()
        };
    }

    /**
     * Get all review sessions
     */
    static getSessions(context: vscode.ExtensionContext): ReviewSession[] {
        const storedSessions = context.globalState.get<ReviewSession[]>(this.SESSIONS_KEY, []);
        return storedSessions.map(session => ({
            ...session,
            createdAt: new Date(session.createdAt),
            completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
            items: session.items.map(item => ({
                ...item,
                lastReviewed: new Date(item.lastReviewed),
                nextReview: new Date(item.nextReview),
                reviewHistory: item.reviewHistory.map(entry => ({
                    ...entry,
                    date: new Date(entry.date)
                }))
            }))
        }));
    }

    /**
     * Save review sessions
     */
    static saveSessions(context: vscode.ExtensionContext, sessions: ReviewSession[]): void {
        context.globalState.update(this.SESSIONS_KEY, sessions);
    }

    /**
     * Complete a review session
     */
    static completeSession(context: vscode.ExtensionContext, sessionId: string, score: number): void {
        const sessions = this.getSessions(context);
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);
        
        if (sessionIndex === -1) {
            throw new Error(`Session with id ${sessionId} not found`);
        }

        sessions[sessionIndex].completedAt = new Date();
        sessions[sessionIndex].score = score;
        
        this.saveSessions(context, sessions);
    }

    /**
     * Add concept-based items to the spaced repetition system
     * These would typically come from completed tasks in the learning system
     */
    static addConceptsFromTask(context: vscode.ExtensionContext, taskId: string, concepts: {name: string, description: string}[]): void {
        for (const concept of concepts) {
            // Check if concept already exists
            const existingItems = this.getItems(context);
            const existingItem = existingItems.find(item => item.concept === concept.name);
            
            if (!existingItem) {
                // Create new item for concept
                const newItem = this.createItem(concept.name, concept.description);
                this.addItem(context, newItem);
            }
        }
    }

    /**
     * Generate a unique ID
     */
    private static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}