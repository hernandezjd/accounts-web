import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { ThemeEditorTab } from './ThemeEditorTab'
import { DEFAULT_THEME_SETTINGS } from '@/theme'

// ─── Mock themeStore ──────────────────────────────────────────────────────────

const mockSetThemeForWorkspace = vi.fn()
const mockResetThemeForWorkspace = vi.fn()
let mockStoredSettings = DEFAULT_THEME_SETTINGS

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: object) => unknown) => {
    const state = {
      themesByWorkspace: {},
      getThemeForWorkspace: (_id: string) => mockStoredSettings,
      setThemeForWorkspace: mockSetThemeForWorkspace,
      resetThemeForWorkspace: mockResetThemeForWorkspace,
    }
    return selector(state)
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function render() {
  return renderWithProviders(<ThemeEditorTab />, {
    routerProps: { initialEntries: ['/workspaces/t-1/setup'] },
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockStoredSettings = DEFAULT_THEME_SETTINGS
})

describe('ThemeEditorTab — rendering', () => {
  it('renders the theme editor tab container', () => {
    render()
    expect(screen.getByTestId('theme-editor-tab')).toBeInTheDocument()
  })

  it('renders color pickers with default palette values', () => {
    render()
    const primaryPicker = screen.getByTestId('color-picker-primaryMain') as HTMLInputElement
    expect(primaryPicker.value).toBe(DEFAULT_THEME_SETTINGS.palette.primaryMain)
    const secondaryPicker = screen.getByTestId('color-picker-secondaryMain') as HTMLInputElement
    expect(secondaryPicker.value).toBe(DEFAULT_THEME_SETTINGS.palette.secondaryMain)
  })

  it('renders all six colour pickers', () => {
    render()
    expect(screen.getByTestId('color-picker-primaryMain')).toBeInTheDocument()
    expect(screen.getByTestId('color-picker-secondaryMain')).toBeInTheDocument()
    expect(screen.getByTestId('color-picker-errorMain')).toBeInTheDocument()
    expect(screen.getByTestId('color-picker-warningMain')).toBeInTheDocument()
    expect(screen.getByTestId('color-picker-successMain')).toBeInTheDocument()
    expect(screen.getByTestId('color-picker-infoMain')).toBeInTheDocument()
  })

  it('renders font size input with default value', () => {
    render()
    const input = screen.getByTestId('font-size-input') as HTMLInputElement
    expect(Number(input.value)).toBe(DEFAULT_THEME_SETTINGS.typography.fontSizeBase)
  })

  it('renders border radius inputs with default values', () => {
    render()
    expect(Number((screen.getByTestId('border-radius-subtle-input') as HTMLInputElement).value))
      .toBe(DEFAULT_THEME_SETTINGS.shape.borderRadiusSubtle)
    expect(Number((screen.getByTestId('border-radius-standard-input') as HTMLInputElement).value))
      .toBe(DEFAULT_THEME_SETTINGS.shape.borderRadiusStandard)
    expect(Number((screen.getByTestId('border-radius-large-input') as HTMLInputElement).value))
      .toBe(DEFAULT_THEME_SETTINGS.shape.borderRadiusLarge)
  })

  it('renders save and reset buttons', () => {
    render()
    expect(screen.getByTestId('save-theme-btn')).toBeInTheDocument()
    expect(screen.getByTestId('reset-theme-btn')).toBeInTheDocument()
  })

  it('renders live preview panel', () => {
    render()
    expect(screen.getByTestId('theme-preview')).toBeInTheDocument()
  })
})

describe('ThemeEditorTab — draft updates', () => {
  it('colour picker change updates the draft and reflects in preview swatch', () => {
    render()
    const picker = screen.getByTestId('color-picker-primaryMain')
    fireEvent.change(picker, { target: { value: '#ff0000' } })
    const swatch = screen.getByTestId('preview-swatch-primaryMain')
    expect(swatch).toHaveStyle({ backgroundColor: '#ff0000' })
  })

  it('font size input change updates the preview typography sample', () => {
    render()
    const input = screen.getByTestId('font-size-input')
    fireEvent.change(input, { target: { value: '16' } })
    const preview = screen.getByTestId('preview-typography')
    expect(preview).toHaveStyle({ fontSize: '16px' })
  })

  it('border radius change updates the preview radius box', () => {
    render()
    const input = screen.getByTestId('border-radius-standard-input')
    fireEvent.change(input, { target: { value: '12' } })
    const btn = screen.getByTestId('preview-primary-btn')
    expect(btn).toHaveStyle({ borderRadius: '12px' })
  })
})

describe('ThemeEditorTab — save', () => {
  it('calls setThemeForWorkspace with current draft when Save is clicked', async () => {
    const user = userEvent.setup()
    render()

    // Change primary colour
    const picker = screen.getByTestId('color-picker-primaryMain')
    fireEvent.change(picker, { target: { value: '#abcdef' } })

    await user.click(screen.getByTestId('save-theme-btn'))

    // workspaceId is '' in test (MemoryRouter has no route params without Route definitions)
    expect(mockSetThemeForWorkspace).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        palette: expect.objectContaining({ primaryMain: '#abcdef' }),
      }),
    )
  })

  it('shows save success alert after saving', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('save-theme-btn'))
    expect(screen.getByTestId('theme-save-alert')).toBeInTheDocument()
  })
})

describe('ThemeEditorTab — reset', () => {
  it('calls resetThemeForWorkspace when Reset is clicked', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('reset-theme-btn'))
    // workspaceId is '' in test (MemoryRouter has no route params without Route definitions)
    expect(mockResetThemeForWorkspace).toHaveBeenCalledWith('')
  })

  it('resets draft to default values after Reset is clicked', async () => {
    const user = userEvent.setup()
    render()

    // Change primary colour first
    const picker = screen.getByTestId('color-picker-primaryMain')
    fireEvent.change(picker, { target: { value: '#ff0000' } })

    // Reset
    await user.click(screen.getByTestId('reset-theme-btn'))

    const resetPicker = screen.getByTestId('color-picker-primaryMain') as HTMLInputElement
    expect(resetPicker.value).toBe(DEFAULT_THEME_SETTINGS.palette.primaryMain)
  })

  it('shows reset success alert after resetting', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('reset-theme-btn'))
    expect(screen.getByTestId('theme-save-alert')).toBeInTheDocument()
  })
})
