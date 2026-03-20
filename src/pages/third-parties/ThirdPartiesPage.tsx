import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import { useTranslation } from 'react-i18next'
import { useAllThirdParties, type ThirdParty } from '@/hooks/api/useAllThirdParties'
import { useThirdPartyMutations } from '@/hooks/api/useThirdPartyMutations'
import { translateApiError } from '@/utils/errorUtils'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatError } from '@/lib/error/useErrorHandler'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PhoneEntry {
  id: string
  number: string
  type: 'mobile' | 'office' | 'home'
}

// ─── ThirdPartyFormDialog ──────────────────────────────────────────────────────

interface ThirdPartyFormDialogProps {
  open: boolean
  onClose: () => void
  editThirdParty?: ThirdParty
}

function ThirdPartyFormDialog({ open, onClose, editThirdParty }: ThirdPartyFormDialogProps) {
  const { t } = useTranslation()
  const { createThirdParty, updateThirdParty } = useThirdPartyMutations()

  const isEdit = Boolean(editThirdParty)

  const [externalId, setExternalId] = useState(editThirdParty?.externalId ?? '')
  const [name, setName] = useState(editThirdParty?.name ?? '')
  const [street, setStreet] = useState(editThirdParty?.address?.street ?? '')
  const [city, setCity] = useState(editThirdParty?.address?.city ?? '')
  const [state, setState] = useState(editThirdParty?.address?.state ?? '')
  const [postalCode, setPostalCode] = useState(editThirdParty?.address?.postalCode ?? '')
  const [country, setCountry] = useState(editThirdParty?.address?.country ?? '')
  const [phones, setPhones] = useState<PhoneEntry[]>(() =>
    (editThirdParty?.phoneNumbers ?? []).map((p) => ({
      id: crypto.randomUUID(),
      number: p.number,
      type: p.type,
    })),
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const resetToEdit = () => {
    setExternalId(editThirdParty?.externalId ?? '')
    setName(editThirdParty?.name ?? '')
    setStreet(editThirdParty?.address?.street ?? '')
    setCity(editThirdParty?.address?.city ?? '')
    setState(editThirdParty?.address?.state ?? '')
    setPostalCode(editThirdParty?.address?.postalCode ?? '')
    setCountry(editThirdParty?.address?.country ?? '')
    setPhones(
      (editThirdParty?.phoneNumbers ?? []).map((p) => ({
        id: crypto.randomUUID(),
        number: p.number,
        type: p.type,
      })),
    )
    setErrorMsg(null)
  }

  const handleClose = () => {
    resetToEdit()
    onClose()
  }

  const addPhone = () =>
    setPhones((prev) => [...prev, { id: crypto.randomUUID(), number: '', type: 'mobile' }])

  const removePhone = (id: string) =>
    setPhones((prev) => prev.filter((p) => p.id !== id))

  const updatePhone = (id: string, patch: Partial<PhoneEntry>) =>
    setPhones((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const handleSubmit = () => {
    setErrorMsg(null)
    const body = {
      externalId,
      name,
      address: {
        street: street || '',
        city: city || '',
        state: state || '',
        postalCode: postalCode || '',
        country: country || '',
      },
      phoneNumbers: phones.filter((p) => p.number.trim()).map((p) => ({ number: p.number, type: p.type })),
    }
    if (isEdit) {
      updateThirdParty.mutate(
        { id: editThirdParty!.id!, body },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    } else {
      createThirdParty.mutate(body, {
        onSuccess: handleClose,
        onError: (err) => setErrorMsg(translateApiError(err, t)),
      })
    }
  }

  const isPending = createThirdParty.isPending || updateThirdParty.isPending
  const isValid = externalId.trim() && name.trim()

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? t('thirdParties.editThirdParty') : t('thirdParties.newThirdParty')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('thirdParties.externalId')}
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'tp-external-id-input' }}
        />
        <TextField
          label={t('thirdParties.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'tp-name-input' }}
        />
        <TextField
          label={t('thirdParties.street')}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          size="small"
        />
        <TextField
          label={t('thirdParties.city')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          size="small"
        />
        <TextField
          label={t('thirdParties.state')}
          value={state}
          onChange={(e) => setState(e.target.value)}
          size="small"
        />
        <TextField
          label={t('thirdParties.postalCode')}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          size="small"
        />
        <TextField
          label={t('thirdParties.country')}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          size="small"
        />

        <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
          {t('thirdParties.phoneNumbers')}
        </Typography>
        {phones.map((phone) => (
          <Box key={phone.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label={t('thirdParties.phoneNumber')}
              value={phone.number}
              onChange={(e) => updatePhone(phone.id, { number: e.target.value })}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>{t('thirdParties.phoneType')}</InputLabel>
              <Select
                value={phone.type}
                label={t('thirdParties.phoneType')}
                onChange={(e) => updatePhone(phone.id, { type: e.target.value as PhoneEntry['type'] })}
              >
                <MenuItem value="mobile">{t('thirdParties.mobile')}</MenuItem>
                <MenuItem value="office">{t('thirdParties.office')}</MenuItem>
                <MenuItem value="home">{t('thirdParties.home')}</MenuItem>
              </Select>
            </FormControl>
            <IconButton size="small" onClick={() => removePhone(phone.id)}>
              <RemoveCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addPhone} sx={{ alignSelf: 'flex-start' }}>
          {t('thirdParties.addPhone')}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || isPending}
          data-testid="tp-form-save"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── ConfirmActionDialog ───────────────────────────────────────────────────────

interface ConfirmActionDialogProps {
  open: boolean
  onClose: () => void
  title: string
  confirmText: string
  confirmLabel: string
  confirmColor?: 'error' | 'warning' | 'success'
  onConfirm: (onSuccess: () => void, onError: (err: Error) => void) => void
  isPending: boolean
  testId?: string
}

function ConfirmActionDialog({
  open, onClose, title, confirmText, confirmLabel, confirmColor = 'warning',
  onConfirm, isPending, testId,
}: ConfirmActionDialogProps) {
  const { t } = useTranslation()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleConfirm = () => {
    setErrorMsg(null)
    onConfirm(handleClose, (err) => setErrorMsg(translateApiError(err, t)))
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {errorMsg ? (
          <Alert severity="error">{errorMsg}</Alert>
        ) : (
          <DialogContentText>{confirmText}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        {!errorMsg && (
          <Button
            color={confirmColor}
            onClick={handleConfirm}
            disabled={isPending}
            data-testid={testId}
          >
            {confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── ThirdPartiesPage ──────────────────────────────────────────────────────────

export function ThirdPartiesPage() {
  const { t } = useTranslation()
  const { data: thirdParties, isLoading, isError, error: apiError, refetch } = useAllThirdParties()
  const { deactivateThirdParty, activateThirdParty } = useThirdPartyMutations()

  // Format error for display with classification
  const formattedError = apiError ? formatError(apiError, (apiError as any)?.status) : null

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ThirdParty | undefined>(undefined)
  const [actionTarget, setActionTarget] = useState<ThirdParty | null>(null)

  const isDeactivating = actionTarget?.active !== false

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('thirdParties.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditTarget(undefined); setFormOpen(true) }}
          data-testid="new-tp-btn"
        >
          {t('thirdParties.newThirdParty')}
        </Button>
      </Box>

      {isLoading && <Typography>{t('thirdParties.loading')}</Typography>}
      {isError && <ErrorMessage error={formattedError} onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" data-testid="tp-table">
          <TableHead>
            <TableRow>
              <TableCell>{t('thirdParties.externalId')}</TableCell>
              <TableCell>{t('thirdParties.name')}</TableCell>
              <TableCell>{t('thirdParties.city')}</TableCell>
              <TableCell>{t('thirdParties.country')}</TableCell>
              <TableCell>{t('thirdParties.status')}</TableCell>
              <TableCell>{t('thirdParties.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(thirdParties ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>{t('thirdParties.noThirdParties')}</TableCell>
              </TableRow>
            )}
            {(thirdParties ?? []).map((tp) => {
              const isActive = tp.active !== false
              return (
                <TableRow
                  key={tp.id}
                  data-testid={`tp-row-${tp.id}`}
                  sx={{ opacity: isActive ? 1 : 0.5 }}
                >
                  <TableCell>{tp.externalId}</TableCell>
                  <TableCell>{tp.name}</TableCell>
                  <TableCell>{tp.address?.city ?? '—'}</TableCell>
                  <TableCell>{tp.address?.country ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={isActive ? t('thirdParties.active') : t('thirdParties.inactive')}
                      color={isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => { setEditTarget(tp); setFormOpen(true) }}
                      aria-label={t('common.edit')}
                      data-testid={`edit-tp-${tp.id}`}
                      disabled={!isActive}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {isActive ? (
                      <IconButton
                        size="small"
                        onClick={() => setActionTarget(tp)}
                        aria-label={t('thirdParties.deactivate')}
                        data-testid={`deactivate-tp-${tp.id}`}
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => setActionTarget(tp)}
                        aria-label={t('thirdParties.reactivate')}
                        data-testid={`activate-tp-${tp.id}`}
                        color="success"
                      >
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </Box>
      )}

      <ThirdPartyFormDialog
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editThirdParty={editTarget}
      />
      <ConfirmActionDialog
        open={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title={isDeactivating ? t('thirdParties.deactivateTitle') : t('thirdParties.activateTitle')}
        confirmText={isDeactivating ? t('thirdParties.deactivateConfirm') : t('thirdParties.activateConfirm')}
        confirmLabel={isDeactivating ? t('thirdParties.deactivate') : t('thirdParties.reactivate')}
        confirmColor={isDeactivating ? 'warning' : 'success'}
        isPending={deactivateThirdParty.isPending || activateThirdParty.isPending}
        testId={isDeactivating ? 'confirm-deactivate-tp' : 'confirm-activate-tp'}
        onConfirm={(onSuccess, onError) => {
          if (!actionTarget?.id) return
          const mutation = isDeactivating ? deactivateThirdParty : activateThirdParty
          mutation.mutate(actionTarget.id, { onSuccess, onError })
        }}
      />
    </Box>
  )
}
