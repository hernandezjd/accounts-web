import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useTenants } from '@/hooks/api/useTenants'
import { useTenantMutations } from '@/hooks/api/useTenantMutations'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { useTenantConfigMutations } from '@/hooks/api/useTenantConfigMutations'
import { useCodeStructureConfig } from '@/hooks/api/useCodeStructureConfig'
import { useCodeStructureConfigMutations } from '@/hooks/api/useCodeStructureConfigMutations'
import { TransactionTypesContent } from '@/pages/transaction-types/TransactionTypesPage'
import { ThemeEditorTab } from './ThemeEditorTab'
import { translateApiError } from '@/utils/errorUtils'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatError } from '@/lib/error/useErrorHandler'
import { TenantFormDialog } from '@/pages/TenantFormDialog'
import type { TenantFormData } from '@/pages/TenantFormDialog'
import { AccountPicker } from '@/components/AccountPicker'
import { AccountMultiPicker } from '@/components/AccountMultiPicker'
import { useAccounts } from '@/hooks/api/useAccounts'
import type { AccountPickerOption } from '@/components/AccountPicker'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantRow extends TenantFormData {
  status: 'active' | 'inactive'
}

// ─── TabPanel helper ──────────────────────────────────────────────────────────

interface TabPanelProps {
  children: React.ReactNode
  value: number
  index: number
  testId?: string
}

function TabPanel({ children, value, index, testId }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} data-testid={testId}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

// ─── DeleteTenantDialog ───────────────────────────────────────────────────────

interface DeleteTenantDialogProps {
  open: boolean
  onClose: () => void
  tenant: TenantRow | null
}

