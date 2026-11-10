import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useErrorHandler } from '@accounts/error-handling-web'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { CurrencyMultiSelect } from '@/components/CurrencyMultiSelect'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useWorkspaceConfigMutations } from '@/hooks/api/useWorkspaceConfigMutations'
import { allCurrencyCodes } from '@/utils/money'

/**
 * Base, enabled and balanced currencies of a workspace (MC-12). The base currency is chosen once and never
 * changes; the enabled currencies are the ones accounts can track.
 */
export function CurrenciesSection({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation()
  const { data: config } = useWorkspaceConfig(workspaceId)
  const { setBaseCurrency, setEnabledCurrencies, setBalancedCurrencies } = useWorkspaceConfigMutations(workspaceId)
  const { error, setError, clearError } = useErrorHandler()
  const baseCurrency = config?.baseCurrency ?? null
  const [baseChoice, setBaseChoice] = useState<string | null>(null)
  const [enabled, setEnabled] = useState<string[]>(config?.enabledCurrencies ?? [])
  const [balanced, setBalanced] = useState<string[]>(config?.balancedCurrencies ?? [])
  const catalog = allCurrencyCodes()

  // Reset the editable lists when the saved config changes (adjusting state while rendering)
  const [syncedEnabled, setSyncedEnabled] = useState(config?.enabledCurrencies)
  if (config?.enabledCurrencies !== syncedEnabled) {
    setSyncedEnabled(config?.enabledCurrencies)
    setEnabled(config?.enabledCurrencies ?? [])
  }
  const [syncedBalanced, setSyncedBalanced] = useState(config?.balancedCurrencies)
  if (config?.balancedCurrencies !== syncedBalanced) {
    setSyncedBalanced(config?.balancedCurrencies)
    setBalanced(config?.balancedCurrencies ?? [])
  }

  const balancedChanged =
    balanced.length !== (config?.balancedCurrencies ?? []).length ||
    balanced.some((code) => !(config?.balancedCurrencies ?? []).includes(code))

  const enabledChanged =
    enabled.length !== (config?.enabledCurrencies ?? []).length ||
    enabled.some((code) => !(config?.enabledCurrencies ?? []).includes(code))

  return (
    <Box sx={{ mt: 3 }} data-testid="currencies-section">
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {t('currency.sectionTitle')}
      </Typography>
      <ErrorMessage error={error} onDismiss={clearError} />

      {baseCurrency ? (
        <Typography sx={{ mb: 2 }} data-testid="base-currency-value">
          {t('currency.baseCurrency')}: <strong>{baseCurrency}</strong>
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" sx={{ mb: 1 }}>
            {t('currency.baseNotSet')}
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete
              size="small"
              sx={{ width: 220 }}
              options={catalog}
              value={baseChoice}
              onChange={(_e, value) => setBaseChoice(value)}
              renderInput={(params) => (
                <TextField {...params} label={t('currency.baseCurrency')} helperText={t('currency.baseCurrencyHelp')} />
              )}
            />
            <Button
              variant="contained"
              disabled={!baseChoice || setBaseCurrency.isPending}
              onClick={() => {
                clearError()
                setBaseCurrency.mutate(baseChoice!, { onError: (err) => setError(err as never) })
              }}
              data-testid="save-base-currency-btn"
            >
              {t('common.save')}
            </Button>
          </Box>
        </Box>
      )}

      {baseCurrency && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', maxWidth: 640 }}>
          <Box sx={{ flexGrow: 1 }}>
            <CurrencyMultiSelect
              label={t('currency.enabledCurrencies')}
              value={enabled}
              onChange={setEnabled}
              options={catalog}
              fixed={[baseCurrency]}
              helperText={t('currency.enabledCurrenciesHelp')}
              testId="enabled-currencies-input"
            />
          </Box>
          <Button
            variant="contained"
            disabled={!enabledChanged || setEnabledCurrencies.isPending}
            onClick={() => {
              clearError()
              setEnabledCurrencies.mutate(enabled, { onError: (err) => setError(err as never) })
            }}
            data-testid="save-enabled-currencies-btn"
          >
            {t('common.save')}
          </Button>
        </Box>
      )}

      {baseCurrency && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', maxWidth: 640, mt: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <CurrencyMultiSelect
              label={t('currency.balancedCurrencies')}
              value={balanced}
              onChange={setBalanced}
              options={enabled.filter((code) => code !== baseCurrency)}
              helperText={t('currency.balancedCurrenciesHelp', { base: baseCurrency })}
              testId="balanced-currencies-input"
            />
          </Box>
          <Button
            variant="contained"
            disabled={!balancedChanged || setBalancedCurrencies.isPending}
            onClick={() => {
              clearError()
              setBalancedCurrencies.mutate(balanced, { onError: (err) => setError(err as never) })
            }}
            data-testid="save-balanced-currencies-btn"
          >
            {t('common.save')}
          </Button>
        </Box>
      )}
    </Box>
  )
}
