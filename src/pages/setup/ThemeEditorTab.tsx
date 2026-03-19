import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import RestoreIcon from '@mui/icons-material/Restore'
import SaveIcon from '@mui/icons-material/Save'
import { type ThemeSettings, DEFAULT_THEME_SETTINGS, AVAILABLE_FONT_FAMILIES } from '@/theme'
import { useThemeStore } from '@/store/themeStore'

// ─── ColorField ───────────────────────────────────────────────────────────────

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  testId: string
}

function ColorField({ label, value, onChange, testId }: ColorFieldProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        data-testid={testId}
        sx={{
          width: 40,
          height: 40,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      />
      <Typography variant="body2" sx={{ minWidth: 130 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
        {value}
      </Typography>
    </Box>
  )
}

// ─── NumberField ──────────────────────────────────────────────────────────────

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  testId: string
  adornment?: string
}

function NumberField({ label, value, min, max, onChange, testId, adornment }: NumberFieldProps) {
  return (
    <TextField
      label={`${label}${adornment ? ` (${adornment})` : ''}`}
      type="number"
      size="small"
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10)
        if (!isNaN(v) && v >= min && v <= max) onChange(v)
      }}
      inputProps={{ min, max, 'data-testid': testId }}
      sx={{ width: 180 }}
    />
  )
}

// ─── LivePreview ──────────────────────────────────────────────────────────────

interface LivePreviewProps {
  draft: ThemeSettings
}

