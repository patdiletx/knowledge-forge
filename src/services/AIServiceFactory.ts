import { GeminiService } from './GeminiService';
import { DeepSeekService } from './DeepSeekService';
import { OpenAIService } from './OpenAIService';
import { ConfigService } from './ConfigService';

/**
 * Interface común para servicios de IA
 */
export interface IAIService {
    generateRoadmap(cvText: string): Promise<any[]>;
    generateContent(prompt: string): Promise<string>;
}

/**
 * Factory para crear instancias del servicio de IA correcto según el proveedor configurado
 */
export class AIServiceFactory {
    /**
     * Crea una instancia del servicio de IA según el proveedor configurado
     * @param apiKey La API Key del proveedor
     * @param provider El proveedor (opcional, usa el configurado si no se especifica)
     * @returns Instancia del servicio de IA
     */
    public static createService(apiKey: string, provider?: string): IAIService {
        const selectedProvider = provider || ConfigService.getLLMProvider();

        switch (selectedProvider) {
            case ConfigService.LLM_PROVIDERS.DEEPSEEK:
                return new DeepSeekService(apiKey);

            case ConfigService.LLM_PROVIDERS.GEMINI:
                return new GeminiService(apiKey);

            case ConfigService.LLM_PROVIDERS.OPENAI:
                return new OpenAIService(apiKey);

            default:
                console.warn(`Proveedor desconocido: ${selectedProvider}, usando DeepSeek como fallback`);
                return new DeepSeekService(apiKey);
        }
    }

    /**
     * Obtiene el nombre del proveedor actualmente configurado
     */
    public static getCurrentProviderName(): string {
        const provider = ConfigService.getLLMProvider();

        switch (provider) {
            case ConfigService.LLM_PROVIDERS.DEEPSEEK:
                return 'DeepSeek';
            case ConfigService.LLM_PROVIDERS.GEMINI:
                return 'Google Gemini';
            case ConfigService.LLM_PROVIDERS.OPENAI:
                return 'OpenAI';
            default:
                return 'Proveedor de IA';
        }
    }
}
