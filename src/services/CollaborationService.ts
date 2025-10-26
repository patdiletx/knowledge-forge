import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { ProjectStateService } from './ProjectStateService';

// Types for collaboration system
export interface CommunitySolution {
    id: string;
    taskId: string;
    roadmapId: string;
    authorId: string;
    authorName: string;
    code: string;
    description: string;
    language: string;
    createdAt: Date;
    upvotes: number;
    downvotes: number;
    comments: SolutionComment[];
}

export interface SolutionComment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: Date;
    upvotes: number;
    downvotes: number;
}

export interface StudyBuddy {
    userId: string;
    userName: string;
    skillLevel: string;
    interests: string[];
    lastActive: Date;
    compatibilityScore: number;
}

export interface KarmaRecord {
    userId: string;
    action: KarmaAction;
    points: number;
    timestamp: Date;
    description: string;
}

export type KarmaAction = 'helped' | 'receivedHelp' | 'sharedSolution' | 'commented' | 'upvoted';

export class CollaborationService {
    static readonly SOLUTIONS_KEY = 'collaboration.solutions';
    static readonly BUDDIES_KEY = 'collaboration.buddies';
    static readonly KARMA_KEY = 'collaboration.karma';

    /**
     * Submit a solution to the community gallery
     */
    static submitSolution(
        context: vscode.ExtensionContext,
        taskId: string,
        roadmapId: string,
        code: string,
        description: string,
        language: string
    ): CommunitySolution {
        const solution: CommunitySolution = {
            id: this.generateId(),
            taskId,
            roadmapId,
            authorId: this.getCurrentUserId(context),
            authorName: this.getCurrentUserName(context),
            code: this.anonymizeCode(code),
            description,
            language,
            createdAt: new Date(),
            upvotes: 0,
            downvotes: 0,
            comments: []
        };

        // Save solution
        const solutions = this.getSolutions(context);
        solutions.push(solution);
        context.globalState.update(this.SOLUTIONS_KEY, solutions);

        // Award karma for sharing
        this.awardKarma(context, 'sharedSolution', 10, 'Compartiste una solución con la comunidad');

        return solution;
    }

    /**
     * Get solutions for a specific task
     */
    static getSolutionsForTask(context: vscode.ExtensionContext, taskId: string): CommunitySolution[] {
        const solutions = this.getSolutions(context);
        return solutions.filter(solution => solution.taskId === taskId);
    }

    /**
     * Get all community solutions
     */
    static getSolutions(context: vscode.ExtensionContext): CommunitySolution[] {
        const storedSolutions = context.globalState.get<CommunitySolution[]>(this.SOLUTIONS_KEY, []);
        return storedSolutions.map(solution => ({
            ...solution,
            createdAt: new Date(solution.createdAt),
            comments: solution.comments.map(comment => ({
                ...comment,
                createdAt: new Date(comment.createdAt)
            }))
        }));
    }

    /**
     * Upvote a solution
     */
    static upvoteSolution(context: vscode.ExtensionContext, solutionId: string): void {
        const solutions = this.getSolutions(context);
        const solutionIndex = solutions.findIndex(s => s.id === solutionId);
        
        if (solutionIndex !== -1) {
            solutions[solutionIndex].upvotes++;
            context.globalState.update(this.SOLUTIONS_KEY, solutions);
            
            // Award karma for upvoting
            this.awardKarma(context, 'upvoted', 1, 'Votaste positivamente una solución');
        }
    }

    /**
     * Downvote a solution
     */
    static downvoteSolution(context: vscode.ExtensionContext, solutionId: string): void {
        const solutions = this.getSolutions(context);
        const solutionIndex = solutions.findIndex(s => s.id === solutionId);
        
        if (solutionIndex !== -1) {
            solutions[solutionIndex].downvotes++;
            context.globalState.update(this.SOLUTIONS_KEY, solutions);
        }
    }

