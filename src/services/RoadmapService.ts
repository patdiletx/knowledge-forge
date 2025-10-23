import { AIServiceFactory } from './AIServiceFactory';

/**
 * Servicio para analizar CV y generar roadmaps
 * Soporta análisis con IA (DeepSeek, Gemini, OpenAI) o modo mock para pruebas
 */

export interface RoadmapPhase {
    title: string;
    description: string;
    tasks: string[];
    duration?: string; // Estimated duration (e.g., "1 semana", "2 meses")
}
// Richer roadmap phase with optional extras
export interface RichRoadmapPhase extends RoadmapPhase {
    objectives?: string[];
    prerequisites?: string[];
    resources?: { title: string; url?: string; type?: string }[];
    examples?: string[];
    difficulty?: string; // "Básico" | "Intermedio" | "Avanzado"
}

/**
 * Resultado de experiencia analysis
 */
export interface ExperienceAnalysis {
    skills: {
        name: string;
        description: string;
        level: string; // "Básico", "Intermedio", "Avanzado"
    }[];
    gaps: {
        name: string;
        description: string;
        importance: string; // "Alta", "Media", "Baja"
    }[];
    suggestions: {
        title: string;
        description: string;
    }[];
}

export class RoadmapService {
    /**
     * Analiza el CV del usuario y genera un roadmap personalizado
     * @param cvText Texto del CV/Background del usuario
     * @param apiKey API Key del proveedor de LLM (opcional, usa mock si no se proporciona)
     * @returns Roadmap generado
     */
    /**
     * Analyzes user experience and identifies skills and gaps
     * @param experienceText User's CV or experience description
     * @param apiKey API key for AI service
     * @returns Analysis of skills and gaps
     */
    public static async analyzeExperience(
        experienceText: string,
        apiKey: string
    ): Promise<ExperienceAnalysis> {
        const aiService = AIServiceFactory.createService(apiKey);
        
        const prompt = `Analiza la experiencia técnica del siguiente desarrollador y proporciona un análisis detallado:

Texto de experiencia:
${experienceText}

Por favor, proporciona tu análisis en el siguiente formato JSON:

{
  "skills": [
    {
      "name": "Nombre de la habilidad",
      "description": "Descripción breve de la habilidad",
      "level": "Nivel de la habilidad (Básico, Intermedio, Avanzado)"
    }
  ],
  "gaps": [
    {
      "name": "Nombre de la laguna de conocimiento",
      "description": "Descripción de por qué es importante aprender esto",
      "importance": "Importancia (Alta, Media, Baja)"
    }
  ],
  "suggestions": [
    {
      "title": "Título de la sugerencia",
      "description": "Descripción detallada de la sugerencia"
    }
  ]
}

Analiza solamente las tecnologías y habilidades técnicas mencionadas. Sé específico y evita generalidades. 
Responde únicamente con el JSON solicitado, sin ningún texto adicional.`;

        try {
            const response = await aiService.generateContent(prompt);
            const analysis = JSON.parse(response);
            return analysis;
        } catch (error) {
            console.error('Error analyzing experience:', error);
            // Return a default analysis if AI fails
            return {
                skills: [],
                gaps: [],
                suggestions: []
            };
        }
    }

