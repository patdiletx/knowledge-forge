import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents cached content with metadata
 */
interface CachedContent {
    key: string;
    content: any;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    ttl: number; // Time to live in milliseconds
}

/**
 * Service for intelligent caching of AI-generated content
 */
export class IntelligentCacheService {
    private static readonly CACHE_DIR = '.knowledgeforge/cache';
    private static readonly MAX_CACHE_SIZE = 100; // Maximum number of cached items
    private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    /**
     * Generates a cache key based on input parameters
     * @param inputs Parameters to generate key from
     * @returns Generated cache key
     */
    public static generateKey(...inputs: string[]): string {
        const combined = inputs.join('|');
        return crypto.createHash('md5').update(combined).digest('hex');
    }

    /**
     * Gets cached content if available and not expired
     * @param key Cache key
     * @returns Cached content or null if not available or expired
     */
    public static async get(key: string): Promise<any> {
        try {
            const cachePath = this.getCachePath(key);
            
            // Check if cache file exists
            if (!fs.existsSync(cachePath)) {
                return null;
            }
            
            // Read cached content
            const data = fs.readFileSync(cachePath, 'utf8');
            const cached: CachedContent = JSON.parse(data);
            
            // Check if expired
            const now = new Date().getTime();
            if (now - new Date(cached.createdAt).getTime() > cached.ttl) {
                // Remove expired cache
                fs.unlinkSync(cachePath);
                return null;
            }
            
            // Update access metadata
            cached.lastAccessed = new Date();
            cached.accessCount++;
            
            // Save updated metadata
            fs.writeFileSync(cachePath, JSON.stringify(cached), 'utf8');
            
            return cached.content;
        } catch (error) {
            console.error('Error reading from cache:', error);
            return null;
        }
    }

    /**
     * Stores content in cache
     * @param key Cache key
     * @param content Content to cache
     * @param ttl Time to live in milliseconds (optional)
     */
    public static async set(key: string, content: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        try {
            // Ensure cache directory exists
            this.ensureCacheDirectory();
            
            // Create cache entry
            const cached: CachedContent = {
                key,
                content,
                createdAt: new Date(),
                lastAccessed: new Date(),
                accessCount: 0,
                ttl
            };
            
            // Save to cache file
            const cachePath = this.getCachePath(key);
            fs.writeFileSync(cachePath, JSON.stringify(cached), 'utf8');
            
            // Manage cache size
            await this.manageCacheSize();
        } catch (error) {
            console.error('Error writing to cache:', error);
        }
    }

    /**
     * Invalidates cache entry
     * @param key Cache key to invalidate
     */
    public static async invalidate(key: string): Promise<void> {
        try {
            const cachePath = this.getCachePath(key);
            if (fs.existsSync(cachePath)) {
                fs.unlinkSync(cachePath);
            }
        } catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }

    /**
     * Clears all cache entries
     */
    public static async clear(): Promise<void> {
        try {
            const cacheDir = this.getCacheDirectory();
            if (fs.existsSync(cacheDir)) {
                const files = fs.readdirSync(cacheDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(cacheDir, file));
                }
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    /**
     * Gets cache statistics
     */
    public static async getStats(): Promise<{ 
        count: number; 
        size: number; 
        oldest: Date | null; 
        newest: Date | null 
    }> {
        try {
            const cacheDir = this.getCacheDirectory();
            
            if (!fs.existsSync(cacheDir)) {
                return { count: 0, size: 0, oldest: null, newest: null };
            }
            
            const files = fs.readdirSync(cacheDir);
            let count = 0;
            let size = 0;
            let oldest: Date | null = null;
            let newest: Date | null = null;
            
            for (const file of files) {
                const filePath = path.join(cacheDir, file);
                const stats = fs.statSync(filePath);
                count++;
                size += stats.size;
                
                const data = fs.readFileSync(filePath, 'utf8');
                const cached: CachedContent = JSON.parse(data);
                
                const createdAt = new Date(cached.createdAt);
                if (!oldest || createdAt < oldest) {
                    oldest = createdAt;
                }
                if (!newest || createdAt > newest) {
                    newest = createdAt;
                }
            }
            
            return { count, size, oldest, newest };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return { count: 0, size: 0, oldest: null, newest: null };
        }
    }

    /**
     * Ensures cache directory exists
     */
    private static ensureCacheDirectory(): void {
        const cacheDir = this.getCacheDirectory();
        
        // Try to create in workspace first
        if (!fs.existsSync(cacheDir)) {
            try {
                fs.mkdirSync(cacheDir, { recursive: true });
            } catch (error) {
                console.error('Error creating cache directory:', error);
            }
        }
    }

    /**
     * Gets the cache directory path
     */
    private static getCacheDirectory(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            // Fallback to extension storage if no workspace
            throw new Error('No workspace folder available for caching');
        }
        
        return path.join(workspaceFolders[0].uri.fsPath, this.CACHE_DIR);
    }

    /**
     * Gets the cache file path for a key
     */
    private static getCachePath(key: string): string {
        return path.join(this.getCacheDirectory(), `${key}.json`);
    }

    /**
     * Manages cache size by removing least recently used items
     */
    private static async manageCacheSize(): Promise<void> {
        try {
            const cacheDir = this.getCacheDirectory();
            
            if (!fs.existsSync(cacheDir)) {
                return;
            }
            
            const files = fs.readdirSync(cacheDir);
            
            // If we're under the limit, no need to clean
            if (files.length <= this.MAX_CACHE_SIZE) {
                return;
            }
            
            // Read all cache entries and sort by last accessed time
            const entries: { file: string; lastAccessed: Date }[] = [];
            
            for (const file of files) {
                const filePath = path.join(cacheDir, file);
                try {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const cached: CachedContent = JSON.parse(data);
                    entries.push({
                        file,
                        lastAccessed: new Date(cached.lastAccessed)
                    });
                } catch (error) {
                    // If we can't read the file, delete it
                    fs.unlinkSync(filePath);
                }
            }
            
            // Sort by last accessed (oldest first)
            entries.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
            
            // Remove oldest entries until we're under the limit
            const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
            for (const entry of toRemove) {
                const filePath = path.join(cacheDir, entry.file);
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Error managing cache size:', error);
        }
    }
}