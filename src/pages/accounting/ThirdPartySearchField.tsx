import { useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import { useTranslation } from 'react-i18next'
import { useThirdParties } from '@/hooks/api/useThirdParties'
import { ThirdPartyCreationDialog } from './ThirdPartyCreationDialog'

export interface ThirdPartyOption {
  id: string
  name: string
}

interface SentinelOption {
  _sentinel: true
}

type AutocompleteOption = ThirdPartyOption | SentinelOption

const SENTINEL: SentinelOption = { _sentinel: true }

function isSentinel(opt: AutocompleteOption): opt is SentinelOption {
  return '_sentinel' in opt
}

interface ThirdPartySearchFieldProps {
  workspaceId: string
  value: ThirdPartyOption | null
  onChange: (value: ThirdPartyOption | null) => void
}

export function ThirdPartySearchField({ workspaceId, value, onChange }: ThirdPartySearchFieldProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: results, isFetching } = useThirdParties(workspaceId, inputValue)

  const thirdPartyOptions: ThirdPartyOption[] = (results ?? []).map((tp) => ({
    id: tp.id!,
    name: tp.name!,
  }))

  const options: AutocompleteOption[] = [...thirdPartyOptions, SENTINEL]

  return (
    <>
      <Autocomplete<AutocompleteOption, false, false, false>
        options={options}
        value={value}
        inputValue={inputValue}
        onInputChange={(_, v) => setInputValue(v)}
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
          if (isSentinel(opt)) return t('transactionForm.createThirdParty')
          return opt.name
        }}
        isOptionEqualToValue={(opt, val) => {
          if (isSentinel(opt) || isSentinel(val)) return false
          return opt.id === val.id
        }}
        filterOptions={(x) => x}
        loading={isFetching}
        renderOption={(props, opt) => {
          const { key, ...rest } = props as { key: React.Key } & React.HTMLAttributes<HTMLLIElement>
          if (isSentinel(opt)) {
            return (
              <li key={key} {...rest} style={{ fontStyle: 'italic' }}>
                + {t('transactionForm.createThirdParty')}
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
            label={t('transactionForm.thirdParty')}
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isFetching && <CircularProgress size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        size="small"
        fullWidth
      />
      <ThirdPartyCreationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(created) => {
          onChange({ id: created.id, name: created.name })
          setDialogOpen(false)
        }}
      />
    </>
  )
}