function LivePreview({ draft }: LivePreviewProps) {
  const { t } = useTranslation()

  return (
    <Box
      data-testid="theme-preview"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${draft.shape.borderRadiusLarge}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {t('setup.theme.preview')}
      </Typography>

      {/* Colour swatches */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {(
          [
            { key: 'primaryMain', label: 'Primary' },
            { key: 'secondaryMain', label: 'Secondary' },
            { key: 'errorMain', label: 'Error' },
            { key: 'warningMain', label: 'Warning' },
            { key: 'successMain', label: 'Success' },
            { key: 'infoMain', label: 'Info' },
          ] as const
        ).map(({ key }) => (
          <Box
            key={key}
            data-testid={`preview-swatch-${key}`}
            style={{ backgroundColor: draft.palette[key] }}
            sx={{
              width: 32,
              height: 32,
              borderRadius: `${draft.shape.borderRadiusSubtle}px`,
            }}
          />
        ))}
      </Box>

      {/* Sample buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box
          component="button"
          data-testid="preview-primary-btn"
          style={{
            padding: '6px 16px',
            backgroundColor: draft.palette.primaryMain,
            color: '#fff',
            border: 'none',
            borderRadius: `${draft.shape.borderRadiusStandard}px`,
            fontFamily: draft.typography.fontFamily,
            fontSize: draft.typography.fontSizeBase,
            cursor: 'default',
          }}
        >
          Primary
        </Box>
        <Box
          component="button"
          data-testid="preview-secondary-btn"
          style={{
            padding: '6px 16px',
            backgroundColor: draft.palette.secondaryMain,
            color: '#fff',
            border: 'none',
            borderRadius: `${draft.shape.borderRadiusStandard}px`,
            fontFamily: draft.typography.fontFamily,
            fontSize: draft.typography.fontSizeBase,
            cursor: 'default',
          }}
        >
          Secondary
        </Box>
      </Box>

      {/* Typography sample */}
      <Box
        data-testid="preview-typography"
        style={{
          fontFamily: draft.typography.fontFamily,
          fontSize: draft.typography.fontSizeBase,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: draft.typography.fontSizeBase * 1.5 }}>
          Heading Sample
        </div>
        <div>Body text at {draft.typography.fontSizeBase}px in {draft.typography.fontFamily.split(',')[0].replace(/"/g, '')}</div>
      </Box>

      {/* Border radius sample */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {(
          [
            { r: draft.shape.borderRadiusSubtle, label: 'Subtle' },
            { r: draft.shape.borderRadiusStandard, label: 'Standard' },
            { r: draft.shape.borderRadiusLarge, label: 'Large' },
          ] as const
        ).map(({ r, label }) => (
          <Box
            key={label}
            data-testid={`preview-radius-${label.toLowerCase()}`}
            sx={{
              width: 48,
              height: 48,
              border: '2px solid',
              borderColor: draft.palette.primaryMain,
              borderRadius: `${r}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ fontSize: 9 }}>
              {r}px
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ─── ThemeEditorTab ───────────────────────────────────────────────────────────

export function ThemeEditorTab() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const getThemeForTenant = useThemeStore((s) => s.getThemeForTenant)
  const setThemeForTenant = useThemeStore((s) => s.setThemeForTenant)
  const resetThemeForTenant = useThemeStore((s) => s.resetThemeForTenant)

  const [draft, setDraft] = useState<ThemeSettings>(() => getThemeForTenant(tenantId))
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  function updatePalette(key: keyof ThemeSettings['palette'], value: string) {
    setSavedMsg(null)
    setDraft((prev) => ({ ...prev, palette: { ...prev.palette, [key]: value } }))
  }

  function updateTypography(key: keyof ThemeSettings['typography'], value: string | number) {
    setSavedMsg(null)
    setDraft((prev) => ({ ...prev, typography: { ...prev.typography, [key]: value } }))
  }

  function updateShape(key: keyof ThemeSettings['shape'], value: number) {
    setSavedMsg(null)
    setDraft((prev) => ({ ...prev, shape: { ...prev.shape, [key]: value } }))
  }

  function updateSpacing(key: keyof ThemeSettings['spacing'], value: number) {
    setSavedMsg(null)
    setDraft((prev) => ({ ...prev, spacing: { ...prev.spacing, [key]: value } }))
  }

  function handleSave() {
    setThemeForTenant(tenantId, draft)
    setSavedMsg(t('setup.theme.saveSuccess'))
  }

  function handleReset() {
    resetThemeForTenant(tenantId)
    setDraft(DEFAULT_THEME_SETTINGS)
    setSavedMsg(t('setup.theme.resetSuccess'))
  }

  const paletteFields: { key: keyof ThemeSettings['palette']; labelKey: string }[] = [
    { key: 'primaryMain', labelKey: 'setup.theme.primary' },
    { key: 'secondaryMain', labelKey: 'setup.theme.secondary' },
    { key: 'errorMain', labelKey: 'setup.theme.error' },
    { key: 'warningMain', labelKey: 'setup.theme.warning' },
    { key: 'successMain', labelKey: 'setup.theme.success' },
    { key: 'infoMain', labelKey: 'setup.theme.info' },
  ]

  return (
    <Box data-testid="theme-editor-tab">
      {savedMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSavedMsg(null)} data-testid="theme-save-alert">
          {savedMsg}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        {/* ── Editor panel ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Colors */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('setup.theme.colors')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {paletteFields.map(({ key, labelKey }) => (
                <ColorField
                  key={key}
                  label={t(labelKey)}
                  value={draft.palette[key]}
                  onChange={(v) => updatePalette(key, v)}
                  testId={`color-picker-${key}`}
                />
              ))}
            </Box>
          </Box>

          <Divider />

          {/* Typography */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('setup.theme.typography')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl size="small" sx={{ width: 280 }}>
                <InputLabel id="font-family-label">{t('setup.theme.fontFamily')}</InputLabel>
                <Select
                  labelId="font-family-label"
                  label={t('setup.theme.fontFamily')}
                  value={draft.typography.fontFamily}
                  onChange={(e) => updateTypography('fontFamily', e.target.value)}
                  inputProps={{ 'data-testid': 'font-family-select' }}
                >
                  {AVAILABLE_FONT_FAMILIES.map((f) => (
                    <MenuItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <NumberField
                label={t('setup.theme.fontSizeBase')}
                value={draft.typography.fontSizeBase}
                min={10}
                max={20}
                onChange={(v) => updateTypography('fontSizeBase', v)}
                testId="font-size-input"
                adornment="px"
              />
            </Box>
          </Box>

          <Divider />

          {/* Spacing & Borders */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('setup.theme.spacingAndBorders')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NumberField
                label={t('setup.theme.spacingUnit')}
                value={draft.spacing.unit}
                min={4}
                max={16}
                onChange={(v) => updateSpacing('unit', v)}
                testId="spacing-unit-input"
                adornment="px"
              />
              <NumberField
                label={t('setup.theme.borderRadiusSubtle')}
                value={draft.shape.borderRadiusSubtle}
                min={0}
                max={24}
                onChange={(v) => updateShape('borderRadiusSubtle', v)}
                testId="border-radius-subtle-input"
                adornment="px"
              />
              <NumberField
                label={t('setup.theme.borderRadiusStandard')}
                value={draft.shape.borderRadiusStandard}
                min={0}
                max={24}
                onChange={(v) => updateShape('borderRadiusStandard', v)}
                testId="border-radius-standard-input"
                adornment="px"
              />
              <NumberField
                label={t('setup.theme.borderRadiusLarge')}
                value={draft.shape.borderRadiusLarge}
                min={0}
                max={32}
                onChange={(v) => updateShape('borderRadiusLarge', v)}
                testId="border-radius-large-input"
                adornment="px"
              />
            </Box>
          </Box>

          <Divider />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              data-testid="save-theme-btn"
            >
              {t('setup.theme.save')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              data-testid="reset-theme-btn"
            >
              {t('setup.theme.reset')}
            </Button>
          </Box>
        </Box>

        {/* ── Preview panel ── */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <LivePreview draft={draft} />
        </Box>
      </Box>
    </Box>
  )
}
