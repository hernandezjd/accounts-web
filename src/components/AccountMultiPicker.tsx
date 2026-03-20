import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import { useAccounts } from '@/hooks/api/useAccounts'

export interface AccountPickerOption {
  id: string
  code: string
  name: string
}

interface AccountMultiPickerProps {
  tenantId: string | null | undefined
  value: AccountPickerOption[]
  onChange: (accounts: AccountPickerOption[]) => void
  label?: string
  required?: boolean
  size?: 'small' | 'medium'
  filterLevel?: number // Optional filter for account level (e.g., 1 for root accounts)
}

const filterOptions = createFilterOptions<AccountPickerOption>({
  stringify: (option) => `${option.code} ${option.name}`,
  matchFrom: 'any',
})

export function AccountMultiPicker({
  tenantId,
  value,
  onChange,
  label,
  required,
  size = 'small',
  filterLevel,
}: AccountMultiPickerProps) {
  const { data: accounts } = useAccounts(tenantId)

  const options: AccountPickerOption[] = (accounts ?? [])
    .filter((a) => filterLevel === undefined || a.level === filterLevel)
    .map((a) => ({
      id: a.id!,
      code: a.code!,
      name: a.name!,
    }))

  return (
    <Autocomplete<AccountPickerOption, true, false, false>
      multiple
      options={options}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={(opt) => `${opt.code} — ${opt.name}`}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      filterOptions={filterOptions}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={`${option.code} — ${option.name}`}
            size="small"
          />
        ))
      }
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
