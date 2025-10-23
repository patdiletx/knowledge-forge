import * as vscode from 'vscode';

/**
 * Servicio para gestionar la configuración de la extensión
 * Maneja el almacenamiento seguro de API Keys usando VS Code Secrets API
 */
export class ConfigService {
    private static readonly API_KEY_SECRET = 'knowledgeforge.apiKey';
    private static readonly LLM_PROVIDER_CONFIG = 'knowledgeforge.llmProvider';

    /**
     * Proveedores de LLM soportados
     */
    public static readonly LLM_PROVIDERS = {
        GEMINI: 'gemini',
        OPENAI: 'openai',
        DEEPSEEK: 'deepseek'
    } as const;

    /**
     * Obtiene la API Key almacenada de forma segura
     * @param context Contexto de la extensión
     * @returns API Key o undefined si no está configurada
     */
    public static async getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
        return await context.secrets.get(this.API_KEY_SECRET);
    }

    /**
     * Almacena la API Key de forma segura
     * @param context Contexto de la extensión
     * @param apiKey La API Key a almacenar
     */
    public static async setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
        await context.secrets.store(this.API_KEY_SECRET, apiKey);
    }

    /**
     * Elimina la API Key almacenada
     * @param context Contexto de la extensión
     */
    public static async deleteApiKey(context: vscode.ExtensionContext): Promise<void> {
        await context.secrets.delete(this.API_KEY_SECRET);
    }

    /**
     * Verifica si hay una API Key configurada
     * @param context Contexto de la extensión
     * @returns true si existe una API Key
     */
    public static async hasApiKey(context: vscode.ExtensionContext): Promise<boolean> {
        const apiKey = await this.getApiKey(context);
        return apiKey !== undefined && apiKey.length > 0;
    }

    /**
     * Obtiene el proveedor de LLM configurado
     * @returns El proveedor configurado (gemini por defecto)
     */
    public static getLLMProvider(): string {
        const config = vscode.workspace.getConfiguration();
        return config.get(this.LLM_PROVIDER_CONFIG, this.LLM_PROVIDERS.GEMINI);
    }

    /**
     * Establece el proveedor de LLM
     * @param provider El proveedor a configurar
     */
    public static async setLLMProvider(provider: string): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update(
            this.LLM_PROVIDER_CONFIG,
            provider,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Solicita al usuario que ingrese su API Key
     * @param context Contexto de la extensión
     * @returns true si se configuró exitosamente
     */
    public static async promptForApiKey(context: vscode.ExtensionContext): Promise<boolean> {
        const provider = this.getLLMProvider();
        const providerName = this.getProviderDisplayName(provider);

        const apiKey = await vscode.window.showInputBox({
            prompt: `Ingresa tu API Key de ${providerName}`,
            password: true,
            placeHolder: 'Tu API Key será almacenada de forma segura',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'La API Key no puede estar vacía';
                }
                return null;
            }
        });

        if (apiKey) {
            await this.setApiKey(context, apiKey.trim());
            vscode.window.showInformationMessage(`API Key de ${providerName} configurada exitosamente`);
            return true;
        }

        return false;
    }

    /**
     * Obtiene el nombre de visualización del proveedor
     */
    private static getProviderDisplayName(provider: string): string {
        switch (provider) {
            case this.LLM_PROVIDERS.GEMINI:
                return 'Google Gemini';
            case this.LLM_PROVIDERS.OPENAI:
                return 'OpenAI';
            case this.LLM_PROVIDERS.DEEPSEEK:
                return 'DeepSeek';
            default:
                return 'Proveedor de IA';
        }
    }

    /**
     * Cambia el proveedor de LLM y solicita la API Key correspondiente
     * @param context Contexto de la extensión
     */
    public static async changeProvider(context: vscode.ExtensionContext): Promise<void> {
        const providers = [
            {
                label: 'DeepSeek',
                description: 'Usa DeepSeek AI (Recomendado - Potente y económico)',
                value: this.LLM_PROVIDERS.DEEPSEEK
            },
            {
                label: 'Google Gemini',
                description: 'Usa Google Gemini AI (Free tier generoso)',
                value: this.LLM_PROVIDERS.GEMINI
            },
            {
                label: 'OpenAI',
                description: 'Usa OpenAI GPT',
                value: this.LLM_PROVIDERS.OPENAI
            }
        ];

        const selected = await vscode.window.showQuickPick(providers, {
            placeHolder: 'Selecciona el proveedor de IA'
        });

        if (selected) {
            await this.setLLMProvider(selected.value);
            vscode.window.showInformationMessage(`Proveedor cambiado a ${selected.label}`);

            // Preguntar si quiere configurar la API Key ahora
            const configureNow = await vscode.window.showInformationMessage(
                `¿Deseas configurar tu API Key de ${selected.label} ahora?`,
                'Sí',
                'Más tarde'
            );

            if (configureNow === 'Sí') {
                await this.promptForApiKey(context);
            }
        }
    }

    /**
     * Obtiene instrucciones para obtener una API Key según el proveedor
     */
    public static getApiKeyInstructions(): string {
        const provider = this.getLLMProvider();

        if (provider === this.LLM_PROVIDERS.DEEPSEEK) {
            return `
🔑 Cómo obtener tu API Key de DeepSeek:

1. Ve a: https://platform.deepseek.com/
2. Crea una cuenta o inicia sesión
3. Ve a la sección de API Keys
4. Copia la API Key generada
5. Usa el comando "KnowledgeForge: Configurar API Key" para ingresarla

Nota: DeepSeek es potente y económico, ideal para proyectos.
            `.trim();
        } else if (provider === this.LLM_PROVIDERS.GEMINI) {
            return `
🔑 Cómo obtener tu API Key de Google Gemini:

1. Ve a: https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API Key generada
5. Usa el comando "KnowledgeForge: Configurar API Key" para ingresarla

Nota: Gemini ofrece un tier gratuito generoso para empezar.
            `.trim();
        } else {
            return `
🔑 Cómo obtener tu API Key de OpenAI:

1. Ve a: https://platform.openai.com/api-keys
2. Inicia sesión con tu cuenta de OpenAI
3. Haz clic en "Create new secret key"
4. Copia la API Key generada
5. Usa el comando "KnowledgeForge: Configurar API Key" para ingresarla

Nota: OpenAI requiere créditos para usar la API.
            `.trim();
        }
    }
}