    /**
     * Generates a personalized learning roadmap based on user experience
     * @param experienceText User's CV or experience description
     * @param apiKey API key for AI service
     * @returns Generated roadmap with phases and tasks
     */
    public static async generateRoadmap(
        experienceText: string,
        apiKey: string
    ): Promise<RoadmapPhase[]> {
        const aiService = AIServiceFactory.createService(apiKey);
        
    const prompt = `Basándote en la experiencia técnica del siguiente desarrollador, genera un roadmap de aprendizaje personalizado con 4-6 fases progresivas. Proporciona información rica para cada fase (objetivos claros, prerequisitos, recursos recomendados, ejemplo de output esperado y nivel de dificultad):

Texto de experiencia:
${experienceText}

Por favor, genera un roadmap en el siguiente formato JSON. Cada fase debe incluir campos opcionales para enriquecer el contenido:

[
    {
        "title": "Título de la fase (ej. Fundamentos de JavaScript)",
        "description": "Descripción detallada de qué se cubrirá en esta fase",
        "objectives": ["Objetivo 1", "Objetivo 2"],
        "prerequisites": ["Conocimientos previos requeridos"],
        "resources": [{ "title": "Artículo útil", "url": "https://...", "type": "article" }],
        "examples": ["Breve ejemplo o resultado esperado"],
        "difficulty": "Básico|Intermedio|Avanzado",
        "tasks": [
            "Tarea específica 1",
            "Tarea específica 2",
            "Tarea específica 3"
        ],
        "duration": "Duración estimada (ej. 2 semanas)"
    }
]

Si necesitas generar solo una parte (por ejemplo una fase) porque la UI pedirá continuar, puedes generar únicamente las fases solicitadas. Responde únicamente con el JSON solicitado, sin ningún texto adicional.`;

        try {
            const response = await aiService.generateContent(prompt);
            const roadmap = JSON.parse(response);
            return roadmap;
        } catch (error) {
            console.error('Error generating roadmap:', error);
            // Return a default roadmap if AI fails
            return [
                {
                    title: "Fundamentos",
                    description: "Fortalece tus fundamentos de programación",
                    tasks: [
                        "Repasar conceptos básicos de programación",
                        "Practicar estructuras de datos",
                        "Resolver problemas algorítmicos"
                    ],
                    duration: "2 semanas"
                }
            ];
        }
    }

    /**
     * Generate a subset of roadmap phases (useful for incremental generation)
     * @param experienceText CV or experience description
     * @param apiKey AI api key
     * @param startPhase zero-based index of the first phase to generate
     * @param phaseCount number of phases to generate
     * @param previousPhases Optional array of previously generated phases for context
     */
    public static async generateRoadmapPartial(
        experienceText: string,
        apiKey: string,
        startPhase: number,
        phaseCount: number,
        previousPhases?: RichRoadmapPhase[]
    ): Promise<RichRoadmapPhase[]> {
        const aiService = AIServiceFactory.createService(apiKey);

        const contextPrompt = previousPhases ? `
Aquí están las fases anteriores del roadmap para contexto:
${JSON.stringify(previousPhases, null, 2)}

Por favor, continúa el roadmap generando ${phaseCount} fases más que se construyan sobre el progreso anterior.
Ten en cuenta las habilidades y conceptos cubiertos en las fases anteriores.
Las nuevas fases deben tener una progresión natural y coherente, aumentando gradualmente en complejidad.` : '';

        const prompt = `
Basado en el perfil del desarrollador y su experiencia:
${experienceText}

${contextPrompt}

Genera ${phaseCount} nuevas fases del roadmap empezando desde la fase ${startPhase + 1} (índice ${startPhase}).

Cada fase debe tener un formato rico con:
1. Título claro y descriptivo
2. Descripción detallada de objetivos
3. Pre-requisitos específicos (especialmente importante dadas las fases anteriores)
4. 3-5 recursos concretos y relevantes (artículos, tutoriales, documentación)
5. Ejemplos prácticos del resultado esperado
6. Nivel de dificultad
7. Tareas específicas y accionables
8. Duración estimada realista

Estructura JSON requerida:
{
    "title": string,
    "description": string,
    "objectives": string[],
    "prerequisites": string[],
    "resources": Array<{ title: string, url?: string, type?: string }>,
    "examples": string[],
    "difficulty": "Básico"|"Intermedio"|"Avanzado",
    "tasks": string[],
    "duration": string
}

RESPONDE SOLO CON EL JSON DE LAS ${phaseCount} FASES NUEVAS.`;

        try {
            const response = await aiService.generateContent(prompt);
            const phases = JSON.parse(response);

            // Ensure consistent format and required fields
            return phases.map((phase: RichRoadmapPhase) => ({
                ...phase,
                objectives: phase.objectives || [],
                prerequisites: phase.prerequisites || [],
                resources: phase.resources || [],
                examples: phase.examples || [],
                difficulty: phase.difficulty || "Intermedio",
                tasks: phase.tasks || [],
                duration: phase.duration || "2-3 semanas"
            }));
        } catch (error) {
            console.error('Error generating roadmap partial:', error);
            return [];
        }
    }

