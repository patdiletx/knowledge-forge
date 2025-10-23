import * as fs from 'fs';
import * as path from 'path';
import { RoadmapPhase } from './RoadmapService';
import { AIServiceFactory } from './AIServiceFactory';

/**
 * Servicio para generar recursos de aprendizaje educativos
 */
export class LearningResourcesService {
    /**
     * Genera archivos de estudio para cada fase del roadmap
     */
    public static async generateLearningMaterials(
        roadmap: RoadmapPhase[],
        projectPath: string,
        apiKey?: string
    ): Promise<void> {
        const docsPath = path.join(projectPath, 'docs');

        // Crear carpeta docs si no existe
        if (!fs.existsSync(docsPath)) {
            fs.mkdirSync(docsPath, { recursive: true });
        }

        // Generar guía general
        await this.generateGeneralGuide(roadmap, docsPath);

        // Si hay API key, generar guías con IA para cada fase
        if (apiKey) {
            await this.generateAIGuides(roadmap, docsPath, apiKey);
        } else {
            // Sin API key, generar guías básicas
            await this.generateBasicGuides(roadmap, docsPath);
        }
    }

    /**
     * Genera una guía general del proyecto
     */
    private static async generateGeneralGuide(
        roadmap: RoadmapPhase[],
        docsPath: string
    ): Promise<void> {
        let content = `# 📚 Guía de Aprendizaje - Tu Roadmap Personalizado\n\n`;
        content += `Bienvenido a tu proyecto de aprendizaje. Esta guía te ayudará a completar cada fase de tu roadmap.\n\n`;
        content += `## 🎯 Estructura del Proyecto\n\n`;
        content += `Tu proyecto está organizado en **${roadmap.length} fases** progresivas:\n\n`;

        roadmap.forEach((phase, index) => {
            content += `### Fase ${index + 1}: ${phase.title}\n\n`;
            if (phase.description) {
                content += `${phase.description}\n\n`;
            }
            content += `**Tareas (${phase.tasks.length}):**\n`;
            phase.tasks.forEach(task => {
                content += `- ${task}\n`;
            });
            content += `\n📖 **Guía detallada:** [Fase${index + 1}_Guia.md](./Fase${index + 1}_Guia.md)\n\n`;
        });

        content += `## 🚀 Cómo Usar Este Proyecto\n\n`;
        content += `1. **Lee la guía de cada fase** antes de empezar\n`;
        content += `2. **Completa las tareas en orden** - cada una se construye sobre la anterior\n`;
        content += `3. **Usa el comando de revisión** para obtener feedback con IA\n`;
        content += `4. **Consulta los recursos** enlazados en cada guía\n`;
        content += `5. **Practica y experimenta** - el aprendizaje viene de hacer\n\n`;

        content += `## 💡 Comandos Útiles de VS Code\n\n`;
        content += `- \`KnowledgeForge: Ver Tarea Actual\` - Muestra tu tarea pendiente\n`;
        content += `- \`KnowledgeForge: Revisar Tarea con IA\` - Obtén feedback sobre tu código\n`;
        content += `- \`KnowledgeForge: Ver Estado del Proyecto\` - Revisa tu progreso\n\n`;

        content += `## 📌 Tips de Aprendizaje\n\n`;
        content += `- **No te saltes fases**: Cada fase prepara para la siguiente\n`;
        content += `- **Experimenta**: No tengas miedo de probar cosas\n`;
        content += `- **Busca recursos**: La documentación oficial es tu mejor amigo\n`;
        content += `- **Toma notas**: Documenta lo que aprendes\n`;
        content += `- **Practica diariamente**: La consistencia es clave\n\n`;

        fs.writeFileSync(path.join(docsPath, 'README.md'), content);
    }

    /**
     * Genera guías con IA para cada fase
     */
    private static async generateAIGuides(
        roadmap: RoadmapPhase[],
        docsPath: string,
        apiKey: string
    ): Promise<void> {
        for (let i = 0; i < roadmap.length; i++) {
            try {
                const phase = roadmap[i];
                console.log(`Generando guía para Fase ${i + 1}: ${phase.title}...`);

                const guide = await this.generatePhaseGuideWithAI(phase, i, roadmap.length, apiKey);
                const filename = `Fase${i + 1}_Guia.md`;
                fs.writeFileSync(path.join(docsPath, filename), guide);
            } catch (error) {
                console.error(`Error generando guía para fase ${i + 1}:`, error);
                // Continuar con las demás fases
            }
        }
    }

