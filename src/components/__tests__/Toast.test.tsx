import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../Toast'

describe('Toast', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render success toast', () => {
    const toast = {
      id: '1',
      message: 'Success message',
      type: 'success' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50')
  })

  it('should render error toast', () => {
    const toast = {
      id: '1',
      message: 'Error message',
      type: 'error' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50')
  })

  it('should render warning toast', () => {
    const toast = {
      id: '1',
      message: 'Warning message',
      type: 'warning' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50')
  })

  it('should render info toast', () => {
    const toast = {
      id: '1',
      message: 'Info message',
      type: 'info' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    expect(screen.getByText('Info message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50')
  })

  it('should call onClose after default duration', async () => {
    const toast = {
      id: '1',
      message: 'Test message',
      type: 'info' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    jest.advanceTimersByTime(5000)
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('1')
    })
  })

  it('should call onClose after custom duration', async () => {
    const toast = {
      id: '1',
      message: 'Test message',
      type: 'info' as const,
      duration: 3000,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    jest.advanceTimersByTime(3000)
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('1')
    })
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    const toast = {
      id: '1',
      message: 'Test message',
      type: 'info' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledWith('1')
  })

  it('should handle multiline messages', () => {
    const toast = {
      id: '1',
      message: 'Line 1\nLine 2',
      type: 'info' as const,
    }

    render(<Toast toast={toast} onClose={mockOnClose} />)
    
    expect(screen.getByText('Line 1\nLine 2')).toBeInTheDocument()
  })

  it('should clear timer on unmount', () => {
    const toast = {
      id: '1',
      message: 'Test message',
      type: 'info' as const,
    }

    const { unmount } = render(<Toast toast={toast} onClose={mockOnClose} />)
    
    unmount()
    jest.advanceTimersByTime(5000)
    
    // onClose should not be called after unmount
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})



