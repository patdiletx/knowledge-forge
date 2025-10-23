import { RoadmapPhase } from './RoadmapService';

/**
 * Servicio para interactuar con OpenAI API
 * Compatible con modelos GPT-4, GPT-3.5, etc.
 */
export class OpenAIService {
    private apiKey: string;
    private baseUrl: string = 'https://api.openai.com/v1';
    private model: string = 'gpt-4o-mini'; // Modelo por defecto (económico y rápido)
    private timeout: number = 60000; // 60 segundos timeout

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        }
    }

    /**
     * Genera un roadmap personalizado basado en el CV del usuario
     * @param cvText Texto del CV/Background
     * @returns Array de fases del roadmap
     */
    public async generateRoadmap(cvText: string): Promise<RoadmapPhase[]> {
        const prompt = this.buildRoadmapPrompt(cvText);

        try {
            const response = await this.callOpenAIAPI(prompt);
            const roadmap = this.parseRoadmapResponse(response);
            return roadmap;
        } catch (error) {
            console.error('Error al generar roadmap con OpenAI:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error en la API de OpenAI: ${errorMessage}`);
        }
    }

    /**
     * Genera contenido genérico usando OpenAI
     * @param prompt El prompt a enviar
     * @returns El texto generado
     */
    public async generateContent(prompt: string): Promise<string> {
        try {
            const response = await this.callOpenAIAPI(prompt);
            return response;
        } catch (error) {
            console.error('Error al generar contenido con OpenAI:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error en la API de OpenAI: ${errorMessage}`);
        }
    }

    /**
     * Llama a la API de OpenAI con timeout y manejo de errores robusto
     */
    private async callOpenAIAPI(prompt: string): Promise<string> {
        const url = `${this.baseUrl}/chat/completions`;

        const requestBody = {
            model: this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        };

        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `OpenAI API error (${response.status})`;

                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error?.message) {
                        errorMessage = errorJson.error.message;
                    }
                } catch {
                    errorMessage += `: ${errorText}`;
                }

                throw new Error(errorMessage);
            }

            const data: any = await response.json();

            // Validación defensiva de la respuesta
            if (!data || typeof data !== 'object') {
                throw new Error('Respuesta inválida de OpenAI API: no es un objeto');
            }

            if (!Array.isArray(data.choices) || data.choices.length === 0) {
                throw new Error('Respuesta inesperada de OpenAI API: no hay contenido en choices');
            }

            const choice = data.choices[0];
            if (!choice || !choice.message || typeof choice.message.content !== 'string') {
                throw new Error('Respuesta inesperada de OpenAI API: estructura de mensaje inválida');
            }

            return choice.message.content;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Timeout al llamar a OpenAI API (>${this.timeout}ms)`);
                }
                throw new Error(`Error al llamar a OpenAI API: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Construye el prompt optimizado para generar un roadmap personalizado
     */
    private buildRoadmapPrompt(cvText: string): string {
        const prompt = `Eres un mentor experto en desarrollo profesional y tecnología. Tu tarea es analizar el background de un profesional y crear un roadmap de aprendizaje personalizado y práctico.

BACKGROUND DEL PROFESIONAL:
${cvText}

TU MISIÓN:
Analiza cuidadosamente el background proporcionado y genera un roadmap de aprendizaje personalizado que:

1. Identifique las fortalezas actuales del profesional
2. Detecte áreas de mejora y oportunidades de crecimiento
3. Proponga un camino estructurado en 4-6 fases progresivas
4. Cada fase debe incluir tareas específicas y accionables
5. El roadmap debe conducir a un proyecto real que el profesional pueda desarrollar

ANÁLISIS REQUERIDO:
- Stack tecnológico actual y nivel de experiencia
- Objetivos profesionales declarados o implícitos
- Brechas de conocimiento que deben ser cubiertas
- Proyectos prácticos que maximicen el aprendizaje

FORMATO DE SALIDA:
Debes responder ÚNICAMENTE con un JSON válido, sin texto adicional antes o después. El formato debe ser exactamente así:

[
  {
    "title": "Fase 1: Título descriptivo",
    "description": "Breve descripción de 1-2 líneas de qué se aprenderá en esta fase",
    "tasks": [
      "Tarea específica y accionable 1",
      "Tarea específica y accionable 2",
      "Tarea específica y accionable 3"
    ]
  },
  {
    "title": "Fase 2: Título descriptivo",
    "description": "Descripción",
    "tasks": [
      "Tarea 1",
      "Tarea 2"
    ]
  }
]

CRITERIOS DE CALIDAD:
- Cada fase debe tener 3-6 tareas concretas
- Las tareas deben ser específicas, no genéricas
- El roadmap debe ser progresivo: cada fase se construye sobre la anterior
- Incluir al menos una fase dedicada a un Proyecto Real completo
- Las últimas fases deben enfocarse en profesionalización (CI/CD, testing, deployment, etc.)
- Adaptar la complejidad al nivel actual del profesional

IMPORTANTE:
- Responde SOLO con el JSON, sin explicaciones adicionales
- El JSON debe ser válido y parseable
- Personaliza según el perfil específico del profesional
- Si el background es muy básico, empieza con fundamentos
- Si el profesional es senior, enfócate en arquitectura, liderazgo técnico y optimización

Ahora genera el roadmap personalizado:`;

        return prompt;
    }

    /**
     * Parsea la respuesta de OpenAI y extrae el JSON del roadmap
     */
    private parseRoadmapResponse(responseText: string): RoadmapPhase[] {
        try {
            // Buscar el bloque JSON en la respuesta
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                             responseText.match(/\[\s*{[\s\S]*}\s*\]/);

            if (jsonMatch) {
                const jsonText = jsonMatch[1] || jsonMatch[0];
                const roadmap = JSON.parse(jsonText);

                // Validar la estructura
                if (Array.isArray(roadmap) && roadmap.length > 0) {
                    return roadmap.map(phase => ({
                        title: phase.title || 'Fase sin título',
                        description: phase.description || '',
                        tasks: Array.isArray(phase.tasks) ? phase.tasks : []
                    }));
                }
            }

            // Si no se pudo parsear, lanzar error
            throw new Error('No se pudo encontrar un JSON válido en la respuesta');
        } catch (error) {
            console.error('Error al parsear respuesta de OpenAI:', error);
            console.log('Respuesta recibida:', responseText);

            // Fallback: intentar parsear directamente
            try {
                const roadmap = JSON.parse(responseText);
                if (Array.isArray(roadmap)) {
                    return roadmap;
                }
            } catch (e) {
                // Si todo falla, devolver un error descriptivo
                throw new Error(`No se pudo parsear la respuesta de OpenAI. Respuesta: ${responseText.substring(0, 200)}...`);
            }

            throw error;
        }
    }
}
