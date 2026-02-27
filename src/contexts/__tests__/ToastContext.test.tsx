import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../ToastContext'

// Test component that uses the toast context
function TestComponent() {
  const { showToast, showSuccess, showError, showWarning, showInfo, removeToast, toasts } = useToast()

  return (
    <div>
      <button onClick={() => showToast('Test message', 'info')}>Show Toast</button>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      {toasts.length > 0 && (
        <button onClick={() => removeToast(toasts[0].id)}>Remove First</button>
      )}
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  )
}

describe('ToastContext', () => {
  it('should provide toast context', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
  })

  it('should show toast with default type', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Toast').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
  })

  it('should show success toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Success').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
  })

  it('should show error toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Error').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
  })

  it('should show warning toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Warning').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
  })

  it('should show info toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Info').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
  })

  it('should remove toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Toast').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1')

    act(() => {
      screen.getByText('Remove First').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleSpy.mockRestore()
  })

  it('should handle multiple toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Success').click()
      screen.getByText('Show Error').click()
      screen.getByText('Show Warning').click()
    })

    expect(screen.getByTestId('toast-count')).toHaveTextContent('3')
  })
})



