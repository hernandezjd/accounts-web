import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import { KeyboardShortcutsProvider } from './KeyboardShortcutsContext'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
      </MemoryRouter>
    </I18nextProvider>
  )
}

function ShortcutConsumer({
  shortcutKey,
  handler,
}: {
  shortcutKey: string
  handler: () => void
}) {
  useKeyboardShortcut(shortcutKey, 'Test shortcut', handler)
  return <div data-testid="consumer">consumer</div>
}

describe('KeyboardShortcutsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires handler when registered key is pressed', () => {
    const handler = vi.fn()
    render(
      <TestWrapper>
        <ShortcutConsumer shortcutKey="a" handler={handler} />
      </TestWrapper>,
    )
    fireEvent.keyDown(window, { key: 'a' })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not fire handler for a different key', () => {
    const handler = vi.fn()
    render(
      <TestWrapper>
        <ShortcutConsumer shortcutKey="a" handler={handler} />
      </TestWrapper>,
    )
    fireEvent.keyDown(window, { key: 'b' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire handler when target is an input', () => {
    const handler = vi.fn()
    render(
      <TestWrapper>
        <ShortcutConsumer shortcutKey="a" handler={handler} />
        <input data-testid="my-input" />
      </TestWrapper>,
    )
    const input = screen.getByTestId('my-input')
    fireEvent.keyDown(input, { key: 'a', target: input })
    expect(handler).not.toHaveBeenCalled()
  })

  it('supports multiple shortcuts simultaneously', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    render(
      <TestWrapper>
        <ShortcutConsumer shortcutKey="a" handler={handlerA} />
        <ShortcutConsumer shortcutKey="b" handler={handlerB} />
      </TestWrapper>,
    )
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 'b' })
    expect(handlerA).toHaveBeenCalledOnce()
    expect(handlerB).toHaveBeenCalledOnce()
  })

  it('opens shortcuts dialog when ? is pressed', async () => {
    render(
      <TestWrapper>
        <div>content</div>
      </TestWrapper>,
    )
    fireEvent.keyDown(window, { key: '?' })
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('shows "Show keyboard shortcuts help" entry in the dialog', async () => {
    render(
      <TestWrapper>
        <div>content</div>
      </TestWrapper>,
    )
    fireEvent.keyDown(window, { key: '?' })
    await waitFor(() => {
      expect(screen.getByText('Show keyboard shortcuts help')).toBeInTheDocument()
    })
  })
})
