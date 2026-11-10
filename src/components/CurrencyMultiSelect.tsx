import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'

interface CurrencyMultiSelectProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  /** ISO 4217 codes that can be chosen. */
  options: string[]
  /** Codes that cannot be removed (for example the base currency). */
  fixed?: string[]
  disabled?: boolean
  helperText?: string
  testId?: string
  /** Minimum width in px, so the label fits in the outline when no currency is chosen. */
  minWidth?: number
}

/** Chooses several ISO 4217 currencies (REQ-CUR-02, REQ-CUR-03). */
export function CurrencyMultiSelect({
  label,
  value,
  onChange,
  options,
  fixed = [],
  disabled,
  helperText,
  testId,
  minWidth,
}: CurrencyMultiSelectProps) {
  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      value={value}
      disabled={disabled}
      sx={minWidth ? { minWidth } : undefined}
      disableCloseOnSelect
      onChange={(_e, next) => onChange([...new Set([...fixed, ...next])].sort())}
      renderTags={(tags, getTagProps) =>
        tags.map((code, index) => {
          const { key, ...tagProps } = getTagProps({ index })
          return <Chip key={key} label={code} size="small" {...tagProps} disabled={disabled || fixed.includes(code)} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText}
          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
          inputProps={{ ...params.inputProps, 'data-testid': testId }}
        />
      )}
    />
  )
}