    /**
     * Analiza el CV usando el servicio de IA configurado (DeepSeek, Gemini, OpenAI)
     */
    private static async analyzeWithAI(cvText: string, apiKey: string): Promise<RoadmapPhase[]> {
        try {
            const aiService = AIServiceFactory.createService(apiKey);
            const providerName = AIServiceFactory.getCurrentProviderName();
            console.log(`Usando ${providerName} para analizar CV...`);

            const roadmap = await aiService.generateRoadmap(cvText);
            return roadmap;
        } catch (error) {
            console.error('Error con el servicio de IA:', error);
            const providerName = AIServiceFactory.getCurrentProviderName();
            throw new Error(`Error al conectar con ${providerName}: ${error}`);
        }
    }

    /**
     * Análisis mock para pruebas sin API Key
     */
    private static async analyzeMock(cvText: string): Promise<RoadmapPhase[]> {
        // Simulamos un delay de procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock: Generamos un roadmap de ejemplo basado en palabras clave simples
        const isWebDev = cvText.toLowerCase().includes('web') ||
                        cvText.toLowerCase().includes('javascript') ||
                        cvText.toLowerCase().includes('react');

        const isBackend = cvText.toLowerCase().includes('backend') ||
                         cvText.toLowerCase().includes('node') ||
                         cvText.toLowerCase().includes('api');

        // Roadmap mock personalizado básico
        const mockRoadmap: RoadmapPhase[] = [];

        if (isWebDev) {
            mockRoadmap.push({
                title: "Fase 1: Fundamentos Modernos de Frontend",
                description: "Reforzar bases y aprender las últimas tendencias",
                tasks: [
                    "Dominar ES6+ y características modernas de JavaScript",
                    "Profundizar en React Hooks y Context API",
                    "Aprender TypeScript para desarrollo escalable",
                    "Implementar tests con Jest y React Testing Library"
                ]
            });
        }

        if (isBackend) {
            mockRoadmap.push({
                title: "Fase 2: Arquitectura Backend Avanzada",
                description: "Diseño de sistemas robustos y escalables",
                tasks: [
                    "Implementar arquitectura hexagonal",
                    "Diseñar APIs RESTful y GraphQL",
                    "Aplicar patrones de diseño: Repository, Factory, Strategy",
                    "Implementar autenticación JWT y OAuth2"
                ]
            });
        }

        mockRoadmap.push({
            title: "Fase 3: Proyecto Real - Sistema de Gestión",
            description: "Aplicar todo el conocimiento en un proyecto completo",
            tasks: [
                "Diseñar arquitectura del sistema",
                "Implementar autenticación y autorización",
                "Crear módulos de gestión (CRUD)",
                "Implementar tests end-to-end",
                "Desplegar en producción (Docker + Cloud)"
            ]
        });

        mockRoadmap.push({
            title: "Fase 4: Optimización y Mejores Prácticas",
            description: "Refinamiento y profesionalización",
            tasks: [
                "Implementar CI/CD con GitHub Actions",
                "Optimizar rendimiento y SEO",
                "Documentar código y APIs",
                "Code review y refactoring",
                "Preparar portfolio y presentación"
            ]
        });

        // Si no detectamos keywords específicas, damos un roadmap genérico
        if (mockRoadmap.length === 1) {
            mockRoadmap.unshift({
                title: "Fase 1: Evaluación y Fundamentos",
                description: "Identificar fortalezas y áreas de mejora",
                tasks: [
                    "Revisar fundamentos de programación",
                    "Seleccionar stack tecnológico objetivo",
                    "Crear proyecto base de aprendizaje",
                    "Establecer rutina de estudio y práctica"
                ]
            });
        }

        return mockRoadmap;
    }
}
