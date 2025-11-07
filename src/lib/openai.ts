import { openaiDirect as openai } from './openai-client'
export { openai }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OpenAIResponse {
  content: string
  tokens_used?: number
  response_time_ms?: number
}

export interface AssistantResult {
  id: string
  name: string
  model: string
  tools: any[]
  tool_resources?: any
}

// Ultra-fast PDF processing and vector store utilities for NeuraliticaBot
// Optimized for sub-100ms response times on Venezuelan B2B price queries

export interface FileUploadResult {
  file_id: string
  filename: string
  bytes: number
  purpose: string
}

export interface VectorStoreResult {
  id: string
  name: string
  file_counts: {
    in_progress: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }
  status: 'in_progress' | 'completed' | 'failed' | 'expired'
  expires_at: number | null | undefined
}

export interface VectorStoreFileResult {
  id: string
  usage_bytes: number
  created_at: number
  vector_store_id: string
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  last_error?: {
    code: string
    message: string
  }
}

/**
 * Upload PDF to OpenAI Files API for ultra-fast processing
 * Optimized for Venezuelan price catalogs
 */
export async function uploadPDFToOpenAI(
  file: Buffer,
  filename: string
): Promise<FileUploadResult> {
  const startTime = Date.now()
  
  try {
    // Create a proper File object from Buffer for OpenAI API
    // Convert Buffer to ArrayBuffer for compatibility with Blob constructor
    const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const fileData = new File([blob], filename, { type: 'application/pdf' })
    
    const response = await openai.files.create({
      file: fileData,
      purpose: 'assistants', // Required for vector stores
    })

    const processingTime = Date.now() - startTime
    console.log(`PDF upload completed in ${processingTime}ms for file: ${filename}`)

    return {
      file_id: response.id,
      filename: response.filename,
      bytes: response.bytes,
      purpose: response.purpose,
    }
  } catch (error) {
    console.error('OpenAI file upload error:', error)
    throw new Error(`Failed to upload PDF to OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create vector store for ultra-fast price queries
 * Optimized for Spanish-language B2B catalog search
 */
export async function createVectorStore(
  name: string,
  fileIds: string[]
): Promise<VectorStoreResult> {
  const startTime = Date.now()
  
  try {
    const vectorStore = await openai.vectorStores.create({
      name: name,
      file_ids: fileIds,
      expires_after: {
        anchor: 'last_active_at',
        days: 30 // Vector stores expire after 30 days of inactivity
      }
    })

    const processingTime = Date.now() - startTime
    console.log(`Vector store created in ${processingTime}ms: ${vectorStore.id}`)

    return {
      id: vectorStore.id,
      name: vectorStore.name || name,
      file_counts: vectorStore.file_counts,
      status: vectorStore.status,
      expires_at: vectorStore.expires_at,
    }
  } catch (error) {
    console.error('Vector store creation error:', error)
    throw new Error(`Failed to create vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Add file to existing vector store
 */
export async function addFileToVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<VectorStoreFileResult> {
  try {
    const vectorStoreFile = await openai.vectorStores.files.create(
      vectorStoreId,
      { file_id: fileId }
    )

    return {
      id: vectorStoreFile.id,
      usage_bytes: vectorStoreFile.usage_bytes,
      created_at: vectorStoreFile.created_at,
      vector_store_id: vectorStoreFile.vector_store_id,
      status: vectorStoreFile.status,
      last_error: vectorStoreFile.last_error || undefined,
    }
  } catch (error) {
    console.error('Add file to vector store error:', error)
    throw new Error(`Failed to add file to vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Remove file from vector store
 */
export async function removeFileFromVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<{ deleted: boolean }> {
  try {
    const result = await openai.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId })
    return { deleted: result.deleted }
  } catch (error) {
    console.error('Remove file from vector store error:', error)
    throw new Error(`Failed to remove file from vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete vector store completely
 */
export async function deleteVectorStore(vectorStoreId: string): Promise<{ deleted: boolean }> {
  try {
    const result = await openai.vectorStores.delete(vectorStoreId)
    return { deleted: result.deleted }
  } catch (error) {
    console.error('Delete vector store error:', error)
    throw new Error(`Failed to delete vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete file from OpenAI completely
 */
export async function deleteOpenAIFile(fileId: string): Promise<{ deleted: boolean }> {
  try {
    const result = await openai.files.delete(fileId)
    return { deleted: result.deleted }
  } catch (error) {
    console.error('Delete OpenAI file error:', error)
    throw new Error(`Failed to delete OpenAI file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// DEPRECATED: Assistants API functions moved to legacy
// The price query functionality has been migrated to Responses API
// See openai-responses.ts for the new implementation

/**
 * Get vector store status for monitoring
 */
export async function getVectorStoreStatus(vectorStoreId: string): Promise<VectorStoreResult> {
  try {
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId)
    
    return {
      id: vectorStore.id,
      name: vectorStore.name || '',
      file_counts: vectorStore.file_counts,
      status: vectorStore.status,
      expires_at: vectorStore.expires_at,
    }
  } catch (error) {
    console.error('Get vector store status error:', error)
    throw new Error(`Failed to get vector store status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// MASTER VECTOR STORE MANAGEMENT
// Best practice: One vector store containing all active PDFs

const MASTER_VECTOR_STORE_NAME = 'NeuraliticaBot-Master-Catalog'

/**
 * Get or create the master vector store for all PDFs
 * This is the optimal approach - one store for all catalogs
 */
export async function getOrCreateMasterVectorStore(): Promise<VectorStoreResult> {
  const startTime = Date.now()
  
  try {
    // First, try to find existing master vector store
    const vectorStores = await openai.vectorStores.list()
    const existingMaster = vectorStores.data.find(store => 
      store.name === MASTER_VECTOR_STORE_NAME
    )

    if (existingMaster) {
      console.log(`✅ Found existing master vector store: ${existingMaster.id}`)
      return {
        id: existingMaster.id,
        name: existingMaster.name || MASTER_VECTOR_STORE_NAME,
        file_counts: existingMaster.file_counts,
        status: existingMaster.status,
        expires_at: existingMaster.expires_at,
      }
    }

    // Create new master vector store
    const vectorStore = await openai.vectorStores.create({
      name: MASTER_VECTOR_STORE_NAME,
      expires_after: {
        anchor: 'last_active_at',
        days: 365 // Master store lives longer
      }
    })

    const processingTime = Date.now() - startTime
    console.log(`🚀 Created master vector store in ${processingTime}ms: ${vectorStore.id}`)

    return {
      id: vectorStore.id,
      name: vectorStore.name || MASTER_VECTOR_STORE_NAME,
      file_counts: vectorStore.file_counts,
      status: vectorStore.status,
      expires_at: vectorStore.expires_at,
    }
  } catch (error) {
    console.error('Master vector store error:', error)
    throw new Error(`Failed to get/create master vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Add file to master vector store
 * Use this when a new PDF catalog is uploaded
 */
export async function addFileToMasterVectorStore(fileId: string): Promise<VectorStoreFileResult> {
  try {
    const masterStore = await getOrCreateMasterVectorStore()
    
    // Check if file is already in the store
    const existingFiles = await openai.vectorStores.files.list(masterStore.id)
    const fileExists = existingFiles.data.some(file => file.id === fileId)
    
    if (fileExists) {
      console.log(`ℹ️ File ${fileId} already exists in master vector store`)
      // Return existing file info
      const existingFile = existingFiles.data.find(file => file.id === fileId)!
      return {
        id: existingFile.id,
        usage_bytes: existingFile.usage_bytes,
        created_at: existingFile.created_at,
        vector_store_id: existingFile.vector_store_id,
        status: existingFile.status,
        last_error: existingFile.last_error || undefined,
      }
    }

    // Add file to master store
    const vectorStoreFile = await openai.vectorStores.files.create(
      masterStore.id,
      { file_id: fileId }
    )

    console.log(`✅ Added file ${fileId} to master vector store`)

    return {
      id: vectorStoreFile.id,
      usage_bytes: vectorStoreFile.usage_bytes,
      created_at: vectorStoreFile.created_at,
      vector_store_id: vectorStoreFile.vector_store_id,
      status: vectorStoreFile.status,
      last_error: vectorStoreFile.last_error || undefined,
    }
  } catch (error) {
    console.error('Add file to master vector store error:', error)
    throw new Error(`Failed to add file to master vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Remove file from master vector store
 * Use this when a catalog becomes inactive
 */
export async function removeFileFromMasterVectorStore(fileId: string): Promise<{ deleted: boolean }> {
  try {
    const masterStore = await getOrCreateMasterVectorStore()
    const result = await openai.vectorStores.files.delete(fileId, { vector_store_id: masterStore.id })
    
    console.log(`🗑️ Removed file ${fileId} from master vector store`)
    return { deleted: result.deleted }
  } catch (error) {
    console.error('Remove file from master vector store error:', error)
    throw new Error(`Failed to remove file from master vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Sync all active files to master vector store
 * Call this to ensure master store contains only active catalogs
 */
export async function syncMasterVectorStore(activeFileIds: string[]): Promise<{
  added: number,
  removed: number,
  masterStoreId: string
}> {
  try {
    const masterStore = await getOrCreateMasterVectorStore()
    
    // Get current files in master store
    const currentFiles = await openai.vectorStores.files.list(masterStore.id)
    const currentFileIds = currentFiles.data.map(file => file.id)
    
    // Find files to add (in activeFileIds but not in master store)
    const filesToAdd = activeFileIds.filter(fileId => !currentFileIds.includes(fileId))
    
    // Find files to remove (in master store but not in activeFileIds)
    const filesToRemove = currentFileIds.filter(fileId => !activeFileIds.includes(fileId))
    
    console.log(`📊 Master sync: ${filesToAdd.length} to add, ${filesToRemove.length} to remove`)
    
    // Add missing files
    const addPromises = filesToAdd.map(fileId => 
      openai.vectorStores.files.create(masterStore.id, { file_id: fileId })
        .catch(error => {
          console.error(`Failed to add file ${fileId}:`, error)
          return null
        })
    )
    
    // Remove inactive files
    const removePromises = filesToRemove.map(fileId => 
      openai.vectorStores.files.delete(fileId, { vector_store_id: masterStore.id })
        .catch(error => {
          console.error(`Failed to remove file ${fileId}:`, error)
          return null
        })
    )
    
    const [addResults, removeResults] = await Promise.all([
      Promise.all(addPromises),
      Promise.all(removePromises)
    ])
    
    const successfulAdds = addResults.filter(result => result !== null).length
    const successfulRemoves = removeResults.filter(result => result !== null).length
    
    console.log(`✅ Master sync complete: ${successfulAdds} added, ${successfulRemoves} removed`)
    
    return {
      added: successfulAdds,
      removed: successfulRemoves,
      masterStoreId: masterStore.id
    }
  } catch (error) {
    console.error('Sync master vector store error:', error)
    throw new Error(`Failed to sync master vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}