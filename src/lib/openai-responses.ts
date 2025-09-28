import { openai } from './openai-client'
import { createSupabaseAdmin } from '@/lib/supabase'

let cachedSystemInstructions: { text: string | null; fetchedAt: number } | null = null
const INSTRUCTIONS_CACHE_TTL_MS = 60_000

// Expose helpers to allow other modules (e.g., admin settings API) to refresh cache immediately
export function setSystemInstructionsCache(text: string | null) {
  cachedSystemInstructions = { text, fetchedAt: Date.now() }
}

export function invalidateSystemInstructionsCache() {
  cachedSystemInstructions = null
}

async function getSystemInstructions(): Promise<string | null> {
  const now = Date.now()
  if (cachedSystemInstructions && now - cachedSystemInstructions.fetchedAt < INSTRUCTIONS_CACHE_TTL_MS) {
    console.log('cachedSystemInstructions', cachedSystemInstructions.text);
    return cachedSystemInstructions.text
  }
  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_settings')
      .select('system_instructions')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      console.warn('Failed to fetch system instructions, using default:', error)
      cachedSystemInstructions = { text: null, fetchedAt: now }
      return null
    }
    const text = data?.system_instructions || null
    cachedSystemInstructions = { text, fetchedAt: now }
    console.log('text', text);
    return text
  } catch (e) {
    console.warn('Error reading system instructions, using default:', e)
    cachedSystemInstructions = { text: null, fetchedAt: now }
    return null
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OpenAIResponse {
  content: string
  tokens_used?: number
  response_time_ms?: number
}

/**
 * OPTIMAL price query using Vector Store + File Search (no attachments)
 * Targets Venezuelan B2B price lookups across multiple catalogs
 */
export async function queryPricesFast(
  query: string,
  vectorStoreIds: string[],
  conversationHistory: ChatMessage[] = []
): Promise<OpenAIResponse> {
  const startTime = Date.now()

  try {
    if (vectorStoreIds.length === 0) {
      // Fallback: plain chat (no retrieval). Used when no vector stores are available.
      const systemPrompt = `Eres un asistente que responde preguntas basándote principalmente en los documentos y archivos proporcionados (PDF, DOCX, CSV, imágenes, etc.).
Instrucciones:
- Prioriza la información que puedas recuperar de los archivos disponibles.
- Si no hay evidencia suficiente en los archivos, dilo explícitamente y sugiere cargar/activar los documentos necesarios.
- Mantén las respuestas breves, claras y directas.
- No inventes datos ni hagas suposiciones.
- Cuando sea posible, menciona el archivo (o fuente) del que extraes la información.`

      const dynamicInstructions = await getSystemInstructions()
      const messages = [
        { role: 'system' as const, content: dynamicInstructions || systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content: query }
      ]

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 400
      })

      const processingTime = Date.now() - startTime
      console.log(`💨 Fallback query completed in ${processingTime}ms`)

      return {
        content: response.choices[0]?.message?.content || 'No se pudo procesar la consulta.',
        tokens_used: response.usage?.total_tokens,
        response_time_ms: processingTime,
      }
    }

    // OPTIMAL: Vector Stores + File Search via tool_resources. Used when vector stores are available.
    console.log(`🚀 OPTIMAL SEARCH: Using ${vectorStoreIds.length} vector stores with intelligent retrieval`)

    const systemInstructions = `Instrucciones del asistente con recuperación desde archivos

Eres un asistente que responde preguntas utilizando EXCLUSIVAMENTE la información disponible en los archivos conectados (PDF, DOCX, CSV, imágenes con OCR, etc.). Si la evidencia no existe en los archivos, dilo claramente y sugiere qué documento cargar o activar.

Reglas de búsqueda
  1. Busca en TODOS los archivos y vector stores disponibles.
  2. Considera variaciones, sinónimos y términos relacionados de la consulta.
  3. Cuando extraigas información, intenta mencionar el nombre del archivo (sin extensión) como fuente.

Cobertura (obligatoria)
  1. Cubre todas las fuentes relevantes. Si una fuente no tiene coincidencias, indícalo.
  2. No mezcles datos de distintas fuentes sin aclarar su origen.

Formato de respuesta (Markdown)
  • Responde en el idioma de la consulta (español por defecto).
  • Agrupa por archivo/origen en orden alfabético:

[Nombre del Archivo]
  • [Hallazgo/Hecho clave]
  [Cita/paráfrasis breve si aplica]

  • Evita tablas salvo que el usuario las pida.
  • Sé breve y claro; usa viñetas.

Políticas
  • No inventes datos ni asumas valores no presentes.
  • Si la evidencia es insuficiente, explica qué falta y qué cargar.
  • No expongas información sensible que no esté explícitamente en los archivos.`

    // Build messages preserving roles
    const dynamicInstructions = await getSystemInstructions()
    const inputMessages = [
      { role: 'system' as const, content: dynamicInstructions || systemInstructions },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: query }
    ]

    console.log('inputMessages', inputMessages);

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: inputMessages,
      tools: [
        {
          type: 'file_search',
          vector_store_ids: vectorStoreIds, // <-- required by the TS type
          // optional:
          // max_num_results: 12,
        }
      ],
      tool_choice: 'auto',     // let it decide when to retrieve
      temperature: 0.1,
      max_output_tokens: 400,
      stream: false
    })

    // Poll if needed (Responses can be async)
    let finalResponse = response
    if (response.status === 'in_progress') {
      let attempts = 0
      const maxAttempts = 30 // up to ~15s
      while (finalResponse.status === 'in_progress' && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500))
        finalResponse = await openai.responses.retrieve(response.id)
        attempts++
      }
    }

    if (finalResponse.status === 'completed') {
      const processingTime = Date.now() - startTime
      const performanceStatus =
        processingTime <= 60 ? 'EXCELLENT 🚀' : processingTime <= 120 ? 'GOOD ⚡' : 'ACCEPTABLE ⏰'

      // Extract text safely
      let content = 'No se pudo procesar la consulta.'
      if (Array.isArray(finalResponse.output) && finalResponse.output.length > 0) {
        const last = finalResponse.output[finalResponse.output.length - 1]
        if (last?.type === 'message') {
          const textPart = last.content?.find?.(c => c.type === 'output_text') as any
          if (textPart?.text) content = textPart.text
        }
      }

      console.log(`🎉 OPTIMAL SEARCH completed in ${processingTime}ms - ${performanceStatus}`)
      console.log(`📊 Processed ${vectorStoreIds.length} vector stores | tokens=${finalResponse.usage?.total_tokens ?? 0}`)

      return {
        content,
        tokens_used: finalResponse.usage?.total_tokens,
        response_time_ms: processingTime,
      }
    } else {
      const processingTime = Date.now() - startTime
      console.error(`❌ Optimal search failed with status: ${finalResponse.status}`)
      throw new Error(`La consulta no pudo completarse. Estado: ${finalResponse.status}`)
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ Optimal search failed after ${processingTime}ms:`, error)
    throw new Error(`Error en consulta de precios: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}