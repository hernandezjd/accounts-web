import { useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { TransactionTypeCreationDialog } from './TransactionTypeCreationDialog'

export interface TransactionTypeOption {
  id: string
  name: string
}

interface SentinelOption {
  _sentinel: true
}

type AutocompleteOption = TransactionTypeOption | SentinelOption

const SENTINEL: SentinelOption = { _sentinel: true }

function isSentinel(opt: AutocompleteOption): opt is SentinelOption {
  return '_sentinel' in opt
}

interface TransactionTypeSearchFieldProps {
  value: TransactionTypeOption | null
  onChange: (value: TransactionTypeOption | null) => void
}

export function TransactionTypeSearchField({ value, onChange }: TransactionTypeSearchFieldProps) {
  const { t } = useTranslation()
  const { data: transactionTypes } = useTransactionTypes()
  const [dialogOpen, setDialogOpen] = useState(false)

  const typeOptions: TransactionTypeOption[] = (transactionTypes ?? []).map((tt) => ({
    id: tt.id!,
    name: tt.name!,
  }))

  const options: AutocompleteOption[] = [...typeOptions, SENTINEL]

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
          if (isSentinel(opt)) return t('transactionForm.createTransactionType')
          return opt.name
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
                + {t('transactionForm.createTransactionType')}
              </li>
            )
          }
          return (
            <li key={key} {...rest}>
              {opt.name}
            </li>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('transactionForm.transactionType')}
            size="small"
            required
          />
        )}
        size="small"
        sx={{ minWidth: 200 }}
      />
      <TransactionTypeCreationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(created) => {
          onChange({
            id: created.id,
            name: created.name,
          })
          setDialogOpen(false)
        }}
      />
    </>
  )
}
