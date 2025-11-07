'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { formatDateTimeVE } from '@/lib/date-utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  response_time_ms?: number
  tokens_used?: number
}

const STORAGE_KEY = 'neuralitica_chat_conversation_id'

export default function ChatPageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Focus textarea when component mounts and after sending messages
  const focusTextarea = () => {
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const restoreConversation = async () => {
      try {
        const savedConversationId = localStorage.getItem(STORAGE_KEY)
        if (savedConversationId) {
          console.log('🔄 Restoring conversation:', savedConversationId.slice(-8))
          setConversationId(savedConversationId)
          
          // Fetch conversation history
          const response = await fetch(`/api/chat?conversationId=${savedConversationId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              // conversationId is already set above, now restore messages if any
              if (data.messages && data.messages.length > 0) {
                // Transform API messages to ChatMessage format
                const restoredMessages: ChatMessage[] = data.messages.map((msg: any) => ({
                  role: msg.role,
                  content: msg.content,
                  timestamp: new Date(msg.timestamp),
                  response_time_ms: msg.response_time_ms,
                  tokens_used: msg.tokens_used
                }))
                setMessages(restoredMessages)
                console.log('✅ Restored', restoredMessages.length, 'messages')
              } else {
                console.log('✅ Conversation restored (no messages yet)')
              }
            } else {
              console.log('⚠️ Could not restore conversation, starting fresh')
              localStorage.removeItem(STORAGE_KEY)
              setConversationId(null)
            }
          } else {
            console.log('⚠️ Could not restore conversation, starting fresh')
            localStorage.removeItem(STORAGE_KEY)
            setConversationId(null)
          }
        }
      } catch (error) {
        console.error('Error restoring conversation:', error)
        localStorage.removeItem(STORAGE_KEY)
        setConversationId(null)
      } finally {
        setIsRestoring(false)
        focusTextarea()
      }
    }

    restoreConversation()
  }, [])

  useEffect(() => {
    // Focus after loading finishes (after AI response)
    if (!loading) {
      focusTextarea()
    }
  }, [loading])

  // Persist conversationId to localStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem(STORAGE_KEY, conversationId)
    }
  }, [conversationId])

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          conversationId: conversationId,
          // User ID will be extracted from session on server-side
          conversationHistory: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Ha ocurrido un error con su búsqueda. Intente nuevamente'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch {
        // If response is not valid JSON (like "Deployment error" string)
        throw new Error('Ha ocurrido un error con su búsqueda. Intente nuevamente')
      }
      setLastResponseTime(result.response_time_ms)

      // Store conversation ID if returned from API (for new conversations)
      // The useEffect hook will automatically persist it to localStorage
      if (result.conversationId) {
        setConversationId(result.conversationId)
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.response || 'Ha ocurrido un error con su búsqueda. Intente nuevamente',
        timestamp: new Date(),
        response_time_ms: result.response_time_ms,
        tokens_used: result.tokens_used
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setLastResponseTime(null)
    // Clear persisted conversation
    localStorage.removeItem(STORAGE_KEY)
    focusTextarea()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-w-5xl mx-auto overflow-hidden">
      {/* Chat Header - Fixed at top */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-lg font-semibold text-slate-800 truncate">Consultas</h3>
              <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Pregunta sobre tus archivos {conversationId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  ID: {conversationId.slice(-8)}
                </span>
              )}</p>
            </div>
          </div>

          <button
            onClick={startNewConversation}
            className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-slate-700 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm flex-shrink-0"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Nueva Conversación</span>
          </button>
        </div>
      </div>

      {/* Messages Area - Scrollable with constrained height */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white/50 to-slate-50/50 min-h-0">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {isRestoring ? (
            <div className="text-center py-8 sm:py-16 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="animate-spin w-6 h-6 sm:w-8 sm:h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">Restaurando conversación...</h4>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 sm:py-16 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">¡Comienza una conversación!</h4>
              <p className="text-slate-500 text-sm mb-4">Pregunta sobre tus archivos</p>
              <div className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 text-xs sm:text-sm rounded-lg max-w-full">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="break-words">Ejemplo: "¿Cuál es la misión de la empresa?"</span>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-2xl flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 sm:space-x-3 space-x-reverse`}>
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-br from-emerald-400 to-green-500'
                    }`}>
                    {message.role === 'user' ? (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className={`px-3 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg border ${message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-200 shadow-blue-100'
                    : 'bg-white text-slate-800 border-slate-200 shadow-slate-100'
                    }`}>
                    {message.role === 'assistant' ? (
                      <div className="text-sm leading-relaxed break-words prose prose-sm max-w-none prose-slate prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-em:text-slate-600 prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-table:text-xs">
                        <ReactMarkdown
                          components={{
                            // Custom styling for markdown elements
                            h2: ({ node, ...props }) => <h2 className="text-base font-bold text-slate-800 mt-4 mb-2 first:mt-0" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-slate-800 mt-3 mb-1" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => <ul className="mb-2 ml-4" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                            em: ({ node, ...props }) => <em className="italic text-slate-600" {...props} />,
                            code: ({ node, ...props }) => {
                              const { children, className } = props
                              const isInline = !className?.includes('language-')
                              return isInline ? (
                                <code className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                              ) : (
                                <code className="block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono" {...props} />
                              )
                            },
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-2">
                                <table className="min-w-full border border-slate-200 rounded-lg text-xs" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
                            th: ({ node, ...props }) => <th className="border border-slate-200 px-2 py-1 font-semibold text-left" {...props} />,
                            td: ({ node, ...props }) => <td className="border border-slate-200 px-2 py-1" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    <div className={`mt-2 sm:mt-3 text-xs flex items-center flex-wrap gap-1 sm:gap-2 ${message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                      }`}>
                      <span>{formatDateTimeVE(message.timestamp).split(' ')[1]}</span>
                      {message.response_time_ms && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="inline-flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {message.response_time_ms}ms
                          </span>
                          {message.tokens_used && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="inline-flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className="hidden sm:inline">{message.tokens_used} tokens</span>
                                <span className="sm:hidden">{message.tokens_used}t</span>
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] sm:max-w-2xl flex flex-row items-start space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-white px-3 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="animate-bounce w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"></div>
                    <div className="animate-bounce w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ animationDelay: '0.1s' }}></div>
                    <div className="animate-bounce w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-slate-500 text-sm ml-2">Buscando información de los archivos...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-200/80 flex-shrink-0">
        <div className="flex items-start space-x-2 sm:space-x-4">
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregunta sobre información de los archivos..."
              disabled={loading}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-slate-500 shadow-sm transition-all duration-200 text-sm sm:text-base"
              rows={2}
            />
            <div className="mt-1 sm:mt-2 flex justify-between items-center text-xs text-slate-500">
              <span className="flex items-center">
                <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-slate-200 text-slate-600 rounded text-xs font-mono mr-1">Enter</kbd>
                <span className="hidden sm:inline">para enviar •</span>
                <span className="sm:hidden">enviar</span>
                <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-slate-200 text-slate-600 rounded text-xs font-mono mx-1 hidden sm:inline">Shift</kbd>
                <span className="hidden sm:inline">+</span>
                <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-slate-200 text-slate-600 rounded text-xs font-mono mr-1 hidden sm:inline">Enter</kbd>
                <span className="hidden sm:inline">para nueva línea</span>
              </span>
              <span className="text-slate-400 hidden sm:inline">Optimizado para consultas de archivos</span>
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !inputMessage.trim()}
            className="px-3 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-1 sm:space-x-2 flex-shrink-0"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Enviando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}