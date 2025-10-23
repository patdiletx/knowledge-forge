import { RoadmapPhase } from './RoadmapService';

/**
 * Servicio para interactuar con DeepSeek AI
 * DeepSeek usa una API compatible con OpenAI
 */
export class DeepSeekService {
    private apiKey: string;
    private baseUrl: string = 'https://api.deepseek.com';
    private timeout: number = 60000; // 60 segundos timeout

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Genera un roadmap personalizado basado en el CV del usuario
     * @param cvText Texto del CV/Background
     * @returns Array de fases del roadmap
     */
    public async generateRoadmap(cvText: string): Promise<RoadmapPhase[]> {
        const prompt = this.buildRoadmapPrompt(cvText);

        try {
            const response = await this.callDeepSeekAPI(prompt);
            const roadmap = this.parseRoadmapResponse(response);
            return roadmap;
        } catch (error) {
            console.error('Error al generar roadmap con DeepSeek:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error en la API de DeepSeek: ${errorMessage}`);
        }
    }

    /**
     * Genera contenido genérico usando DeepSeek
     * @param prompt El prompt a enviar
     * @returns El texto generado
     */
    public async generateContent(prompt: string): Promise<string> {
        try {
            const response = await this.callDeepSeekAPI(prompt);
            return response;
        } catch (error) {
            console.error('Error al generar contenido con DeepSeek:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error en la API de DeepSeek: ${errorMessage}`);
        }
    }

    /**
     * Llama a la API de DeepSeek (compatible con OpenAI) con timeout y validación defensiva
     */
    private async callDeepSeekAPI(prompt: string): Promise<string> {
        const url = `${this.baseUrl}/chat/completions`;

        const requestBody = {
            model: 'deepseek-chat', // Modelo DeepSeek-V3.2-Exp en modo non-thinking
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            stream: false,
            temperature: 0.7
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
                let errorMessage = `DeepSeek API error (${response.status})`;

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
                throw new Error('Respuesta inválida de DeepSeek API: no es un objeto');
            }

            if (!Array.isArray(data.choices) || data.choices.length === 0) {
                throw new Error('Respuesta inesperada de DeepSeek API: no hay contenido en choices');
            }

            const choice = data.choices[0];
            if (!choice || !choice.message || typeof choice.message.content !== 'string') {
                throw new Error('Respuesta inesperada de DeepSeek API: estructura de mensaje inválida');
            }

            return choice.message.content;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Timeout al llamar a DeepSeek API (>${this.timeout}ms)`);
                }
                throw new Error(`Error al llamar a DeepSeek API: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Construye el prompt optimizado para generar un roadmap personalizado
     */
    private buildRoadmapPrompt(cvText: string): string {
        const prompt = `Eres un mentor experto en desarrollo profesional y tecnologia. Tu tarea es analizar el background de un profesional y crear un roadmap de aprendizaje personalizado y practico.

BACKGROUND DEL PROFESIONAL:
${cvText}

TU MISION:
Analiza cuidadosamente el background proporcionado y genera un roadmap de aprendizaje personalizado que:

1. Identifique las fortalezas actuales del profesional
2. Detecte areas de mejora y oportunidades de crecimiento
3. Proponga un camino estructurado en 4-6 fases progresivas
4. Cada fase debe incluir tareas especificas y accionables
5. El roadmap debe conducir a un proyecto real que el profesional pueda desarrollar

ANALISIS REQUERIDO:
- Stack tecnologico actual y nivel de experiencia
- Objetivos profesionales declarados o implicitos
- Brechas de conocimiento que deben ser cubiertas
- Proyectos practicos que maximicen el aprendizaje

FORMATO DE SALIDA:
Debes responder UNICAMENTE con un JSON valido, sin texto adicional antes o despues. El formato debe ser exactamente asi:

[
  {
    "title": "Fase 1: Titulo descriptivo",
    "description": "Breve descripcion de 1-2 lineas de que se aprendera en esta fase",
    "tasks": [
      "Tarea especifica y accionable 1",
      "Tarea especifica y accionable 2",
      "Tarea especifica y accionable 3"
    ]
  },
  {
    "title": "Fase 2: Titulo descriptivo",
    "description": "Descripcion",
    "tasks": [
      "Tarea 1",
      "Tarea 2"
    ]
  }
]

CRITERIOS DE CALIDAD:
- Cada fase debe tener 3-6 tareas concretas
- Las tareas deben ser especificas, no genericas
- El roadmap debe ser progresivo: cada fase se construye sobre la anterior
- Incluir al menos una fase dedicada a un Proyecto Real completo
- Las ultimas fases deben enfocarse en profesionalizacion (CI/CD, testing, deployment, etc.)
- Adaptar la complejidad al nivel actual del profesional

IMPORTANTE:
- Responde SOLO con el JSON, sin explicaciones adicionales
- El JSON debe ser valido y parseable
- Personaliza segun el perfil especifico del profesional
- Si el background es muy basico, empieza con fundamentos
- Si el profesional es senior, enfocate en arquitectura, liderazgo tecnico y optimizacion

Ahora genera el roadmap personalizado:`;

        return prompt;
    }

    /**
     * Parsea la respuesta de DeepSeek y extrae el JSON del roadmap
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
                        title: phase.title || 'Fase sin titulo',
                        description: phase.description || '',
                        tasks: Array.isArray(phase.tasks) ? phase.tasks : []
                    }));
                }
            }

            // Si no se pudo parsear, lanzar error
            throw new Error('No se pudo encontrar un JSON valido en la respuesta');
        } catch (error) {
            console.error('Error al parsear respuesta de DeepSeek:', error);
            console.log('Respuesta recibida:', responseText);

            // Fallback: intentar parsear directamente
            try {
                const roadmap = JSON.parse(responseText);
                if (Array.isArray(roadmap)) {
                    return roadmap;
                }
            } catch (e) {
                // Si todo falla, devolver un error descriptivo
                throw new Error(`No se pudo parsear la respuesta de DeepSeek. Respuesta: ${responseText.substring(0, 200)}...`);
            }

            throw error;
        }
    }
}