function DeleteTenantDialog({ open, onClose, tenant }: DeleteTenantDialogProps) {
  const { t } = useTranslation()
  const { deleteTenant } = useTenantMutations()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!tenant) return
    setErrorMsg(null)
    deleteTenant.mutate(tenant.id, {
      onSuccess: handleClose,
      onError: (err) => setErrorMsg(translateApiError(err, t)),
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} data-testid="delete-tenant-dialog">
      <DialogTitle>{t('setup.tenants.deleteTitle')}</DialogTitle>
      <DialogContent>
        {errorMsg ? (
          <Alert severity="error">{errorMsg}</Alert>
        ) : (
          <DialogContentText>{t('setup.tenants.deleteConfirm')}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        {!errorMsg && (
          <Button
            color="error"
            onClick={handleConfirm}
            disabled={deleteTenant.isPending}
            data-testid="confirm-delete-tenant"
          >
            {t('common.delete')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── TenantsTab ───────────────────────────────────────────────────────────────

function TenantsTab() {
  const { t } = useTranslation()
  const { data: tenants, isLoading, isError, error: apiError, refetch } = useTenants()
  const { deactivateTenant, reactivateTenant } = useTenantMutations()

  // Format error for display with classification
  const formattedError = apiError ? formatError(apiError, (apiError as any)?.status) : null

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TenantRow | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditTarget(undefined); setFormOpen(true) }}
          data-testid="new-tenant-btn"
        >
          {t('setup.tenants.newTenant')}
        </Button>
      </Box>

      {isLoading && <Typography>{t('setup.tenants.loading')}</Typography>}
      {isError && <ErrorMessage error={formattedError} onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" data-testid="tenants-table">
          <TableHead>
            <TableRow>
              <TableCell>{t('setup.tenants.name')}</TableCell>
              <TableCell>{t('setup.tenants.contactName')}</TableCell>
              <TableCell>{t('setup.tenants.contactEmail')}</TableCell>
              <TableCell>{t('setup.tenants.status')}</TableCell>
              <TableCell>{t('setup.tenants.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(tenants ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>{t('setup.tenants.noTenants')}</TableCell>
              </TableRow>
            )}
            {(tenants as TenantRow[] ?? []).map((tenant) => (
              <TableRow key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.contactName}</TableCell>
                <TableCell>{tenant.contactEmail}</TableCell>
                <TableCell>
                  <Chip
                    label={tenant.status === 'active' ? t('setup.tenants.active') : t('setup.tenants.inactive')}
                    color={tenant.status === 'active' ? 'success' : 'default'}
                    size="small"
                    data-testid={`tenant-status-${tenant.id}`}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => { setEditTarget(tenant); setFormOpen(true) }}
                    aria-label={t('common.edit')}
                    data-testid={`edit-tenant-${tenant.id}`}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {tenant.status === 'active' ? (
                    <IconButton
                      size="small"
                      onClick={() => deactivateTenant.mutate(tenant.id, {})}
                      aria-label={t('setup.tenants.deactivate')}
                      data-testid={`deactivate-tenant-${tenant.id}`}
                    >
                      <PauseIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => reactivateTenant.mutate(tenant.id, {})}
                      aria-label={t('setup.tenants.reactivate')}
                      data-testid={`reactivate-tenant-${tenant.id}`}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(tenant)}
                    aria-label={t('common.delete')}
                    data-testid={`delete-tenant-${tenant.id}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
      )}

      <TenantFormDialog
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editTenant={editTarget}
      />
      <DeleteTenantDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        tenant={deleteTarget}
      />
    </Box>
  )
}

// ─── ConfigFieldDialog ────────────────────────────────────────────────────────

type ConfigFieldType = 'date' | 'number' | 'nullable-number'

interface ConfigFieldDialogProps {
  open: boolean
  onClose: () => void
  title: string
  currentValue: string
  fieldType: ConfigFieldType
  onSave: (value: string) => void
  isPending: boolean
  errorMsg: string | null
}

function ConfigFieldDialog({
  open,
  onClose,
  title,
  currentValue,
  fieldType,
  onSave,
  isPending,
  errorMsg,
}: ConfigFieldDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(currentValue)

  const handleOpen = () => setValue(currentValue)
  const handleSave = () => onSave(value)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      data-testid="edit-config-dialog"
      TransitionProps={{ onEntering: handleOpen }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {errorMsg && <Alert severity="error" sx={{ mb: 1 }}>{errorMsg}</Alert>}
        <TextField
          fullWidth
          size="small"
          type={fieldType === 'date' ? 'date' : 'number'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          InputLabelProps={fieldType === 'date' ? { shrink: true } : undefined}
          inputProps={{
            'data-testid': 'config-field-input',
            ...(fieldType === 'number' ? { min: 1 } : {}),
          }}
          helperText={fieldType === 'nullable-number' ? 'Leave blank to disable' : undefined}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isPending || (fieldType === 'date' && !value)}
          data-testid="config-save-btn"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── CodeStructureDialog ──────────────────────────────────────────────────────

interface CodeStructureConfig {
  enabled?: boolean
  rootCodeLength?: number
  segmentLengthByLevel?: Record<string, number>
}

interface CodeStructureDialogProps {
  open: boolean
  onClose: () => void
  current: CodeStructureConfig | undefined
  tenantId: string
}

function CodeStructureDialog({ open, onClose, current, tenantId }: CodeStructureDialogProps) {
  const { t } = useTranslation()
  const { configureCodeStructure } = useCodeStructureConfigMutations(tenantId)

  const [enabled, setEnabled] = useState(current?.enabled ?? false)
  const [rootLen, setRootLen] = useState(String(current?.rootCodeLength ?? ''))
  const [segments, setSegments] = useState<{ level: string; length: string }[]>(
    Object.entries(current?.segmentLengthByLevel ?? {}).map(([level, length]) => ({
      level,
      length: String(length),
    })),
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleOpen = () => {
    setEnabled(current?.enabled ?? false)
    setRootLen(String(current?.rootCodeLength ?? ''))
    setSegments(
      Object.entries(current?.segmentLengthByLevel ?? {}).map(([level, length]) => ({
        level,
        length: String(length),
      })),
    )
    setErrorMsg(null)
  }

  const handleSave = () => {
    setErrorMsg(null)
    const segmentLengthByLevel: Record<string, number> = {}
    for (const seg of segments) {
      if (seg.level && seg.length) {
        segmentLengthByLevel[seg.level] = parseInt(seg.length, 10)
      }
    }

    configureCodeStructure.mutate(
      {
        enabled,
        rootCodeLength: enabled ? (rootLen ? parseInt(rootLen, 10) : undefined) : undefined,
        segmentLengthByLevel: enabled ? segmentLengthByLevel : undefined,
      },
      {
        onSuccess: onClose,
        onError: (err) => setErrorMsg(translateApiError(err, t)),
      },
    )
  }

  const addSegment = () => setSegments((prev) => [...prev, { level: '', length: '' }])
  const removeSegment = (idx: number) =>
    setSegments((prev) => prev.filter((_, i) => i !== idx))
  const updateSegment = (idx: number, field: 'level' | 'length', val: string) =>
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="code-structure-dialog"
      TransitionProps={{ onEntering: handleOpen }}
    >
      <DialogTitle>{t('setup.config.editCodeStructure')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <FormControlLabel
          control={
            <Checkbox
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              data-testid="code-structure-enabled-checkbox"
            />
          }
          label={t('setup.config.codeStructureEnabled')}
        />
        {enabled && (
          <>
            <TextField
              label={t('setup.config.rootCodeLength')}
              type="number"
              size="small"
              value={rootLen}
              onChange={(e) => setRootLen(e.target.value)}
              inputProps={{ min: 1, 'data-testid': 'root-code-length-input' }}
            />
            <Typography variant="subtitle2">{t('setup.config.segmentLengths')}</Typography>
            {segments.map((seg, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label={t('setup.config.level')}
                  type="number"
                  size="small"
                  value={seg.level}
                  onChange={(e) => updateSegment(idx, 'level', e.target.value)}
                  sx={{ width: 80 }}
                  inputProps={{ min: 2, 'data-testid': `segment-level-${idx}` }}
                />
                <TextField
                  label={t('setup.config.length')}
                  type="number"
                  size="small"
                  value={seg.length}
                  onChange={(e) => updateSegment(idx, 'length', e.target.value)}
                  sx={{ width: 80 }}
                  inputProps={{ min: 1, 'data-testid': `segment-length-${idx}` }}
                />
                <IconButton size="small" onClick={() => removeSegment(idx)} data-testid={`remove-segment-${idx}`}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addSegment} data-testid="add-segment-btn">
              {t('setup.config.addLevel')}
            </Button>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={configureCodeStructure.isPending}
          data-testid="code-structure-save-btn"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── NominalAccountsDialog ────────────────────────────────────────────────────

interface NominalAccountsDialogProps {
  open: boolean
  onClose: () => void
  current: {
    nominalAccounts: string[] | null | undefined
    profitLossAccountId: string | null | undefined
  }
  tenantId: string
}

function NominalAccountsDialog({
  open,
  onClose,
  current,
  tenantId,
}: NominalAccountsDialogProps) {
  const { t } = useTranslation()
  const { data: allAccounts } = useAccounts(tenantId)
  const { setNominalAccountsConfig } = useTenantConfigMutations(tenantId)

  const [nominalAccounts, setNominalAccounts] = useState<AccountPickerOption[]>([])
  const [profitLossAccount, setProfitLossAccount] = useState<AccountPickerOption | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleOpen = () => {
    setErrorMsg(null)
    // Load current values
    if (allAccounts && current.nominalAccounts) {
      const selected = current.nominalAccounts
        .map((id) => {
          const acc = allAccounts.find((a) => a.id === id)
          return acc ? { id: acc.id!, code: acc.code!, name: acc.name! } : null
        })
        .filter(Boolean) as AccountPickerOption[]
      setNominalAccounts(selected)
    } else {
      setNominalAccounts([])
    }

    if (allAccounts && current.profitLossAccountId) {
      const acc = allAccounts.find((a) => a.id === current.profitLossAccountId)
      if (acc) {
        setProfitLossAccount({ id: acc.id!, code: acc.code!, name: acc.name! })
      } else {
        setProfitLossAccount(null)
      }
    } else {
      setProfitLossAccount(null)
    }
  }

  const handleSave = () => {
    setErrorMsg(null)

    if (nominalAccounts.length === 0) {
      setErrorMsg(t('setup.config.atLeastOneNominalAccount'))
      return
    }

    if (!profitLossAccount) {
      setErrorMsg(t('setup.config.profitLossAccountRequired'))
      return
    }

    setNominalAccountsConfig.mutate(
      {
        nominalAccounts: nominalAccounts.map((a) => a.id),
        profitLossAccountId: profitLossAccount.id,
      },
      {
        onSuccess: onClose,
        onError: (err) => setErrorMsg(translateApiError(err, t)),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="nominal-accounts-dialog"
      TransitionProps={{ onEntering: handleOpen }}
    >
      <DialogTitle>{t('setup.config.editNominalAccountsConfig')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <Box sx={{ pt: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('setup.config.nominalAccounts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('setup.config.nominalAccountsHint')}
          </Typography>
          <AccountMultiPicker
            tenantId={tenantId}
            value={nominalAccounts}
            onChange={setNominalAccounts}
            required
            size="small"
            filterLevel={1}
          />
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('setup.config.profitLossAccount')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('setup.config.profitLossAccountHint')}
          </Typography>
          <AccountPicker
            tenantId={tenantId}
            value={profitLossAccount}
            onChange={setProfitLossAccount}
            required
            size="small"
            leafOnly
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={setNominalAccountsConfig.isPending || nominalAccounts.length === 0 || !profitLossAccount}
          data-testid="nominal-accounts-save-btn"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── AccountingConfigTab ──────────────────────────────────────────────────────

function AccountingConfigTab({ tenantId, initialEditMode }: { tenantId: string; initialEditMode?: string | null }) {
  const { t } = useTranslation()
  const { data: config, isLoading: configLoading, isError: configError } = useTenantConfig(tenantId)
  const { data: codeStructure, isLoading: csLoading, isError: csError } = useCodeStructureConfig(tenantId)
  const { data: allAccounts } = useAccounts(tenantId)
  const mutations = useTenantConfigMutations(tenantId)

  type EditMode = 'initialDate' | 'lockedPeriod' | 'minLevel' | 'snapshotFreq' | 'codeStructure' | 'nominalAccounts' | null
  const [editMode, setEditMode] = useState<EditMode>(initialEditMode === 'initialDate' ? 'initialDate' : null)
  const [editError, setEditError] = useState<string | null>(null)

  const isLoading = configLoading || csLoading
  const isError = configError || csError

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography>{t('setup.config.loading')}</Typography>
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error">{t('setup.config.error')}</Alert>
  }

  const handleFieldSave = (
    mutationFn: (val: string) => void,
    value: string,
  ) => {
    setEditError(null)
    mutationFn(value)
  }

  const rows: {
    label: string
    testId: string
    valueTestId: string
    value: string | null | undefined
    editBtn: string
    editMode: EditMode
    fieldType: ConfigFieldType
    mutationFn: (val: string) => void
    isPending: boolean
  }[] = [
    {
      label: t('setup.config.systemInitialDate'),
      testId: 'config-initial-date',
      valueTestId: 'config-initial-date-value',
      value: config?.systemInitialDate,
      editBtn: 'edit-initial-date-btn',
      editMode: 'initialDate',
      fieldType: 'date',
      mutationFn: (v) =>
        mutations.setInitialDate.mutate(v, {
          onSuccess: () => setEditMode(null),
          onError: (err) => setEditError(translateApiError(err, t)),
        }),
      isPending: mutations.setInitialDate.isPending,
    },
    {
      label: t('setup.config.lockedPeriodDate'),
      testId: 'config-locked-period',
      valueTestId: 'config-locked-period-value',
      value: config?.lockedPeriodDate,
      editBtn: 'edit-locked-period-btn',
      editMode: 'lockedPeriod',
      fieldType: 'date',
      mutationFn: (v) =>
        mutations.setLockedPeriodDate.mutate(v, {
          onSuccess: () => setEditMode(null),
          onError: (err) => setEditError(translateApiError(err, t)),
        }),
      isPending: mutations.setLockedPeriodDate.isPending,
    },
    {
      label: t('setup.config.minimumAccountLevel'),
      testId: 'config-min-level',
      valueTestId: 'config-min-level-value',
      value: config?.minimumAccountLevel != null ? String(config.minimumAccountLevel) : null,
      editBtn: 'edit-min-level-btn',
      editMode: 'minLevel',
      fieldType: 'nullable-number',
      mutationFn: (v) => {
        const numVal = v ? parseInt(v, 10) : null
        mutations.setMinimumAccountLevel.mutate(numVal, {
          onSuccess: () => setEditMode(null),
          onError: (err) => setEditError(translateApiError(err, t)),
        })
      },
      isPending: mutations.setMinimumAccountLevel.isPending,
    },
    {
      label: t('setup.config.snapshotFrequencyDays'),
      testId: 'config-snapshot-freq',
      valueTestId: 'config-snapshot-freq-value',
      value: config?.snapshotFrequencyDays != null ? String(config.snapshotFrequencyDays) : null,
      editBtn: 'edit-snapshot-freq-btn',
      editMode: 'snapshotFreq',
      fieldType: 'nullable-number',
      mutationFn: (v) => {
        const numVal = v ? parseInt(v, 10) : null
        mutations.setSnapshotFrequency.mutate(numVal, {
          onSuccess: () => setEditMode(null),
          onError: (err) => setEditError(translateApiError(err, t)),
        })
      },
      isPending: mutations.setSnapshotFrequency.isPending,
    },
  ]

  const activeRow = rows.find((r) => r.editMode === editMode)

  return (
    <Box data-testid="accounting-config-panel">
      {/* Main config fields */}
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.testId} data-testid={row.testId}>
              <TableCell sx={{ fontWeight: 500, width: 260 }}>{row.label}</TableCell>
              <TableCell data-testid={row.valueTestId}>
                {row.value ?? <Typography component="span" color="text.secondary" variant="body2">{t('setup.config.notSet')}</Typography>}
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => { setEditError(null); setEditMode(row.editMode) }}
                  data-testid={row.editBtn}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Config field edit dialog */}
      {activeRow && (
        <ConfigFieldDialog
          open={Boolean(editMode) && editMode !== 'codeStructure'}
          onClose={() => setEditMode(null)}
          title={activeRow.label}
          currentValue={activeRow.value ?? ''}
          fieldType={activeRow.fieldType}
          onSave={(val) => handleFieldSave(activeRow.mutationFn, val)}
          isPending={activeRow.isPending}
          errorMsg={editError}
        />
      )}

      <Divider sx={{ my: 3 }} />

      {/* Code structure config */}
      <Box data-testid="code-structure-panel">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6">{t('setup.config.codeStructureTitle')}</Typography>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setEditMode('codeStructure')}
            data-testid="edit-code-structure-btn"
          >
            {t('setup.config.editCodeStructure')}
          </Button>
        </Box>

        {codeStructure?.enabled ? (
          <Box data-testid="code-structure-enabled">
            <Typography variant="body2" gutterBottom>
              {t('setup.config.codeStructureEnabled')}
            </Typography>
            <Typography variant="body2">
              {t('setup.config.rootCodeLength')}: {codeStructure.rootCodeLength}
            </Typography>
            {codeStructure.segmentLengthByLevel && Object.keys(codeStructure.segmentLengthByLevel).length > 0 && (
              <Table size="small" sx={{ mt: 1, maxWidth: 300 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('setup.config.level')}</TableCell>
                    <TableCell>{t('setup.config.length')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(codeStructure.segmentLengthByLevel).map(([level, length]) => (
                    <TableRow key={level}>
                      <TableCell>{level}</TableCell>
                      <TableCell>{length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" data-testid="code-structure-disabled">
            {t('setup.config.codeStructureDisabled')}
          </Typography>
        )}
      </Box>

      {/* Code structure dialog */}
      <CodeStructureDialog
        open={editMode === 'codeStructure'}
        onClose={() => setEditMode(null)}
        current={codeStructure}
        tenantId={tenantId}
      />

      <Divider sx={{ my: 3 }} />

      {/* Nominal accounts & P&L account config */}
      <Box data-testid="nominal-accounts-panel">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6">{t('setup.config.nominalAccountsTitle')}</Typography>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setEditMode('nominalAccounts')}
            data-testid="edit-nominal-accounts-btn"
          >
            {t('setup.config.editNominalAccountsConfig')}
          </Button>
        </Box>

        <Table size="small">
          <TableBody>
            {/* Nominal Accounts Row */}
            <TableRow data-testid="config-nominal-accounts-row">
              <TableCell sx={{ fontWeight: 500, width: 260 }}>
                {t('setup.config.nominalAccounts')}
              </TableCell>
              <TableCell data-testid="config-nominal-accounts-value">
                {config?.nominalAccounts && config.nominalAccounts.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {config.nominalAccounts.map((accountId) => {
                      const account = allAccounts?.find((a) => a.id === accountId)
                      return (
                        <Chip
                          key={accountId}
                          label={account ? `${account.code} — ${account.name}` : accountId}
                          size="small"
                        />
                      )
                    })}
                  </Box>
                ) : (
                  <Typography component="span" color="text.secondary" variant="body2">
                    {t('setup.config.notSet')}
                  </Typography>
                )}
              </TableCell>
            </TableRow>

            {/* P&L Account Row */}
            <TableRow data-testid="config-profit-loss-account-row">
              <TableCell sx={{ fontWeight: 500, width: 260 }}>
                {t('setup.config.profitLossAccount')}
              </TableCell>
              <TableCell data-testid="config-profit-loss-account-value">
                {config?.profitLossAccountId ? (
                  (() => {
                    const account = allAccounts?.find((a) => a.id === config.profitLossAccountId)
                    return account ? (
                      <Chip label={`${account.code} — ${account.name}`} size="small" />
                    ) : (
                      <Typography component="span" color="text.secondary" variant="body2">
                        {config.profitLossAccountId}
                      </Typography>
                    )
                  })()
                ) : (
                  <Typography component="span" color="text.secondary" variant="body2">
                    {t('setup.config.notSet')}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* Nominal accounts dialog */}
      <NominalAccountsDialog
        open={editMode === 'nominalAccounts'}
        onClose={() => setEditMode(null)}
        current={{
          nominalAccounts: config?.nominalAccounts,
          profitLossAccountId: config?.profitLossAccountId,
        }}
        tenantId={tenantId}
      />
    </Box>
  )
}

// ─── SetupPage ────────────────────────────────────────────────────────────────

export function SetupPage() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(0)
  const [initialEditMode, setInitialEditMode] = useState<'initialDate' | null>(null)

  useEffect(() => {
    const state = location.state as { initialTab?: number; initialEditMode?: string } | null
    if (state?.initialTab !== undefined) {
      setActiveTab(state.initialTab)
    }
    if (state?.initialEditMode === 'initialDate') {
      setInitialEditMode('initialDate')
    }
  }, [location.state])

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t('setup.title')}
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} data-testid="setup-tabs">
        <Tab label={t('setup.tabs.tenants')} data-testid="tab-tenants" />
        <Tab label={t('setup.tabs.accountingConfig')} data-testid="tab-accounting-config" />
        <Tab label={t('setup.tabs.transactionTypes')} data-testid="tab-transaction-types" />
        <Tab label={t('setup.tabs.theme')} data-testid="tab-theme" />
      </Tabs>

      <TabPanel value={activeTab} index={0} testId="tabpanel-tenants">
        <TenantsTab />
      </TabPanel>
      <TabPanel value={activeTab} index={1} testId="tabpanel-accounting-config">
        <AccountingConfigTab tenantId={tenantId} initialEditMode={initialEditMode} />
      </TabPanel>
      <TabPanel value={activeTab} index={2} testId="tabpanel-transaction-types">
        <TransactionTypesContent hideTitle={true} />
      </TabPanel>
      <TabPanel value={activeTab} index={3} testId="tabpanel-theme">
        <ThemeEditorTab />
      </TabPanel>
    </Box>
  )
}
