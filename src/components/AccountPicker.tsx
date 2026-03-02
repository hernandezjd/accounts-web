import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useAccounts } from '@/hooks/api/useAccounts'

export interface AccountPickerOption {
  id: string
  code: string
  name: string
}

interface AccountPickerProps {
  tenantId: string | null | undefined
  value: AccountPickerOption | null
  onChange: (account: AccountPickerOption | null) => void
  label?: string
  required?: boolean
  size?: 'small' | 'medium'
  excludeAccountId?: string
}

const filterOptions = createFilterOptions<AccountPickerOption>({
  stringify: (option) => `${option.code} ${option.name}`,
  matchFrom: 'any',
})

export function AccountPicker({
  tenantId,
  value,
  onChange,
  label,
  required,
  size = 'small',
  excludeAccountId,
}: AccountPickerProps) {
  const { data: accounts } = useAccounts(tenantId)

  const options: AccountPickerOption[] = (accounts ?? [])
    .filter((a) => a.id !== excludeAccountId)
    .map((a) => ({ id: a.id!, code: a.code!, name: a.name! }))

  return (
    <Autocomplete<AccountPickerOption, false, false, false>
      options={options}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={(opt) => `${opt.code} — ${opt.name}`}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      filterOptions={filterOptions}
      renderOption={(props, opt) => {
        const { key, ...rest } = props as { key: React.Key } & React.HTMLAttributes<HTMLLIElement>
        return (
          <li key={key} {...rest}>
            {opt.code} — {opt.name}
          </li>
        )
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} size={size} required={required} />
      )}
      size={size}
      fullWidth
    />
  )
}
