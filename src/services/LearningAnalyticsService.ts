import * as vscode from 'vscode';
import { ProjectStateService } from './ProjectStateService';
import { MicroLearningService } from './MicroLearningService';

export interface LearningMetrics {
    totalTimeSpent: number;
    tasksCompleted: number;
    hintsUsed: number;
    startDate: Date;
    lastActiveDate: Date;
    dailyActivity: Record<string, number>; // date -> minutes spent
    taskMetrics: Record<string, TaskMetric>;
}

export interface TaskMetric {
    taskId: string;
    timeSpent: number;
    hintsUsed: number;
    attempts: number;
    completed: boolean;
    estimatedVsActual: { estimated: number; actual: number };
}

export interface AnalyticsDashboardData {
    heatmapData: HeatmapData[];
    velocityData: VelocityPoint[];
    skillsRadarData: SkillsRadarData[];
    streakData: StreakData;
    timeToMasteryPredictions: TimeToMasteryPrediction[];
}

export interface HeatmapData {
    date: string;
    value: number; // minutes spent
}

export interface VelocityPoint {
    week: string;
    tasksPerWeek: number;
}

export interface SkillsRadarData {
    skill: string;
    level: number; // 0-100
}

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: Date;
}

export interface TimeToMasteryPrediction {
    skill: string;
    predictedDays: number;
    confidence: number; // 0-100
}

export class LearningAnalyticsService {
    static readonly METRICS_KEY = 'learningAnalytics.metrics';
    static readonly ACTIVITY_KEY = 'learningAnalytics.activity';

    /**
     * Initialize or get existing metrics for the current user/project
     */
    static getMetrics(context: vscode.ExtensionContext): LearningMetrics {
        const storedMetrics = context.globalState.get<LearningMetrics>(this.METRICS_KEY);
        if (storedMetrics) {
            return {
                ...storedMetrics,
                startDate: new Date(storedMetrics.startDate),
                lastActiveDate: new Date(storedMetrics.lastActiveDate),
                dailyActivity: storedMetrics.dailyActivity
            };
        }

        return {
            totalTimeSpent: 0,
            tasksCompleted: 0,
            hintsUsed: 0,
            startDate: new Date(),
            lastActiveDate: new Date(),
            dailyActivity: {},
            taskMetrics: {}
        };
    }

    /**
     * Update metrics with new data
     */
    static updateMetrics(context: vscode.ExtensionContext, updates: Partial<LearningMetrics>): void {
        const currentMetrics = this.getMetrics(context);
        const updatedMetrics = { ...currentMetrics, ...updates };
        
        // Update last active date
        updatedMetrics.lastActiveDate = new Date();
        
        // Update daily activity
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        if (!updatedMetrics.dailyActivity[today]) {
            updatedMetrics.dailyActivity[today] = 0;
        }
        
        context.globalState.update(this.METRICS_KEY, updatedMetrics);
    }

    /**
     * Record time spent on a task
     */
    static recordTimeSpent(context: vscode.ExtensionContext, taskId: string, minutes: number): void {
        const metrics = this.getMetrics(context);
        
        // Update total time
        metrics.totalTimeSpent += minutes;
        
        // Update daily activity
        const today = new Date().toISOString().split('T')[0];
        metrics.dailyActivity[today] = (metrics.dailyActivity[today] || 0) + minutes;
        
        // Update task-specific metrics
        if (!metrics.taskMetrics[taskId]) {
            metrics.taskMetrics[taskId] = {
                taskId,
                timeSpent: 0,
                hintsUsed: 0,
                attempts: 1,
                completed: false,
                estimatedVsActual: { estimated: 0, actual: 0 }
            };
        }
        
        metrics.taskMetrics[taskId].timeSpent += minutes;
        
        this.updateMetrics(context, metrics);
    }

    /**
     * Record hint usage
     */
    static recordHintUsage(context: vscode.ExtensionContext, taskId: string): void {
        const metrics = this.getMetrics(context);
        
        // Increment global hint counter
        metrics.hintsUsed++;
        
        // Update task-specific metrics
        if (!metrics.taskMetrics[taskId]) {
            metrics.taskMetrics[taskId] = {
                taskId,
                timeSpent: 0,
                hintsUsed: 0,
                attempts: 1,
                completed: false,
                estimatedVsActual: { estimated: 0, actual: 0 }
            };
        }
        
        metrics.taskMetrics[taskId].hintsUsed++;
        
        this.updateMetrics(context, metrics);
    }

