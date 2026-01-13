import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateText } from 'ai';

/**
 * Este Lambda actúa como proxy seguro entre el frontend y las APIs de IA.
 */

interface AISuggestionRequest {
  categoryName: string;
  model?: string;
}

interface AISuggestionResponse {
  icon: string;
  color: string;
  confidence?: number;
  provider?: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
}

/**
 * Carga el modelo de OpenAI
 */
async function loadModel(modelString: string) {
  const { createOpenAI } = await import('@ai-sdk/openai');
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  // Extraer nombre del modelo (ej: 'openai/gpt-4' -> 'gpt-4')
  const modelName = modelString.includes('/') 
    ? modelString.split('/')[1] 
    : modelString;
  
  const openai = createOpenAI({ apiKey });
  return openai(modelName);
}

/**
 * Genera sugerencia de ícono y color usando IA
 */
async function generateAISuggestion(
  categoryName: string,
  modelString: string
): Promise<AISuggestionResponse> {
  const model = await loadModel(modelString);
  
  const prompt = `Sugiere un ícono de Ionicons y un color para una categoría llamada "${categoryName}".

REGLAS IMPORTANTES:
1. El ícono DEBE ser un nombre válido de Ionicons 7.x (sin prefijo "ion-" ni sufijo "-outline")
2. El color DEBE ser en formato hexadecimal (#RRGGBB)
3. Responde SOLO con JSON, sin markdown ni explicaciones

Formato de respuesta:
{
  "icon": "nombre-del-icono",
  "color": "#hexcolor"
}

Ejemplos de iconos válidos: home, briefcase, fitness, restaurant, book, airplane, cart, medical, music, game-controller, school, wallet, heart, star, trophy

Responde SOLO con el JSON:`;

  const { text } = await generateText({
    model,
    prompt,
    maxTokens: 150,
    temperature: 0.7,
  });

  // Parsear respuesta
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid AI response format');
  }

  const suggestion = JSON.parse(jsonMatch[0]);
  
  // Validar formato
  if (!suggestion.icon || !suggestion.color) {
    throw new Error('Missing icon or color in AI response');
  }

  return {
    icon: suggestion.icon,
    color: suggestion.color,
    confidence: 0.95,
    provider: modelString.split('/')[0]
  };
}

/**
 * Handler principal del Lambda
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Lambda invoked:', { 
    path: event.path, 
    resource: event.resource,
    method: event.httpMethod 
  });

  // Health check endpoint
  if (event.path?.includes('/health') || event.resource?.includes('/health')) {
    return healthCheck();
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Solo POST permitido
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only POST method is supported'
      } as ErrorResponse),
    };
  }

  try {
    // Parsear body
    if (!event.body) {
      throw new Error('Missing request body');
    }

    const request: AISuggestionRequest = JSON.parse(event.body);

    // Validar request
    if (!request.categoryName || request.categoryName.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'categoryName is required and cannot be empty'
        } as ErrorResponse),
      };
    }

    // Determinar modelo a usar
    const modelString = 
      request.model || 
      process.env.DEFAULT_AI_MODEL ||
      'gpt-3.5-turbo'; // Modelo por defecto

    // Verificar que OpenAI esté configurado
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Service Unavailable',
          message: 'OPENAI_API_KEY not configured'
        } as ErrorResponse),
      };
    }

    console.log('Generating suggestion:', { 
      categoryName: request.categoryName,
      model: modelString 
    });

    // Generar sugerencia
    const suggestion = await generateAISuggestion(
      request.categoryName.trim(),
      modelString
    );

    console.log('Suggestion generated:', suggestion);

    // Respuesta exitosa
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(suggestion),
    };

  } catch (error: any) {
    console.error('Lambda error:', error);

    // Determinar código de error
    let statusCode = 500;
    let errorType = 'Internal Server Error';

    if (error.message?.includes('API key')) {
      statusCode = 503;
      errorType = 'Service Unavailable';
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorType = 'Too Many Requests';
    } else if (error.message?.includes('Invalid')) {
      statusCode = 400;
      errorType = 'Bad Request';
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorType,
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } as ErrorResponse),
    };
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<APIGatewayProxyResult> {
  const isConfigured = !!process.env.OPENAI_API_KEY;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      status: isConfigured ? 'healthy' : 'not_configured',
      timestamp: new Date().toISOString(),
      provider: 'openai',
      configured: isConfigured,
      defaultModel: process.env.DEFAULT_AI_MODEL || 'gpt-3.5-turbo'
    }),
  };
}
