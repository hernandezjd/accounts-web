import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import SearchIcon from '@mui/icons-material/Search'
import { useTranslation } from 'react-i18next'
import { useUnifiedSearch } from '@/hooks/api/useUnifiedSearch'
import { formatError } from '@/lib/error/useErrorHandler'
import type { components } from '@/api/generated/reporting-api'

type AccountSearchResult = components['schemas']['AccountSearchResult']
type TransactionSearchResult = components['schemas']['TransactionSearchResult']

interface SearchBarProps {
  tenantId: string
  from: string
  to: string
  onAccountSelect: (accountId: string) => void
  onTransactionSelect: (transactionId: string, accountId: string, date: string) => void
}

export interface SearchBarHandle {
  focus: () => void
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
  { tenantId, from, to, onAccountSelect, onTransactionSelect },
  ref,
) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [allHistory, setAllHistory] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [displayedError, setDisplayedError] = useState<ReturnType<typeof formatError> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  const fromDate = allHistory ? undefined : from
  const toDate = allHistory ? undefined : to

  const { data, isLoading, isError, error } = useUnifiedSearch(tenantId, debouncedQuery, fromDate, toDate)

  // Format error when it changes
  useEffect(() => {
    if (error) {
      setDisplayedError(formatError(error))
    } else {
      setDisplayedError(null)
    }
  }, [error])

  const open = debouncedQuery.trim().length >= 1 && Boolean(anchorEl)

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    if (!anchorEl && inputRef.current) {
      setAnchorEl(inputRef.current)
    }
  }

  function handleFocus() {
    if (inputRef.current && inputValue.trim().length >= 1) {
      setAnchorEl(inputRef.current)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setInputValue('')
      setDebouncedQuery('')
      setAnchorEl(null)
    }
  }

  function closePopover() {
    setAnchorEl(null)
  }

  function handleAccountClick(result: AccountSearchResult) {
    closePopover()
    setInputValue('')
    setDebouncedQuery('')
    onAccountSelect(result.accountId)
  }

  function handleTransactionClick(result: TransactionSearchResult) {
    closePopover()
    setInputValue('')
    setDebouncedQuery('')
    // Use the first item's accountId as the account context
    const accountId = result.items[0]?.accountId ?? ''
    onTransactionSelect(result.transactionId, accountId, result.date)
  }

  const accounts = data?.accounts ?? []
  const transactions = data?.transactions ?? []
  const hasResults = accounts.length > 0 || transactions.length > 0
  const showNoResults = !isLoading && !isError && debouncedQuery.trim().length >= 1 && !hasResults && data !== undefined

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <TextField
        inputRef={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={t('accounting.search.placeholder')}
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        aria-label={t('accounting.search.placeholder')}
      />

      <FormControlLabel
        control={
          <Switch
            checked={allHistory}
            onChange={(e) => setAllHistory(e.target.checked)}
            size="small"
          />
        }
        label={t('accounting.search.allHistory')}
        sx={{ whiteSpace: 'nowrap', ml: 0 }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        slotProps={{
          paper: {
            sx: {
              width: anchorEl ? anchorEl.offsetWidth : 400,
              maxHeight: 400,
              overflow: 'auto',
              mt: 0.5,
            },
          },
        }}
      >
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              {t('accounting.search.loading')}
            </Typography>
          </Box>
        )}

        {displayedError && (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => setDebouncedQuery(inputValue)}>
                  {t('errors.retry')}
                </Button>
              }
            >
              {displayedError.userMessage}
            </Alert>
          </Box>
        )}

        {showNoResults && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('accounting.search.noResults')}
            </Typography>
          </Box>
        )}

        {accounts.length > 0 && (
          <>
            <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary' }}>
              {t('accounting.search.accountsSection')}
            </Typography>
            <List dense disablePadding>
              {accounts.map((account) => (
                <ListItemButton key={account.accountId} onClick={() => handleAccountClick(account)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875em' }}>
                          {account.accountCode}
                        </Box>
                        <Box component="span">{account.accountName}</Box>
                        <Chip label={account.level} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {transactions.length > 0 && (
          <>
            <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary' }}>
              {t('accounting.search.transactionsSection')}
            </Typography>
            <List dense disablePadding>
              {transactions.map((tx) => (
                <ListItemButton key={tx.transactionId} onClick={() => handleTransactionClick(tx)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875em' }}>
                          {tx.transactionNumber}
                        </Box>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.85em' }}>
                          {tx.transactionTypeName}
                        </Box>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.85em' }}>
                          {tx.date}
                        </Box>
                      </Box>
                    }
                    secondary={tx.description ?? undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Popover>
    </Box>
  )
})
