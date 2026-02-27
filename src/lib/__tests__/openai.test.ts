import {
  uploadPDFToOpenAI,
  generateFileIdsHash,
  findExistingTempVectorStore,
  createVectorStore,
  getOrCreateTempVectorStore,
  addFileToVectorStore,
  removeFileFromVectorStore,
  deleteVectorStore,
  deleteOpenAIFile,
  waitForVectorStoreReady,
  getVectorStoreStatus,
  getOrCreateMasterVectorStore,
  addFileToMasterVectorStore,
  removeFileFromMasterVectorStore,
  syncMasterVectorStore,
} from '../openai'

// Mock openai-client
jest.mock('../openai-client', () => ({
  openaiDirect: {
    files: {
      create: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
    },
    vectorStores: {
      list: jest.fn(),
      create: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
      files: {
        list: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    },
  },
}))

const mockOpenAI = require('../openai-client').openaiDirect

describe('openai', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateFileIdsHash', () => {
    it('should generate consistent hash for same file IDs', () => {
      const fileIds = ['file1', 'file2', 'file3']
      const hash1 = generateFileIdsHash(fileIds)
      const hash2 = generateFileIdsHash(fileIds)
      expect(hash1).toBe(hash2)
    })

    it('should generate same hash regardless of order', () => {
      const hash1 = generateFileIdsHash(['file1', 'file2'])
      const hash2 = generateFileIdsHash(['file2', 'file1'])
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different file IDs', () => {
      const hash1 = generateFileIdsHash(['file1', 'file2'])
      const hash2 = generateFileIdsHash(['file3', 'file4'])
      expect(hash1).not.toBe(hash2)
    })

    it('should return 16 character hash', () => {
      const hash = generateFileIdsHash(['file1'])
      expect(hash).toHaveLength(16)
    })
  })

  describe('uploadPDFToOpenAI', () => {
    it('should upload PDF file successfully', async () => {
      const mockFile = Buffer.from('test pdf content')
      const mockResponse = {
        id: 'file-123',
        filename: 'test.pdf',
        bytes: 100,
        purpose: 'assistants',
      }

      mockOpenAI.files.create.mockResolvedValue(mockResponse)

      const result = await uploadPDFToOpenAI(mockFile, 'test.pdf')
      expect(result).toEqual({
        file_id: 'file-123',
        filename: 'test.pdf',
        bytes: 100,
        purpose: 'assistants',
      })
    })

    it('should throw error on upload failure', async () => {
      const mockFile = Buffer.from('test pdf content')
      mockOpenAI.files.create.mockRejectedValue(new Error('Upload failed'))

      await expect(uploadPDFToOpenAI(mockFile, 'test.pdf')).rejects.toThrow(
        'Failed to upload PDF to OpenAI'
      )
    })
  })

  describe('createVectorStore', () => {
    it('should create vector store successfully', async () => {
      const mockResponse = {
        id: 'vs-123',
        name: 'Test Store',
        file_counts: {
          in_progress: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
          total: 0,
        },
        status: 'in_progress',
        expires_at: null,
      }

      mockOpenAI.vectorStores.create.mockResolvedValue(mockResponse)

      const result = await createVectorStore('Test Store', ['file-1'])
      expect(result.id).toBe('vs-123')
      expect(mockOpenAI.vectorStores.create).toHaveBeenCalledWith({
        name: 'Test Store',
        file_ids: ['file-1'],
        expires_after: {
          anchor: 'last_active_at',
          days: 30,
        },
      })
    })

    it('should throw error on creation failure', async () => {
      mockOpenAI.vectorStores.create.mockRejectedValue(
        new Error('Creation failed')
      )

      await expect(
        createVectorStore('Test Store', ['file-1'])
      ).rejects.toThrow('Failed to create vector store')
    })
  })

  describe('getVectorStoreStatus', () => {
    it('should retrieve vector store status', async () => {
      const mockResponse = {
        id: 'vs-123',
        name: 'Test Store',
        file_counts: {
          in_progress: 0,
          completed: 1,
          failed: 0,
          cancelled: 0,
          total: 1,
        },
        status: 'completed',
        expires_at: null,
      }

      mockOpenAI.vectorStores.retrieve.mockResolvedValue(mockResponse)

      const result = await getVectorStoreStatus('vs-123')
      expect(result).toEqual({
        id: 'vs-123',
        name: 'Test Store',
        file_counts: mockResponse.file_counts,
        status: 'completed',
        expires_at: null,
      })
    })
  })

  describe('findExistingTempVectorStore', () => {
    it('should find existing vector store with matching files', async () => {
      const fileIds = ['file-1', 'file-2']
      const hash = generateFileIdsHash(fileIds)
      const expectedName = `Temp-${hash}`

      const mockStore = {
        id: 'vs-123',
        name: expectedName,
        file_counts: { total: 2, completed: 2, in_progress: 0, failed: 0, cancelled: 0 },
        status: 'completed',
      }

      mockOpenAI.vectorStores.list.mockResolvedValue({
        data: [mockStore],
      })

      mockOpenAI.vectorStores.files.list.mockResolvedValue({
        data: [
          { id: 'file-1', status: 'completed' },
          { id: 'file-2', status: 'completed' },
        ],
      })

      const result = await findExistingTempVectorStore(fileIds)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('vs-123')
    })

    it('should return null when no matching store found', async () => {
      mockOpenAI.vectorStores.list.mockResolvedValue({ data: [] })

      const result = await findExistingTempVectorStore(['file-1'])
      expect(result).toBeNull()
    })

    it('should return null when files do not match exactly', async () => {
      const fileIds = ['file-1']
      const hash = generateFileIdsHash(fileIds)

      mockOpenAI.vectorStores.list.mockResolvedValue({
        data: [{ id: 'vs-123', name: `Temp-${hash}` }],
      })

      mockOpenAI.vectorStores.files.list.mockResolvedValue({
        data: [{ id: 'file-2', status: 'completed' }],
      })

      const result = await findExistingTempVectorStore(fileIds)
      expect(result).toBeNull()
    })
  })

  describe('getOrCreateMasterVectorStore', () => {
    it('should return existing master vector store', async () => {
      const mockStore = {
        id: 'vs-master',
        name: 'NeuraliticaBot-Master-Catalog',
        file_counts: { total: 5, completed: 5, in_progress: 0, failed: 0, cancelled: 0 },
        status: 'completed',
        expires_at: null,
      }

      mockOpenAI.vectorStores.list.mockResolvedValue({
        data: [mockStore],
      })

      const result = await getOrCreateMasterVectorStore()
      expect(result.id).toBe('vs-master')
    })

    it('should create new master vector store if not exists', async () => {
      mockOpenAI.vectorStores.list.mockResolvedValue({ data: [] })

      const mockNewStore = {
        id: 'vs-master-new',
        name: 'NeuraliticaBot-Master-Catalog',
        file_counts: { total: 0, completed: 0, in_progress: 0, failed: 0, cancelled: 0 },
        status: 'in_progress',
        expires_at: null,
      }

      mockOpenAI.vectorStores.create.mockResolvedValue(mockNewStore)

      const result = await getOrCreateMasterVectorStore()
      expect(result.id).toBe('vs-master-new')
    })
  })

  describe('addFileToVectorStore', () => {
    it('should add file to vector store', async () => {
      const mockResponse = {
        id: 'vsf-123',
        usage_bytes: 1000,
        created_at: 1234567890,
        vector_store_id: 'vs-123',
        status: 'in_progress',
      }

      mockOpenAI.vectorStores.files.create.mockResolvedValue(mockResponse)

      const result = await addFileToVectorStore('vs-123', 'file-1')
      expect(result).toEqual({
        id: 'vsf-123',
        usage_bytes: 1000,
        created_at: 1234567890,
        vector_store_id: 'vs-123',
        status: 'in_progress',
      })
    })
  })

  describe('removeFileFromVectorStore', () => {
    it('should remove file from vector store', async () => {
      mockOpenAI.vectorStores.files.delete.mockResolvedValue({
        deleted: true,
      })

      const result = await removeFileFromVectorStore('vs-123', 'file-1')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('deleteVectorStore', () => {
    it('should delete vector store', async () => {
      mockOpenAI.vectorStores.delete.mockResolvedValue({ deleted: true })

      const result = await deleteVectorStore('vs-123')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('deleteOpenAIFile', () => {
    it('should delete OpenAI file', async () => {
      mockOpenAI.files.delete.mockResolvedValue({ deleted: true })

      const result = await deleteOpenAIFile('file-123')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('syncMasterVectorStore', () => {
    it('should sync master vector store with active files', async () => {
      const activeFileIds = ['file-1', 'file-2']

      // Mock master store
      const mockMasterStore = {
        id: 'vs-master',
        name: 'NeuraliticaBot-Master-Catalog',
      }

      mockOpenAI.vectorStores.list.mockResolvedValue({
        data: [mockMasterStore],
      })

      // Mock existing files in store
      mockOpenAI.vectorStores.files.list.mockResolvedValue({
        data: [{ id: 'file-1' }, { id: 'file-3' }],
      })

      // Mock add and remove operations
      mockOpenAI.vectorStores.files.create.mockResolvedValue({ id: 'vsf-2' })
      mockOpenAI.vectorStores.files.delete.mockResolvedValue({ deleted: true })

      const result = await syncMasterVectorStore(activeFileIds)
      expect(result.added).toBe(1) // file-2 added
      expect(result.removed).toBe(1) // file-3 removed
      expect(result.masterStoreId).toBe('vs-master')
    })
  })
})



