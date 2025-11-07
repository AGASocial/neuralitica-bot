'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDateVE } from '@/lib/date-utils'
import { useToast } from '@/contexts/ToastContext'
import { useConfirmation } from '@/contexts/ConfirmationContext'

interface PriceList {
  id: string
  file_name: string
  supplier_name: string | null
  storage_path: string
  openai_file_id: string | null
  openai_vector_file_id: string | null
  is_active: boolean
  uploaded_at: string
}

interface VectorStoreStatus {
  status: string
  file_counts: {
    completed: number
    in_progress: number
    failed: number
    total: number
  }
  health_status: string
}

interface VectorStoreStatusBadgeProps {
  priceListId: string
  vectorStatus: Record<string, VectorStoreStatus>
  statusLoading: boolean
  isActive?: boolean
}

function VectorStoreStatusBadge({ priceListId, vectorStatus, statusLoading, isActive = true }: VectorStoreStatusBadgeProps) {
  if (statusLoading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
        Verificando...
      </span>
    )
  }

  // If file is inactive, show inactive status (inactive files don't appear in vector-store-status response)
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        ⚫ Inactivo
      </span>
    )
  }

  const status = vectorStatus[priceListId]
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        ❓ Desconocido
      </span>
    )
  }

  const getStatusDisplay = () => {
    if (status.health_status === 'healthy') {
      return {
        bg: 'bg-green-100 text-green-800',
        icon: '✅',
        text: 'Listo',
        shortText: 'OK'
      }
    }
    
    if (status.health_status === 'partially_healthy') {
      // If no files processed yet, show "Inicializando" instead of "Procesando (0/0)"
      if (status.file_counts.total === 0 || (status.file_counts.completed === 0 && status.file_counts.in_progress === 0)) {
        return {
          bg: 'bg-yellow-100 text-yellow-800',
          icon: '⚡',
          text: 'Inicializando...',
          shortText: 'Init'
        }
      }
      return {
        bg: 'bg-yellow-100 text-yellow-800',
        icon: '⚡',
        text: `Procesando (${status.file_counts.completed}/${status.file_counts.total})`,
        shortText: `${status.file_counts.completed}/${status.file_counts.total}`
      }
    }
    
    if (status.status === 'in_progress') {
      return {
        bg: 'bg-blue-100 text-blue-800',
        icon: '🔄',
        text: `Procesando (${status.file_counts.in_progress} archivos)`,
        shortText: `${status.file_counts.in_progress}`
      }
    }
    
    if (status.health_status === 'unhealthy' || status.status === 'failed') {
      return {
        bg: 'bg-red-100 text-red-800',
        icon: '❌',
        text: 'Falló',
        shortText: 'Err'
      }
    }
    
    return {
      bg: 'bg-gray-100 text-gray-600',
      icon: '❓',
      text: status.status || 'Desconocido',
      shortText: '?'
    }
  }

  const display = getStatusDisplay()
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${display.bg}`}>
      <span className="mr-1">{display.icon}</span>
      <span className="hidden sm:inline">{display.text}</span>
      <span className="sm:hidden">{display.shortText}</span>
    </span>
  )
}

export default function FilesManagementClient() {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const { confirmDanger, confirmWarning } = useConfirmation()
  const [files, setFiles] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [vectorStatus, setVectorStatus] = useState<Record<string, VectorStoreStatus>>({})
  const [statusLoading, setStatusLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to check if any files are still processing
  const hasProcessingFiles = (statusMap: Record<string, VectorStoreStatus>) => {
    return Object.values(statusMap).some(status => 
      status.health_status !== 'healthy' || 
      status.status === 'in_progress' || 
      status.file_counts.in_progress > 0 ||
      status.file_counts.completed < status.file_counts.total
    )
  }

  // Function to start/stop polling based on processing status
  const managePollInterval = (statusMap: Record<string, VectorStoreStatus>) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (hasProcessingFiles(statusMap)) {
      console.log('🔄 Some files are still processing, continuing polling...')
      intervalRef.current = setInterval(() => {
        fetchVectorStoreStatus()
      }, 30000)
    } else {
      console.log('✅ All files completed, stopping polling')
    }
  }

  useEffect(() => {
    fetchFiles()
    fetchVectorStoreStatus()
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/admin/files')
      
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVectorStoreStatus = async () => {
    try {
      setStatusLoading(true)
      const response = await fetch(`/api/admin/vector-store-status?ts=${Date.now()}`, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error('Failed to fetch vector store status')
      }
      
      const data = await response.json()
      const statusMap: Record<string, VectorStoreStatus> = {}
      
      // Create a map of price list ID to vector store status
      data.vector_stores.forEach((store: any) => {
        statusMap[store.database_info.price_list_id] = {
          status: store.vector_store_info.status,
          file_counts: store.vector_store_info.file_counts,
          health_status: store.health_status
        }
      })
      
      setVectorStatus(statusMap)
      
      // Manage polling based on processing status
      managePollInterval(statusMap)
    } catch (error) {
      console.error('Error fetching vector store status:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  // Process files (used by both input and drag & drop)
  const processFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList)
    const pdfFiles = filesArray.filter(f => f.type === 'application/pdf')
    const skipped = filesArray.length - pdfFiles.length

    if (pdfFiles.length === 0) {
      showWarning('Por favor selecciona archivos PDF')
      return
    }

    setUploading(true)

    let successCount = 0
    const errors: string[] = []

    try {
      console.log(`Uploading ${pdfFiles.length} PDF(s) directly to OpenAI for ultra-fast processing...`)
      
      for (const file of pdfFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('supplier_name', '') // Can be enhanced with supplier input

        const response = await fetch('/api/openai/upload-pdf', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          let errorMsg = 'Unknown error'
          try {
            const errorData = await response.json()
            errorMsg = errorData.error || errorData.details || errorMsg
          } catch (_) {}
          errors.push(`${file.name}: ${errorMsg}`)
          continue
        }

        const result = await response.json()
        console.log(`OpenAI upload for ${file.name} completed in ${result.processing_time_ms}ms`)
        successCount += 1
      }

      // Refresh files list and restart polling once after all uploads
      await fetchFiles()
      await fetchVectorStoreStatus()

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      const parts: string[] = []
      if (successCount > 0) parts.push(`¡${successCount} archivo(s) subido(s) exitosamente a OpenAI!`)
      if (skipped > 0) parts.push(`${skipped} archivo(s) no eran PDF y fueron ignorados.`)
      if (errors.length > 0) parts.push(`Errores:\n- ${errors.join('\n- ')}`)
      
      if (errors.length > 0) {
        showWarning(parts.join('\n\n'))
      } else {
        showSuccess(parts.join('\n\n'))
      }
    } catch (error: any) {
      console.error('Error uploading files:', error)
      showError(`Error al subir archivos: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    await processFiles(selectedFiles)
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're actually leaving the drop zone
    // Check if the relatedTarget is outside the drop zone
    const relatedTarget = e.relatedTarget as Node | null
    if (
      dropZoneRef.current &&
      (!relatedTarget || !dropZoneRef.current.contains(relatedTarget))
    ) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      await processFiles(droppedFiles)
    }
  }

  const toggleFileStatus = async (id: string, currentStatus: boolean) => {
    try {
      console.log(`${currentStatus ? 'Deactivating' : 'Activating'} file with vector store management...`)
      
      // Use OpenAI management API for vector store handling
      const response = await fetch('/api/openai/manage-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_active',
          priceListId: id,
        }),
      })

      // Try to parse JSON; gracefully handle HTML/redirect responses
      let result: any = null
      let rawText = ''
      try {
        result = await response.clone().json()
      } catch (e) {
        try {
          rawText = await response.text()
        } catch (_) {
          rawText = ''
        }
      }

      // If not OK but server still returned success=true, continue as success
      if (!response.ok && !(result && result.success)) {
        const errorMsg =
          (result && (result.error || result.details)) ||
          (rawText && (rawText.includes('<!DOCTYPE html') || rawText.includes('<html') ? 'Respuesta HTML recibida (posible redirección o sesión expirada)' : rawText)) ||
          `HTTP ${response.status}`
        throw new Error(`Vector store management failed: ${errorMsg}`)
      }

      // Ensure we have a result object
      if (!result) {
        try {
          result = await response.json()
        } catch {
          result = {}
        }
      }
      console.log(`File status toggled in ${result.processing_time_ms}ms`)

      // Update local state
      setFiles(files.map(file => 
        file.id === id ? { 
          ...file, 
          is_active: result.is_active,
          openai_vector_file_id: result.vector_store_id || file.openai_vector_file_id
        } : file
      ))

      // Refresh vector store status since file activation may trigger processing
      await fetchVectorStoreStatus()

      showSuccess(`¡Archivo ${result.is_active ? 'activado' : 'desactivado'} exitosamente! Tiempo de procesamiento: ${result.processing_time_ms}ms`)
    } catch (error: any) {
      console.error('Error toggling file status:', error)
      showError(`Error al actualizar archivo: ${error.message}`)
    }
  }

  const deleteFile = async (id: string, storagePath: string) => {
    const confirmed = await confirmDanger(
      'Eliminar archivo',
      '¿Estás seguro de que quieres eliminar este archivo? Esto lo eliminará de OpenAI, almacenes vectoriales y todos los sistemas de almacenamiento.'
    )
    if (!confirmed) {
      return
    }

    try {
      console.log('Initiating complete file deletion from all systems...')
      
      // Use comprehensive deletion API
      const response = await fetch('/api/openai/manage-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_complete',
          priceListId: id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Deletion failed: ${errorData.error}`)
      }

      const result = await response.json()
      console.log(`Complete deletion finished in ${result.processing_time_ms}ms`)

      // Update local state
      setFiles(files.filter(file => file.id !== id))
      
      if (result.success) {
        showSuccess(`¡Archivo eliminado exitosamente de todos los sistemas! Tiempo de procesamiento: ${result.processing_time_ms}ms`)
      } else {
        showWarning(`Eliminación parcial completada. Algunos sistemas pueden requerir limpieza manual. Tiempo de procesamiento: ${result.processing_time_ms}ms`)
      }
    } catch (error: any) {
      console.error('Error deleting file:', error)
      showError(`Error al eliminar archivo: ${error.message}`)
    }
  }

  const syncMasterVectorStore = async () => {
    const confirmed = await confirmWarning(
      'Sincronizar Master Vector Store',
      '¿Estás seguro de que quieres sincronizar el Master Vector Store? Esto asegurará que todos los archivos activos estén correctamente sincronizados.'
    )
    if (!confirmed) {
      return
    }

    setSyncing(true)

    try {
      console.log('Iniciando sincronización del Master Vector Store...')
      
      const response = await fetch('/api/openai/manage-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_master_store',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Sync failed: ${errorData.error}`)
      }

      const result = await response.json()
      console.log(`Master Vector Store sync completed in ${result.processing_time_ms}ms`)

      // Refresh vector store status after sync
      await fetchVectorStoreStatus()
      
      showSuccess(`¡Sincronización completada exitosamente!\n\nArchivos agregados: ${result.sync_result.added}\nArchivos removidos: ${result.sync_result.removed}\nTiempo de procesamiento: ${result.processing_time_ms}ms`)
    } catch (error: any) {
      console.error('Error syncing master vector store:', error)
      showError(`Error al sincronizar: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.supplier_name && file.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Subir PDF</h2>
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 h-[240px] flex items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center text-center w-full h-full">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-medium text-gray-700">Subiendo archivos...</p>
              </>
            ) : isDragging ? (
              <>
                <svg
                  className="w-16 h-16 text-blue-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg font-semibold text-blue-600 mb-2">Suelta los archivos aquí</p>
                <p className="text-sm text-gray-600">Suelta los archivos PDF para subirlos</p>
              </>
            ) : (
              <>
                <svg
                  className="w-16 h-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Arrastra y suelta archivos PDF aquí
                </p>
                <p className="text-sm text-gray-500 mb-4">o</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Seleccionar archivos
                </button>
                <p className="text-xs text-gray-400 mt-4">Solo archivos PDF</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Master Vector Store Management */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Master Vector Store</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={syncMasterVectorStore}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sincronizando...
              </>
            ) : (
              <>
                🔄 Sincronizar Todo
              </>
            )}
          </button>
          <p className="text-sm text-gray-600">
            Sincroniza todos los archivos activos con el Master Vector Store para asegurar consistencia
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar archivos por nombre o proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 text-black rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
        />
      </div>

      {/* Files List */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        {filteredFiles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchTerm ? 'No se encontraron archivos que coincidan con tu búsqueda.' : 'Aún no se han subido archivos.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <li key={file.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${
                      file.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {file.file_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {file.supplier_name || 'Sin proveedor especificado'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Subido {formatDateVE(file.uploaded_at)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                          file.openai_file_id 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <span className="hidden sm:inline">{file.openai_file_id ? '✓ OpenAI Listo' : '⏳ Procesando'}</span>
                          <span className="sm:hidden">{file.openai_file_id ? '✓ Listo' : '⏳'}</span>
                        </span>
                        {file.openai_vector_file_id && (
                          <VectorStoreStatusBadge 
                            priceListId={file.id}
                            vectorStatus={vectorStatus}
                            statusLoading={statusLoading}
                            isActive={file.is_active}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons - stack on mobile, inline on desktop */}
                  <div className="flex flex-wrap items-center gap-2 sm:space-x-2 sm:flex-nowrap">
                    <button
                      onClick={() => toggleFileStatus(file.id, file.is_active)}
                      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        file.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1">{file.is_active ? '🟢' : '⚫'}</span>
                      <span className="hidden sm:inline">{file.is_active ? 'Activo' : 'Inactivo'}</span>
                      <span className="sm:hidden">{file.is_active ? 'On' : 'Off'}</span>
                    </button>
                    <button
                      onClick={() => deleteFile(file.id, file.storage_path)}
                      className="inline-flex items-center px-2 sm:px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200 flex-shrink-0"
                    >
                      <span className="mr-1">🗑️</span>
                      <span className="hidden sm:inline">Eliminar</span>
                      <span className="sm:hidden">Del</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}