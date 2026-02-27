import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmationProvider, useConfirmation } from '../ConfirmationContext'

// Test component that uses the confirmation context
function TestComponent() {
  const { confirm, confirmDanger, confirmWarning, confirmInfo } = useConfirmation()
  const [result, setResult] = React.useState<string>('')

  const handleConfirm = async () => {
    const res = await confirm({
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info',
    })
    setResult(res ? 'confirmed' : 'cancelled')
  }

  const handleConfirmDanger = async () => {
    const res = await confirmDanger('Danger Title', 'Danger Message')
    setResult(res ? 'confirmed' : 'cancelled')
  }

  const handleConfirmWarning = async () => {
    const res = await confirmWarning('Warning Title', 'Warning Message')
    setResult(res ? 'confirmed' : 'cancelled')
  }

  const handleConfirmInfo = async () => {
    const res = await confirmInfo('Info Title', 'Info Message')
    setResult(res ? 'confirmed' : 'cancelled')
  }

  return (
    <div>
      <button onClick={handleConfirm}>Show Confirm</button>
      <button onClick={handleConfirmDanger}>Show Danger</button>
      <button onClick={handleConfirmWarning}>Show Warning</button>
      <button onClick={handleConfirmInfo}>Show Info</button>
      <div data-testid="result">{result}</div>
    </div>
  )
}

describe('ConfirmationContext', () => {
  it('should show confirmation dialog', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Confirm'))

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Message')).toBeInTheDocument()
    })
  })

  it('should return true when confirmed', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Confirm'))

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    const confirmButton = screen.getByText('Confirmar')
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('confirmed')
    })
  })

  it('should return false when cancelled', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Confirm'))

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancelar')
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('cancelled')
    })
  })

  it('should show danger confirmation', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Danger'))

    await waitFor(() => {
      expect(screen.getByText('Danger Title')).toBeInTheDocument()
      expect(screen.getByText('Danger Message')).toBeInTheDocument()
    })
  })

  it('should show warning confirmation', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Warning'))

    await waitFor(() => {
      expect(screen.getByText('Warning Title')).toBeInTheDocument()
      expect(screen.getByText('Warning Message')).toBeInTheDocument()
    })
  })

  it('should show info confirmation', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Info'))

    await waitFor(() => {
      expect(screen.getByText('Info Title')).toBeInTheDocument()
      expect(screen.getByText('Info Message')).toBeInTheDocument()
    })
  })

  it('should close dialog on Escape key', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationProvider>
        <TestComponent />
      </ConfirmationProvider>
    )

    await user.click(screen.getByText('Show Confirm'))

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
      expect(screen.getByTestId('result')).toHaveTextContent('cancelled')
    })
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useConfirmation must be used within a ConfirmationProvider')

    consoleSpy.mockRestore()
  })
})



