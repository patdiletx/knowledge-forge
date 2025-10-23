import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RoadmapPhase } from './RoadmapService';
import { AIServiceFactory } from './AIServiceFactory';
import { LearningResourcesService } from './LearningResourcesService';

/**
 * Servicio para generar estructura de proyectos basada en roadmaps
 */
export class ProjectGeneratorService {
    /**
     * Genera la estructura inicial del proyecto basada en el roadmap
     */
    public static async generateProjectStructure(
        roadmap: RoadmapPhase[],
        targetPath: string,
        apiKey?: string
    ): Promise<void> {
        // Determinar el tipo de proyecto basado en el roadmap
        const projectType = this.detectProjectType(roadmap);

        // Crear estructura base
        await this.createBaseStructure(targetPath, projectType);

        // Generar materiales de aprendizaje (NUEVO)
        await LearningResourcesService.generateLearningMaterials(roadmap, targetPath, apiKey);

        // Si hay API Key, generar estructura personalizada con IA
        if (apiKey) {
            await this.generateAIStructure(roadmap, targetPath, apiKey);
        }

        // Crear archivo de roadmap
        await this.createRoadmapFile(roadmap, targetPath);

        // Crear archivo README del proyecto
        await this.createProjectReadme(roadmap, targetPath, projectType);
    }

    /**
     * Detecta el tipo de proyecto basado en el roadmap
     */
    private static detectProjectType(roadmap: RoadmapPhase[]): string {
        const allText = roadmap.map(p => `${p.title} ${p.description} ${p.tasks.join(' ')}`).join(' ').toLowerCase();

        if (allText.includes('react') || allText.includes('frontend') || allText.includes('web')) {
            return 'web-frontend';
        } else if (allText.includes('node') || allText.includes('backend') || allText.includes('api')) {
            return 'backend';
        } else if (allText.includes('fullstack') || allText.includes('full stack')) {
            return 'fullstack';
        }

        return 'general';
    }