    /**
     * Genera guía de una fase con IA
     */
    private static async generatePhaseGuideWithAI(
        phase: RoadmapPhase,
        phaseIndex: number,
        totalPhases: number,
        apiKey: string
    ): Promise<string> {
        const aiService = AIServiceFactory.createService(apiKey);

        const prompt = `Eres un mentor experto en desarrollo de software. Necesitas crear una guía de aprendizaje detallada para una fase de un roadmap educativo.

**FASE A DOCUMENTAR:**
Fase ${phaseIndex + 1} de ${totalPhases}: ${phase.title}
${phase.description ? `Descripción: ${phase.description}` : ''}

**TAREAS DE ESTA FASE:**
${phase.tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

**TU MISION:**

Crea una guía de aprendizaje completa en formato Markdown que incluya:

1. **Introducción**: Qué aprenderás en esta fase y por qué es importante
2. **Conceptos Clave**: Lista de conceptos que se cubrirán
3. **Pre-requisitos**: Qué debes saber antes de empezar
4. **Para cada tarea**:
   - Explicación detallada de qué hacer
   - Conceptos técnicos involucrados
   - Recursos de aprendizaje (tutoriales, documentación, videos)
   - Ejemplo de código cuando sea relevante
   - Tips y mejores prácticas
5. **Recursos Adicionales**: Enlaces a documentación, cursos, artículos
6. **Ejercicios Prácticos**: Sugerencias de práctica adicional
7. **Checklist de Verificación**: Cómo saber que completaste la fase

**FORMATO:**
- Usa Markdown bien estructurado
- Incluye emojis para hacer la guía más amigable
- Proporciona URLs reales cuando sea posible
- Sé específico y práctico, no genérico
- Escribe en español

**IMPORTANTE:**
- Esta es una guía educativa, debe enseñar, no solo listar tareas
- Proporciona contexto y explicaciones
- Incluye ejemplos de código reales
- Sugiere recursos de calidad

Genera la guía completa ahora:`;

        try {
            const response = await aiService.generateContent(prompt);
            return response;
        } catch (error) {
            console.error('Error generando guía con IA:', error);
            return this.generateBasicPhaseGuide(phase, phaseIndex);
        }
    }

    /**
     * Genera guías básicas sin IA
     */
    private static async generateBasicGuides(
        roadmap: RoadmapPhase[],
        docsPath: string
    ): Promise<void> {
        for (let i = 0; i < roadmap.length; i++) {
            const phase = roadmap[i];
            const guide = this.generateBasicPhaseGuide(phase, i);
            const filename = `Fase${i + 1}_Guia.md`;
            fs.writeFileSync(path.join(docsPath, filename), guide);
        }
    }

    /**
     * Genera una guía básica de fase (sin IA)
     */
    private static generateBasicPhaseGuide(
        phase: RoadmapPhase,
        phaseIndex: number
    ): string {
        let content = `# Fase ${phaseIndex + 1}: ${phase.title}\n\n`;

        if (phase.description) {
            content += `## 📋 Descripción\n\n${phase.description}\n\n`;
        }

        content += `## 🎯 Tareas a Completar\n\n`;
        phase.tasks.forEach((task, index) => {
            content += `### ${index + 1}. ${task}\n\n`;
            content += `**¿Qué hacer?**\n`;
            content += `Implementa esta funcionalidad siguiendo las mejores prácticas de desarrollo.\n\n`;
            content += `**Recursos Sugeridos:**\n`;
            content += `- Consulta la documentación oficial\n`;
            content += `- Busca tutoriales relacionados en YouTube\n`;
            content += `- Lee artículos sobre el tema en blogs de desarrollo\n\n`;
            content += `**Tips:**\n`;
            content += `- Empieza con lo simple y luego mejora\n`;
            content += `- Prueba tu código frecuentemente\n`;
            content += `- Comenta tu código para futuras referencias\n\n`;
            content += `---\n\n`;
        });

        content += `## ✅ Verificación\n\n`;
        content += `Usa el comando "Revisar Tarea con IA" en VS Code para obtener feedback sobre tu implementación.\n\n`;

        content += `## 📚 Recursos Adicionales\n\n`;
        content += `- Documentación oficial de las tecnologías que estás usando\n`;
        content += `- Stack Overflow para resolver dudas específicas\n`;
        content += `- GitHub para ver ejemplos de código similar\n`;

        return content;
    }

    /**
     * Genera una guía específica para la tarea actual
     */
    public static async getCurrentTaskGuide(
        task: string,
        phase: RoadmapPhase,
        apiKey?: string
    ): Promise<string> {
        if (!apiKey) {
            return `# Tarea: ${task}\n\n` +
                   `## Fase: ${phase.title}\n\n` +
                   `Consulta la guía de la fase en la carpeta docs/ para más información.\n\n` +
                   `**Recursos generales:**\n` +
                   `- Busca tutoriales sobre: "${task}"\n` +
                   `- Consulta la documentación oficial\n` +
                   `- Revisa ejemplos en GitHub\n`;
        }

        try {
            const aiService = AIServiceFactory.createService(apiKey);
            const prompt = `Crea una guía breve y práctica para esta tarea de aprendizaje:

**TAREA:** ${task}
**FASE:** ${phase.title}

Proporciona:
1. Explicación de qué hacer (2-3 párrafos)
2. Conceptos clave a entender
3. 3-5 recursos específicos (URLs reales si es posible)
4. Pasos concretos para empezar
5. Ejemplo de código inicial

Responde en Markdown, en español, de forma concisa pero útil.`;

            const response = await aiService.generateContent(prompt);
            return response;
        } catch (error) {
            return `Error generando guía: ${error}`;
        }
    }
}
