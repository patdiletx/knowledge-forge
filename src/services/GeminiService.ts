import { GoogleGenerativeAI } from '@google/generative-ai';
import { RoadmapPhase } from './RoadmapService';

/**
 * Servicio para interactuar con Google Gemini AI
 */
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Usar Gemini 1.5 Flash (modelo actualizado, rápido y eficiente)
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    /**
     * Genera un roadmap personalizado basado en el CV del usuario
     * @param cvText Texto del CV/Background
     * @returns Array de fases del roadmap
     */
    public async generateRoadmap(cvText: string): Promise<RoadmapPhase[]> {
        const prompt = this.buildRoadmapPrompt(cvText);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parsear la respuesta JSON
            const roadmap = this.parseRoadmapResponse(text);
            return roadmap;
        } catch (error) {
            console.error('Error al generar roadmap con Gemini:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error en la API de Gemini: ${errorMessage}`);
        }
    }

    /**
     * Genera contenido genérico usando Gemini
     * @param prompt El prompt a enviar
     * @returns El texto generado
     */
    public async generateContent(prompt: string): Promise<string> {
        try {
            const cleanPrompt = this.cleanText(prompt);
            const result = await this.model.generateContent(cleanPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error al generar contenido con Gemini:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error en la API de Gemini: ${errorMessage}`);
        }
    }

    /**
     * Limpia el texto de caracteres especiales que pueden causar problemas
     * Usa normalización Unicode NFD para mejor compatibilidad
     */
    private cleanText(text: string): string {
        try {
            // Normalizar Unicode (NFD = descomponer caracteres acentuados)
            let cleaned = text.normalize('NFD');

            // Reemplazar caracteres especiales comunes
            cleaned = cleaned
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                .replace(/[—–]/g, '-')
                .replace(/•/g, '-')
                .replace(/…/g, '...')
                .replace(/✅/g, '[OK]')
                .replace(/❌/g, '[X]')
                .replace(/⚠️/g, '[!]')
                .replace(/🎯/g, '[META]')
                .replace(/📋/g, '[LISTA]')
                .replace(/🔑/g, '[CLAVE]')
                .replace(/💡/g, '[IDEA]');

            // Eliminar marcas diacríticas (acentos) después de normalización NFD
            cleaned = cleaned.replace(/[\u0300-\u036f]/g, '');

            // Eliminar caracteres no-ASCII restantes (excepto espacios en blanco básicos)
            cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');

            return cleaned;
        } catch (error) {
            // Si la normalización falla, hacer limpieza básica
            console.warn('Error al normalizar texto Unicode:', error);
            return text.replace(/[^\x00-\x7F]/g, '');
        }
    }

    /**
     * Construye el prompt optimizado para generar un roadmap personalizado
     */
    private buildRoadmapPrompt(cvText: string): string {
        const cleanCvText = this.cleanText(cvText);
        const prompt = `Eres un mentor experto en desarrollo profesional y tecnologia. Tu tarea es analizar el background de un profesional y crear un roadmap de aprendizaje personalizado y practico.

BACKGROUND DEL PROFESIONAL:
${cleanCvText}

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

        return this.cleanText(prompt);
    }

    /**
     * Parsea la respuesta de Gemini y extrae el JSON del roadmap
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
            console.error('Error al parsear respuesta de Gemini:', error);
            console.log('Respuesta recibida:', responseText);

            // Fallback: intentar parsear directamente
            try {
                const roadmap = JSON.parse(responseText);
                if (Array.isArray(roadmap)) {
                    return roadmap;
                }
            } catch (e) {
                // Si todo falla, devolver un error descriptivo
                throw new Error(`No se pudo parsear la respuesta de Gemini. Respuesta: ${responseText.substring(0, 200)}...`);
            }

            throw error;
        }
    }
}
