import { useState } from 'react'
import { useParams } from 'react-router-dom'
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
import { QueryErrorAlert } from '@/components/QueryErrorAlert'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantRow {
  id: string
  name: string
  status: 'active' | 'inactive'
  contactName: string
  contactEmail: string
  contactPhone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
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

// ─── TenantFormDialog ─────────────────────────────────────────────────────────

interface TenantFormDialogProps {
  open: boolean
  onClose: () => void
  editTenant?: TenantRow
}

function TenantFormDialog({ open, onClose, editTenant }: TenantFormDialogProps) {
  const { t } = useTranslation()
  const { createTenant, updateTenant } = useTenantMutations()
  const isEdit = Boolean(editTenant)

  const [name, setName] = useState(editTenant?.name ?? '')
  const [contactName, setContactName] = useState(editTenant?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(editTenant?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(editTenant?.contactPhone ?? '')
  const [street, setStreet] = useState(editTenant?.address?.street ?? '')
  const [city, setCity] = useState(editTenant?.address?.city ?? '')
  const [state, setState] = useState(editTenant?.address?.state ?? '')
  const [postalCode, setPostalCode] = useState(editTenant?.address?.postalCode ?? '')
  const [country, setCountry] = useState(editTenant?.address?.country ?? '')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleSubmit = () => {
    setErrorMsg(null)
    const body = {
      name,
      contactName,
      contactEmail,
      contactPhone: contactPhone || undefined,
      address: { street, city, state, postalCode, country },
    }

    if (isEdit) {
      updateTenant.mutate(
        { id: editTenant!.id, body },
        { onSuccess: handleClose, onError: (err) => setErrorMsg(translateApiError(err, t)) },
      )
    } else {
      createTenant.mutate(body, {
        onSuccess: handleClose,
        onError: (err) => setErrorMsg(translateApiError(err, t)),
      })
    }
  }

  const canSave = name.trim() && contactName.trim() && contactEmail.trim()
  const isPending = createTenant.isPending || updateTenant.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="tenant-form-dialog">
      <DialogTitle>
        {isEdit ? t('setup.tenants.editTenant') : t('setup.tenants.createTenant')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('setup.tenants.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'tenant-name-input' }}
        />
        <TextField
          label={t('setup.tenants.contactName')}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'tenant-contact-name-input' }}
        />
        <TextField
          label={t('setup.tenants.contactEmail')}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
          type="email"
          size="small"
          inputProps={{ 'data-testid': 'tenant-contact-email-input' }}
        />
        <TextField
          label={t('setup.tenants.contactPhone')}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'tenant-contact-phone-input' }}
        />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Address (optional)</Typography>
        <TextField
          label={t('setup.tenants.street')}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'tenant-street-input' }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('setup.tenants.city')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
            inputProps={{ 'data-testid': 'tenant-city-input' }}
          />
          <TextField
            label={t('setup.tenants.state')}
            value={state}
            onChange={(e) => setState(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'tenant-state-input' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('setup.tenants.postalCode')}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'tenant-postal-input' }}
          />
          <TextField
            label={t('setup.tenants.country')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
            inputProps={{ 'data-testid': 'tenant-country-input' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSave || isPending}
          data-testid="tenant-form-save"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
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
  const { data: tenants, isLoading, isError, refetch } = useTenants()
  const { deactivateTenant, reactivateTenant } = useTenantMutations()

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
      {isError && <QueryErrorAlert message={t('setup.tenants.error')} onRetry={refetch} />}

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

// ─── AccountingConfigTab ──────────────────────────────────────────────────────

function AccountingConfigTab({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation()
  const { data: config, isLoading: configLoading, isError: configError } = useTenantConfig(tenantId)
  const { data: codeStructure, isLoading: csLoading, isError: csError } = useCodeStructureConfig(tenantId)
  const mutations = useTenantConfigMutations(tenantId)

  type EditMode = 'initialDate' | 'closedPeriod' | 'minLevel' | 'snapshotFreq' | 'codeStructure' | null
  const [editMode, setEditMode] = useState<EditMode>(null)
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
    setEditMode(null)
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
      label: t('setup.config.closedPeriodDate'),
      testId: 'config-closed-period',
      valueTestId: 'config-closed-period-value',
      value: config?.closedPeriodDate,
      editBtn: 'edit-closed-period-btn',
      editMode: 'closedPeriod',
      fieldType: 'date',
      mutationFn: (v) =>
        mutations.setClosedPeriodDate.mutate(v, {
          onSuccess: () => setEditMode(null),
          onError: (err) => setEditError(translateApiError(err, t)),
        }),
      isPending: mutations.setClosedPeriodDate.isPending,
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
    </Box>
  )
}

// ─── SetupPage ────────────────────────────────────────────────────────────────

export function SetupPage() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const [activeTab, setActiveTab] = useState(0)

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
        <AccountingConfigTab tenantId={tenantId} />
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
