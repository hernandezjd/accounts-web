import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionFormDialog } from './TransactionFormDialog'
import { transactionDraftKey } from './transactionDraft'

// Mock the form: these tests are about how the dialog closes, not about the form fields
vi.mock('./TransactionForm', () => ({
  TransactionForm: ({
    onCancel,
    onSuccess,
    onDirtyChange,
  }: {
    onCancel: () => void
    onSuccess: () => void
    onDirtyChange?: (dirty: boolean) => void
  }) => (
    <div data-testid="transaction-form">
      <button onClick={() => onDirtyChange?.(true)} data-testid="make-dirty">
        Change something
      </button>
      <button onClick={onCancel} data-testid="form-cancel">
        Cancel
      </button>
      <button onClick={onSuccess} data-testid="form-save">
        Save
      </button>
    </div>
  ),
}))

const DRAFT_STORAGE_KEY = `form-draft:${transactionDraftKey('ws-1')}`

function renderDialog(mode: 'create' | 'edit' = 'edit') {
  const onSuccess = vi.fn()
  const onClose = vi.fn()
  renderWithProviders(
    <TransactionFormDialog workspaceId="ws-1" mode={mode} transactionId="txn-1" onSuccess={onSuccess} onClose={onClose} />,
  )
  return { onSuccess, onClose }
}

describe('TransactionFormDialog', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('shows the form inside a dialog', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toContainElement(screen.getByTestId('transaction-form'))
  })

  it('does not close on a click outside the dialog', async () => {
    const { onClose } = renderDialog()
    const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
  })

  it('closes at once on Escape when nothing was changed', async () => {
    const { onClose } = renderDialog()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('discard-changes-dialog')).not.toBeInTheDocument()
  })

  it('closes at once on Cancel when nothing was changed', async () => {
    const { onClose } = renderDialog()
    await userEvent.click(screen.getByTestId('form-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks before closing on Escape when something was changed', async () => {
    const { onClose } = renderDialog()
    await userEvent.click(screen.getByTestId('make-dirty'))
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByTestId('discard-changes-dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('asks before closing on Cancel when something was changed', async () => {
    const { onClose } = renderDialog()
    await userEvent.click(screen.getByTestId('make-dirty'))
    await userEvent.click(screen.getByTestId('form-cancel'))
    expect(await screen.findByTestId('discard-changes-dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps the form open when the user chooses to keep editing', async () => {
    const { onClose } = renderDialog()
    await userEvent.click(screen.getByTestId('make-dirty'))
    await userEvent.click(screen.getByTestId('form-cancel'))
    await userEvent.click(await screen.findByTestId('keep-editing-btn'))
    await waitFor(() => expect(screen.queryByTestId('discard-changes-dialog')).not.toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
  })

  it('closes when the user confirms the discard', async () => {
    const { onClose } = renderDialog()
    await userEvent.click(screen.getByTestId('make-dirty'))
    await userEvent.click(screen.getByTestId('form-cancel'))
    await userEvent.click(await screen.findByTestId('discard-changes-btn'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('removes the stored draft when a new transaction is discarded', async () => {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, '{"description":"half typed"}')
    renderDialog('create')
    await userEvent.click(screen.getByTestId('make-dirty'))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(await screen.findByTestId('discard-changes-btn'))
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('reports a save without asking for confirmation', async () => {
    const { onSuccess, onClose } = renderDialog()
    await userEvent.click(screen.getByTestId('make-dirty'))
    await userEvent.click(screen.getByTestId('form-save'))
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
