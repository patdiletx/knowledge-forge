// Script para probar la conexión con Gemini y listar modelos disponibles
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Coloca tu API Key aquí temporalmente para probar
const API_KEY = 'TU_API_KEY_AQUI';

async function testGemini() {
    console.log('🔍 Probando conexión con Google Gemini...\n');

    const genAI = new GoogleGenerativeAI(API_KEY);

    // Probar diferentes nombres de modelos
    const modelsToTry = [
        'gemini-pro',
        'models/gemini-pro',
        'gemini-1.5-flash',
        'models/gemini-1.5-flash',
        'gemini-1.5-pro',
        'models/gemini-1.5-pro'
    ];

    console.log('Probando modelos disponibles:\n');

    for (const modelName of modelsToTry) {
        try {
            console.log(`📝 Probando: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hola');
            const response = await result.response;
            const text = response.text();
            console.log(`   ✅ FUNCIONA! Respuesta: ${text.substring(0, 50)}...\n`);
            break; // Si funciona, salir del loop
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }
    }
}

// Ejecutar solo si se proporciona API Key
if (API_KEY !== 'TU_API_KEY_AQUI') {
    testGemini().catch(console.error);
} else {
    console.log('⚠️  Por favor, edita test-gemini.js y coloca tu API Key en la línea 5');
    console.log('    Luego ejecuta: node test-gemini.js');
}