    /**
     * Add a comment to a solution
     */
    static addCommentToSolution(
        context: vscode.ExtensionContext,
        solutionId: string,
        content: string
    ): SolutionComment {
        const solutions = this.getSolutions(context);
        const solutionIndex = solutions.findIndex(s => s.id === solutionId);
        
        if (solutionIndex !== -1) {
            const comment: SolutionComment = {
                id: this.generateId(),
                authorId: this.getCurrentUserId(context),
                authorName: this.getCurrentUserName(context),
                content,
                createdAt: new Date(),
                upvotes: 0,
                downvotes: 0
            };

            solutions[solutionIndex].comments.push(comment);
            context.globalState.update(this.SOLUTIONS_KEY, solutions);
            
            // Award karma for commenting
            this.awardKarma(context, 'commented', 2, 'Comentaste en una solución');
            
            return comment;
        }
        
        throw new Error('Solution not found');
    }

    /**
     * Get potential study buddies
     */
    static getStudyBuddies(context: vscode.ExtensionContext): StudyBuddy[] {
        // In a real implementation, this would match users based on skills and interests
        // For now, we'll return some mock data
        return [
            {
                userId: 'user-1',
                userName: 'Alex Developer',
                skillLevel: 'Intermediate',
                interests: ['JavaScript', 'React', 'Node.js'],
                lastActive: new Date(),
                compatibilityScore: 85
            },
            {
                userId: 'user-2',
                userName: 'Sam Coder',
                skillLevel: 'Advanced',
                interests: ['TypeScript', 'Vue', 'Python'],
                lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
                compatibilityScore: 78
            },
            {
                userId: 'user-3',
                userName: 'Jordan Programmer',
                skillLevel: 'Beginner',
                interests: ['JavaScript', 'CSS', 'HTML'],
                lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                compatibilityScore: 92
            }
        ];
    }

    /**
     * Request help from the community
     */
    static requestCommunityHelp(context: vscode.ExtensionContext, taskId: string, question: string): void {
        // In a real implementation, this would send a request to the community
        // For now, we'll just show a notification
        vscode.window.showInformationMessage(
            `🆘 ¡Ayuda solicitada! Tu pregunta: "${question}" ha sido enviada a la comunidad.`
        );
        
        // Award karma for seeking help
        this.awardKarma(context, 'receivedHelp', 5, 'Solicitaste ayuda a la comunidad');
    }

    /**
     * Get user's karma
     */
    static getUserKarma(context: vscode.ExtensionContext): number {
        const karmaRecords = this.getKarmaRecords(context);
        return karmaRecords.reduce((total, record) => total + record.points, 0);
    }

    /**
     * Get karma records
     */
    static getKarmaRecords(context: vscode.ExtensionContext): KarmaRecord[] {
        const storedRecords = context.globalState.get<KarmaRecord[]>(this.KARMA_KEY, []);
        return storedRecords.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp)
        }));
    }

    /**
     * Award karma to user
     */
    static awardKarma(
        context: vscode.ExtensionContext,
        action: KarmaAction,
        points: number,
        description: string
    ): void {
        const karmaRecord: KarmaRecord = {
            userId: this.getCurrentUserId(context),
            action,
            points,
            timestamp: new Date(),
            description
        };

        const records = this.getKarmaRecords(context);
        records.push(karmaRecord);
        context.globalState.update(this.KARMA_KEY, records);

        // Show notification
        vscode.window.showInformationMessage(`+${points} karma: ${description}`);
    }

    /**
     * Anonymize code by removing identifying information
     */
    private static anonymizeCode(code: string): string {
        // In a real implementation, this would be more sophisticated
        // For now, we'll just return the code as is
        return code;
    }

    /**
     * Get current user ID
     */
    private static getCurrentUserId(context: vscode.ExtensionContext): string {
        // In a real implementation, this would be tied to a real user system
        return 'user-' + crypto.createHash('md5').update(context.extensionPath).digest('hex').substring(0, 8);
    }

    /**
     * Get current user name
     */
    private static getCurrentUserName(context: vscode.ExtensionContext): string {
        // Try to get from settings or use a default
        const config = vscode.workspace.getConfiguration('knowledgeforge');
        return config.get('userName', 'Usuario Anónimo');
    }

    /**
     * Generate a unique ID
     */
    private static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}