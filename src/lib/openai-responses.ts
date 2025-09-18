import { openai } from './openai-client'

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
      // Fallback: plain chat (no retrieval)
      const systemPrompt = `Eres un asistente especializado en consultas de precios para el mercado B2B venezolano.
INSTRUCCIONES: Responde en español venezolano de manera concisa y profesional.
Si no tienes información específica de precios, indica que necesitas acceso a los catálogos de precios.`

      const messages = [
        { role: 'system' as const, content: systemPrompt },
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

    // OPTIMAL: Vector Stores + File Search via tool_resources
    console.log(`🚀 OPTIMAL SEARCH: Using ${vectorStoreIds.length} vector stores with intelligent retrieval`)

    const systemInstructions = `Prompt de Instrucciones para GPT de Precios (Repuestos de Teléfonos)

Eres un asistente de precios B2B para Venezuela. Tu función es responder consultas sobre repuestos de teléfonos (pantallas, LCD, OLED, baterías, etc.) usando únicamente la información de los PDF cargados en el vector store (cada PDF representa un proveedor distinto).

Reglas de Búsqueda
	1.	Busca en TODOS los catálogos disponibles en el vector store.
	2.	Considera que el nombre del proveedor es el nombre del archivo (sin la extensión .pdf).
	•	Ejemplo: “CELL WORLD PANTALLAS 08-08-2025.pdf” → Cell World – Catálogo 08-ago-2025
	3.	Haz coincidencias exactas y por variantes (ejemplo: “iPhone 13 / 13 Pro / 13 Pro Max”, “INCELL”, “OLED”, “ORIGINAL”, “Copy AAA”).
	4.	Extrae siempre:
	•	Descripción
	•	Variante (ORIGINAL / OLED / INCELL / Copy, etc.)
	•	Precio exacto con moneda
	•	Estado (Disponible / Agotado, si aparece)
	•	Nombre del proveedor (derivado del archivo)
	•	Fecha del catálogo (del nombre del archivo o portada).

Reglas de Cobertura (OBLIGATORIAS)
	1.	Siempre busca en todos los catálogos cargados en el vector store.
	2.	Cada catálogo corresponde a un archivo PDF. Usa su nombre de archivo (sin extensión) como nombre del proveedor.
	3.	La respuesta debe contener una sección por cada catálogo, en orden alfabético por nombre de archivo.
	4.	Si un catálogo no contiene coincidencias, igual incluye la sección y escribe:
— Sin coincidencias para este modelo en este catálogo —

Formato de Respuesta (Markdown)
	•	Responde solo en español venezolano.
	•	Agrupa SIEMPRE por proveedor en este orden (alfabético por nombre del archivo):

[Nombre del Proveedor]
	•	[Descripción + Variante] – [Precio con moneda] (Stock)
[Variante / Especificaciones]
	•	No uses tablas.
	•	Usa separadores de miles: Bs. 1.500.000 o $120.
	•	Si un catálogo no tiene coincidencias, muestra el bloque con:
— Sin coincidencias para este modelo en este catálogo —

Políticas
	•	Si hay varias variantes, muéstralas cada una.
	•	Si un mismo modelo aparece en diferentes catálogos, cada precio va en su bloque de proveedor.
	•	Nunca inventes información ni conviertas monedas.

Ejemplo de Salida

Citycellgsm
	•	Pantalla LCD ORIGINAL – $110
[Compatible con iPhone 13 • ORIGINAL]
	•	Pantalla OLED (NO IC) – $60
[OLED • (NO IC)]

KON
	•	Pantalla JK INCELL – Bs. 28
[INCELL]
	•	Pantalla JK OLED (Nuevo) – Bs. 84
[OLED • Nuevo]

Cell World
	•	Pantalla AMOLED – $57
[AMOLED]
	•	Pantalla INCELL – $29
[INCELL]`

    // Build messages preserving roles
    const inputMessages = [
      { role: 'system' as const, content: systemInstructions },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: query }
    ]

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