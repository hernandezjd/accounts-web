import { useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'
import { useAccounts } from '@/hooks/api/useAccounts'
import { AccountCreationDialog } from './AccountCreationDialog'

export interface AccountOption {
  id: string
  code: string
  name: string
  hasThirdParties: boolean
}

interface SentinelOption {
  _sentinel: true
}

type AutocompleteOption = AccountOption | SentinelOption

const SENTINEL: SentinelOption = { _sentinel: true }

function isSentinel(opt: AutocompleteOption): opt is SentinelOption {
  return '_sentinel' in opt
}

interface AccountSearchFieldProps {
  tenantId: string
  value: AccountOption | null
  onChange: (value: AccountOption | null) => void
}

export function AccountSearchField({ tenantId, value, onChange }: AccountSearchFieldProps) {
  const { t } = useTranslation()
  const { data: accounts } = useAccounts(tenantId)
  const [dialogOpen, setDialogOpen] = useState(false)

  const leafAccounts: AccountOption[] = (accounts ?? [])
    .filter((a) => a.hasChildren === false)
    .map((a) => ({
      id: a.id!,
      code: a.code!,
      name: a.name!,
      hasThirdParties: a.hasThirdParties ?? false,
    }))

  const options: AutocompleteOption[] = [...leafAccounts, SENTINEL]

  return (
    <>
      <Autocomplete<AutocompleteOption, false, false, false>
        options={options}
        value={value}
        onChange={(_, newValue) => {
          if (!newValue) {
            onChange(null)
          } else if (isSentinel(newValue)) {
            setDialogOpen(true)
          } else {
            onChange(newValue)
          }
        }}
        getOptionLabel={(opt) => {
          if (isSentinel(opt)) return t('transactionForm.createAccount')
          return `${opt.code} ${opt.name}`
        }}
        isOptionEqualToValue={(opt, val) => {
          if (isSentinel(opt) || isSentinel(val)) return false
          return opt.id === val.id
        }}
        renderOption={(props, opt) => {
          const { key, ...rest } = props as { key: React.Key } & React.HTMLAttributes<HTMLLIElement>
          if (isSentinel(opt)) {
            return (
              <li key={key} {...rest} style={{ fontStyle: 'italic', color: 'text.secondary' }}>
                + {t('transactionForm.createAccount')}
              </li>
            )
          }
          return (
            <li key={key} {...rest}>
              {opt.code} — {opt.name}
            </li>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('transactionForm.account')}
            size="small"
            required
          />
        )}
        size="small"
        fullWidth
      />
      <AccountCreationDialog
        tenantId={tenantId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(created) => {
          onChange({
            id: created.id,
            code: created.code,
            name: created.name,
            hasThirdParties: created.hasThirdParties,
          })
          setDialogOpen(false)
        }}
      />
    </>
  )
}
