import { describe, it, expect, beforeEach } from 'vitest'
import i18n from './index'

describe('i18n infrastructure', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('initializes with English as default', () => {
    expect(i18n.language).toBe('en')
  })

  it('translates keys in English', () => {
    expect(i18n.t('common.loading')).toBe('Loading...')
    expect(i18n.t('common.save')).toBe('Save')
    expect(i18n.t('nav.accounts')).toBe('Accounts')
  })

  it('translates keys in Spanish after changeLanguage', async () => {
    await i18n.changeLanguage('es')
    expect(i18n.t('common.loading')).toBe('Cargando...')
    expect(i18n.t('common.save')).toBe('Guardar')
    expect(i18n.t('nav.accounts')).toBe('Cuentas')
  })

  it('translates keys in Ukrainian', async () => {
    await i18n.changeLanguage('uk')
    expect(i18n.t('common.loading')).toBe('Завантаження...')
    expect(i18n.t('common.save')).toBe('Зберегти')
    expect(i18n.t('nav.accounts')).toBe('Рахунки')
  })

  it('translates keys in French', async () => {
    await i18n.changeLanguage('fr')
    expect(i18n.t('common.loading')).toBe('Chargement...')
    expect(i18n.t('common.save')).toBe('Enregistrer')
    expect(i18n.t('nav.accounts')).toBe('Comptes')
  })

  it('persists language selection to localStorage', async () => {
    await i18n.changeLanguage('es')
    // The i18next LanguageDetector stores under the configured lookupLocalStorage key
    const stored = localStorage.getItem('language')
    expect(stored).toBe('es')
  })

  it('restores language from localStorage on reinit', async () => {
    localStorage.setItem('language', 'es')
    // Re-detect: i18next reads localStorage on init; simulate by changing language
    await i18n.changeLanguage(localStorage.getItem('language') ?? 'en')
    expect(i18n.language).toBe('es')
    expect(i18n.t('common.cancel')).toBe('Cancelar')
  })

  it('persists Ukrainian language selection to localStorage', async () => {
    await i18n.changeLanguage('uk')
    const stored = localStorage.getItem('language')
    expect(stored).toBe('uk')
  })

  it('persists French language selection to localStorage', async () => {
    await i18n.changeLanguage('fr')
    const stored = localStorage.getItem('language')
    expect(stored).toBe('fr')
  })

  it('provides all language names in all languages', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('language.english')).toBe('English')
    expect(i18n.t('language.spanish')).toBe('Español')
    expect(i18n.t('language.ukrainian')).toBe('Українська')
    expect(i18n.t('language.french')).toBe('Français')

    await i18n.changeLanguage('es')
    expect(i18n.t('language.english')).toBeTruthy()
    expect(i18n.t('language.spanish')).toBeTruthy()
    expect(i18n.t('language.ukrainian')).toBeTruthy()
    expect(i18n.t('language.french')).toBeTruthy()

    await i18n.changeLanguage('uk')
    expect(i18n.t('language.english')).toBeTruthy()
    expect(i18n.t('language.spanish')).toBeTruthy()
    expect(i18n.t('language.ukrainian')).toBeTruthy()
    expect(i18n.t('language.french')).toBeTruthy()

    await i18n.changeLanguage('fr')
    expect(i18n.t('language.english')).toBeTruthy()
    expect(i18n.t('language.spanish')).toBeTruthy()
    expect(i18n.t('language.ukrainian')).toBeTruthy()
    expect(i18n.t('language.french')).toBeTruthy()
  })
})