    /**
     * Record task completion
     */
    static recordTaskCompletion(context: vscode.ExtensionContext, taskId: string): void {
        const metrics = this.getMetrics(context);
        
        // Increment completed tasks
        metrics.tasksCompleted++;
        
        // Update task-specific metrics
        if (!metrics.taskMetrics[taskId]) {
            metrics.taskMetrics[taskId] = {
                taskId,
                timeSpent: 0,
                hintsUsed: 0,
                attempts: 1,
                completed: false,
                estimatedVsActual: { estimated: 0, actual: 0 }
            };
        }
        
        metrics.taskMetrics[taskId].completed = true;
        
        this.updateMetrics(context, metrics);
    }

    /**
     * Get dashboard data for visualization
     */
    static getDashboardData(context: vscode.ExtensionContext): AnalyticsDashboardData {
        const metrics = this.getMetrics(context);
        
        // Generate heatmap data (last 30 days)
        const heatmapData: HeatmapData[] = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            heatmapData.push({
                date: dateStr,
                value: metrics.dailyActivity[dateStr] || 0
            });
        }
        
        // Generate velocity data (tasks per week for last 8 weeks)
        const velocityData: VelocityPoint[] = [];
        // Simplified implementation - in a real app, we'd calculate this from historical data
        velocityData.push({ week: 'Current', tasksPerWeek: metrics.tasksCompleted });
        
        // Generate skills radar data
        const skillsRadarData: SkillsRadarData[] = [
            { skill: 'JavaScript', level: 70 },
            { skill: 'TypeScript', level: 60 },
            { skill: 'Node.js', level: 50 },
            { skill: 'VS Code API', level: 40 },
            { skill: 'Extension Development', level: 30 }
        ];
        
        // Calculate streak data
        const streakData: StreakData = {
            currentStreak: this.calculateCurrentStreak(metrics),
            longestStreak: this.calculateLongestStreak(metrics),
            lastActiveDate: metrics.lastActiveDate
        };
        
        // Generate time to mastery predictions
        const timeToMasteryPredictions: TimeToMasteryPrediction[] = [
            { skill: 'JavaScript', predictedDays: 45, confidence: 85 },
            { skill: 'TypeScript', predictedDays: 60, confidence: 80 },
            { skill: 'Node.js', predictedDays: 90, confidence: 75 }
        ];
        
        return {
            heatmapData,
            velocityData,
            skillsRadarData,
            streakData,
            timeToMasteryPredictions
        };
    }

    /**
     * Calculate current streak based on daily activity
     */
    private static calculateCurrentStreak(metrics: LearningMetrics): number {
        const dates = Object.keys(metrics.dailyActivity)
            .filter(date => metrics.dailyActivity[date] > 0)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        if (dates.length === 0) return 0;
        
        let streak = 1;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Check if user was active today
        if (!metrics.dailyActivity[todayStr]) {
            // If not active today, check yesterday
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (!metrics.dailyActivity[yesterdayStr]) {
                return 0; // No activity yesterday or today
            }
            
            // Start counting from yesterday
            today.setDate(today.getDate() - 1);
        }
        
        // Count consecutive days
        for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i - 1]);
            const previousDate = new Date(dates[i]);
            
            // Calculate difference in days
            const diffTime = currentDate.getTime() - previousDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    /**
     * Calculate longest streak based on daily activity
     */
    private static calculateLongestStreak(metrics: LearningMetrics): number {
        const dates = Object.keys(metrics.dailyActivity)
            .filter(date => metrics.dailyActivity[date] > 0)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        if (dates.length === 0) return 0;
        
        let maxStreak = 1;
        let currentStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i]);
            const previousDate = new Date(dates[i - 1]);
            
            // Calculate difference in days
            const diffTime = currentDate.getTime() - previousDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        
        return maxStreak;
    }
}