    /**
     * Crea la estructura base del proyecto
     */
    private static async createBaseStructure(targetPath: string, projectType: string): Promise<void> {
        // Crear directorio principal si no existe
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        const structures: { [key: string]: string[] } = {
            'web-frontend': [
                'src',
                'src/components',
                'src/styles',
                'src/utils',
                'public',
                'tests'
            ],
            'backend': [
                'src',
                'src/controllers',
                'src/services',
                'src/models',
                'src/routes',
                'src/middleware',
                'src/utils',
                'tests',
                'config'
            ],
            'fullstack': [
                'client',
                'client/src',
                'client/public',
                'server',
                'server/src',
                'server/tests',
                'shared'
            ],
            'general': [
                'src',
                'tests',
                'docs'
            ]
        };

        const dirs = structures[projectType] || structures['general'];

        for (const dir of dirs) {
            const dirPath = path.join(targetPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }

        // Crear .gitignore
        const gitignoreContent = `node_modules/
dist/
build/
.env
.DS_Store
*.log
coverage/
.vscode/
.knowledgeforge/state.json
`;
        fs.writeFileSync(path.join(targetPath, '.gitignore'), gitignoreContent);
    }

    /**
     * Genera estructura personalizada usando IA
     */
    private static async generateAIStructure(
        roadmap: RoadmapPhase[],
        targetPath: string,
        apiKey: string
    ): Promise<void> {
        try {
            const aiService = AIServiceFactory.createService(apiKey);
            const prompt = this.buildProjectStructurePrompt(roadmap);

            // Generar sugerencias de archivos con IA
            const suggestions = await aiService.generateContent(prompt);

            // Guardar sugerencias en un archivo
            fs.writeFileSync(
                path.join(targetPath, 'AI_SUGGESTIONS.md'),
                `# Sugerencias de IA para el Proyecto\n\n${suggestions}`
            );
        } catch (error) {
            console.error('Error generando estructura con IA:', error);
            // No es crítico, continuar sin sugerencias de IA
        }
    }

    /**
     * Construye el prompt para generar estructura de proyecto
     */
    private static buildProjectStructurePrompt(roadmap: RoadmapPhase[]): string {
        const roadmapText = roadmap.map((phase, i) =>
            `Fase ${i + 1}: ${phase.title}\n${phase.tasks.map(t => `- ${t}`).join('\n')}`
        ).join('\n\n');

        return `Basándote en el siguiente roadmap de aprendizaje, sugiere:

1. Archivos iniciales que deberían crearse
2. Dependencias que se necesitarán (package.json)
3. Configuración inicial recomendada
4. Primer archivo de código para empezar

Roadmap:
${roadmapText}

Proporciona sugerencias prácticas y específicas para que el desarrollador pueda empezar inmediatamente.`;
    }

    /**
     * Crea el archivo de roadmap en el proyecto
     */
    private static async createRoadmapFile(roadmap: RoadmapPhase[], targetPath: string): Promise<void> {
        let content = `# 📋 Roadmap del Proyecto\n\n`;
        content += `*Generado por KnowledgeForge*\n\n`;
        content += `## Fases del Proyecto\n\n`;

        roadmap.forEach((phase, i) => {
            content += `### Fase ${i + 1}: ${phase.title}\n\n`;
            if (phase.description) {
                content += `${phase.description}\n\n`;
            }
            content += `**Tareas:**\n\n`;
            phase.tasks.forEach((task, j) => {
                content += `- [ ] ${task}\n`;
            });
            content += `\n`;
        });

        content += `\n---\n\n`;
        content += `## Cómo usar este roadmap\n\n`;
        content += `1. Completa las tareas en orden\n`;
        content += `2. Marca las casillas cuando termines cada tarea\n`;
        content += `3. Usa "KnowledgeForge: Revisar Tarea" para obtener feedback\n`;
        content += `4. Avanza a la siguiente fase cuando completes todas las tareas\n`;

        fs.writeFileSync(path.join(targetPath, 'ROADMAP.md'), content);
    }

    /**
     * Crea el README del proyecto
     */
    private static async createProjectReadme(
        roadmap: RoadmapPhase[],
        targetPath: string,
        projectType: string
    ): Promise<void> {
        const projectName = path.basename(targetPath);

        let content = `# ${projectName}\n\n`;
        content += `Proyecto generado con **KnowledgeForge** - Tu Aula del Conocimiento.\n\n`;
        content += `## 📚 Sobre este Proyecto\n\n`;
        content += `Este proyecto fue diseñado como parte de un roadmap de aprendizaje personalizado.\n\n`;
        content += `**Tipo:** ${projectType}\n\n`;
        content += `**Fases:** ${roadmap.length}\n\n`;
        content += `## 🚀 Comenzar\n\n`;
        content += `1. Lee el archivo \`ROADMAP.md\` para ver todas las fases\n`;
        content += `2. Empieza con la Fase 1\n`;
        content += `3. Usa KnowledgeForge en VS Code para seguimiento\n\n`;
        content += `## 📖 Roadmap Resumido\n\n`;

        roadmap.forEach((phase, i) => {
            content += `### ${i + 1}. ${phase.title}\n`;
            if (phase.description) {
                content += `${phase.description}\n`;
            }
            content += `\n`;
        });

        content += `\n## 🛠️ Desarrollo\n\n`;
        content += `Consulta \`ROADMAP.md\` para la lista completa de tareas.\n\n`;
        content += `---\n\n`;
        content += `*Proyecto generado automáticamente por [KnowledgeForge](https://github.com/yourusername/knowledge-forge)*\n`;

        fs.writeFileSync(path.join(targetPath, 'README.md'), content);
    }

    /**
     * Verifica si un directorio es válido para inicializar un proyecto
     */
    public static isValidProjectDirectory(dirPath: string): boolean {
        if (!fs.existsSync(dirPath)) {
            return false;
        }

        const stats = fs.statSync(dirPath);
        return stats.isDirectory();
    }
}
