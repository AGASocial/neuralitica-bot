import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmationDialog from '../ConfirmationDialog'

describe('ConfirmationDialog', () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(
      <ConfirmationDialog
        isOpen={false}
        options={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should not render when options is null', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        options={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render dialog when open with info variant', () => {
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Message')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should render dialog with danger variant', () => {
    const options = {
      title: 'Danger Title',
      message: 'Danger Message',
      variant: 'danger' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Danger Title')).toBeInTheDocument()
    expect(screen.getByText('Danger Message')).toBeInTheDocument()
  })

  it('should render dialog with warning variant', () => {
    const options = {
      title: 'Warning Title',
      message: 'Warning Message',
      variant: 'warning' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Warning Title')).toBeInTheDocument()
    expect(screen.getByText('Warning Message')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Confirmar')
    await user.click(confirmButton)

    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    expect(mockOnCancel).not.toHaveBeenCalled()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancelar')
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('should call onCancel when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Click on backdrop (the fixed inset-0 div)
    const backdrop = screen.getByRole('dialog').parentElement?.querySelector('.fixed.inset-0')
    if (backdrop) {
      await user.click(backdrop as HTMLElement)
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    }
  })

  it('should call onCancel when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    await user.keyboard('{Escape}')

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('should use custom confirm and cancel text', () => {
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
      confirmText: 'Yes',
      cancelText: 'No',
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('should handle multiline messages', () => {
    const options = {
      title: 'Test Title',
      message: 'Line 1\nLine 2',
      variant: 'info' as const,
    }

    render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Line 1\nLine 2')).toBeInTheDocument()
  })

  it('should prevent body scroll when open', () => {
    const options = {
      title: 'Test Title',
      message: 'Test Message',
      variant: 'info' as const,
    }

    const { unmount } = render(
      <ConfirmationDialog
        isOpen={true}
        options={options}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('unset')
  })
})



