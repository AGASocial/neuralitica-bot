'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ConfirmationOptions, ConfirmationVariant } from '@/components/ConfirmationDialog'
import ConfirmationDialog from '@/components/ConfirmationDialog'

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>
  confirmDanger: (title: string, message: string) => Promise<boolean>
  confirmWarning: (title: string, message: string) => Promise<boolean>
  confirmInfo: (title: string, message: string) => Promise<boolean>
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined)

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmationOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(options)
      setIsOpen(true)
      setResolvePromise(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
    setIsOpen(false)
    setOptions(null)
  }, [resolvePromise])

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
    setIsOpen(false)
    setOptions(null)
  }, [resolvePromise])

  const confirmDanger = useCallback((title: string, message: string): Promise<boolean> => {
    return confirm({ title, message, variant: 'danger' })
  }, [confirm])

  const confirmWarning = useCallback((title: string, message: string): Promise<boolean> => {
    return confirm({ title, message, variant: 'warning' })
  }, [confirm])

  const confirmInfo = useCallback((title: string, message: string): Promise<boolean> => {
    return confirm({ title, message, variant: 'info' })
  }, [confirm])

  return (
    <ConfirmationContext.Provider
      value={{
        confirm,
        confirmDanger,
        confirmWarning,
        confirmInfo,
      }}
    >
      {children}
      <ConfirmationDialog
        isOpen={isOpen}
        options={options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmationContext.Provider>
  )
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext)
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider')
  }
  return context
}

