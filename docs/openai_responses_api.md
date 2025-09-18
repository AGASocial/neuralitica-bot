# OpenAI Responses API – Documentación Limpia

## Descripción
El endpoint **`/v1/responses`** permite generar respuestas de modelos de OpenAI usando texto o imágenes como entrada.  
Soporta interacciones de múltiples turnos, herramientas integradas (web search, file search, etc.) y llamadas a funciones personalizadas.

---

## Crear una respuesta de modelo

**POST**  
`https://api.openai.com/v1/responses`

### Parámetros principales

- **`model`** *(string)* – Modelo a usar (ej. `gpt-4o`, `o3`, etc.)
- **`input`** *(string | array)* – Entrada de texto, imagen o archivo.
- **`instructions`** *(string)* – Mensaje de sistema (system/developer).
- **`temperature`** *(number)* – Controla aleatoriedad (0–2, por defecto 1).
- **`top_p`** *(number)* – Nucleus sampling.
- **`max_output_tokens`** *(integer)* – Límite superior de tokens generados.
- **`reasoning`** *(object)* – Configuración especial para modelos *o-series*.
- **`tools`** *(array)* – Lista de herramientas disponibles (integradas o funciones personalizadas).
- **`store`** *(boolean)* – Guardar la respuesta para recuperación posterior.
- **`stream`** *(boolean)* – Activar streaming SSE.
- **`metadata`** *(map)* – Hasta 16 pares clave-valor para info adicional.

### Ejemplo
```bash
curl https://api.openai.com/v1/responses   -H "Content-Type: application/json"   -H "Authorization: Bearer $OPENAI_API_KEY"   -d '{
    "model": "gpt-4.1",
    "input": "Tell me a three sentence bedtime story about a unicorn."
  }'
```

---

## Obtener una respuesta

**GET**  
`https://api.openai.com/v1/responses/{response_id}`

- `response_id` *(string)* – ID único de la respuesta.
- Parámetros opcionales: `include`, `stream`, `starting_after`, etc.

---

## Eliminar una respuesta

**DELETE**  
`https://api.openai.com/v1/responses/{response_id}`

Retorna:
```json
{
  "id": "...",
  "object": "response",
  "deleted": true
}
```

---

## Cancelar una respuesta (solo en background)

**POST**  
`https://api.openai.com/v1/responses/{response_id}/cancel`

---

## Listar ítems de entrada

**GET**  
`https://api.openai.com/v1/responses/{response_id}/input_items`

Devuelve los ítems que componen la entrada que generó la respuesta.

---

## Objeto `Response`

Propiedades principales:

- `id` *(string)* – Identificador único.
- `status` *(string)* – `completed`, `failed`, `in_progress`, `cancelled`, `queued`, `incomplete`.
- `output` *(array)* – Contenido generado (mensajes, tool calls, etc.).
- `usage` *(object)* – Tokens usados.
- `model` *(string)* – Modelo usado.
- `temperature` *(number)* – Temperatura aplicada.
- `tools` *(array)* – Herramientas habilitadas.
- `reasoning` *(object)* – Configuración y resumen (o-series).
- `metadata` *(map)* – Datos extra definidos por el usuario.
