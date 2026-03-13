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
import Alert from '@mui/material/Alert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useTranslation } from 'react-i18next'
import { useTransactionTypes, type TransactionType } from '@/hooks/api/useTransactionTypes'
import { useTransactionTypeMutations } from '@/hooks/api/useTransactionTypeMutations'
import { translateApiError } from '@/utils/errorUtils'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatError } from '@/lib/error/useErrorHandler'

// ─── TransactionTypeFormDialog ─────────────────────────────────────────────────

interface TransactionTypeFormDialogProps {
  open: boolean
  onClose: () => void
  editType?: TransactionType
}

function TransactionTypeFormDialog({ open, onClose, editType }: TransactionTypeFormDialogProps) {
  const { t } = useTranslation()
  const { createTransactionType, updateTransactionType } = useTransactionTypeMutations()

  const isEdit = Boolean(editType)

  const [name, setName] = useState(editType?.name ?? '')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setName(editType?.name ?? '')
    setErrorMsg(null)
    onClose()
  }

  const handleSubmit = () => {
    setErrorMsg(null)
    if (isEdit) {
      updateTransactionType.mutate(
        { id: editType!.id!, body: { name } },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    } else {
      createTransactionType.mutate(
        { name },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    }
  }

  const isPending = createTransactionType.isPending || updateTransactionType.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEdit ? t('transactionTypes.editTransactionType') : t('transactionTypes.newTransactionType')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('transactionTypes.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'tt-name-input' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim() || isPending}
          data-testid="tt-form-save"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── DeleteTransactionTypeDialog ───────────────────────────────────────────────

interface DeleteTransactionTypeDialogProps {
  open: boolean
  onClose: () => void
  transactionType: TransactionType | null
}

function DeleteTransactionTypeDialog({
  open,
  onClose,
  transactionType,
}: DeleteTransactionTypeDialogProps) {
  const { t } = useTranslation()
  const { deleteTransactionType } = useTransactionTypeMutations()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!transactionType?.id) return
    setErrorMsg(null)
    deleteTransactionType.mutate(transactionType.id, {
      onSuccess: handleClose,
      onError: (err) => setErrorMsg(translateApiError(err, t)),
    })
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('transactionTypes.deleteTitle')}</DialogTitle>
      <DialogContent>
        {errorMsg ? (
          <Alert severity="error" data-testid="delete-tt-error">{errorMsg}</Alert>
        ) : (
          <DialogContentText>{t('transactionTypes.deleteConfirm')}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        {!errorMsg && (
          <Button
            color="error"
            onClick={handleConfirm}
            disabled={deleteTransactionType.isPending}
            data-testid="confirm-delete-tt"
          >
            {t('common.delete')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── TransactionTypesContent ──────────────────────────────────────────────────

interface TransactionTypesContentProps {
  hideTitle?: boolean
}

export function TransactionTypesContent({ hideTitle = false }: TransactionTypesContentProps) {
  const { t } = useTranslation()
  const { data: types, isLoading, isError, error: apiError, refetch } = useTransactionTypes()

  // Format error for display with classification
  const formattedError = apiError ? formatError(apiError, (apiError as any)?.status) : null

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TransactionType | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<TransactionType | null>(null)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {!hideTitle && (
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            {t('transactionTypes.title')}
          </Typography>
        )}
        {hideTitle && <Box sx={{ flexGrow: 1 }} />}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditTarget(undefined); setFormOpen(true) }}
          data-testid="new-tt-btn"
        >
          {t('transactionTypes.newTransactionType')}
        </Button>
      </Box>

      {isLoading && <Typography>{t('transactionTypes.loading')}</Typography>}
      {isError && <ErrorMessage error={formattedError} onRetry={refetch} />}

      {!isLoading && !isError && (
        <Table size="small" data-testid="tt-table">
          <TableHead>
            <TableRow>
              <TableCell>{t('transactionTypes.name')}</TableCell>
              <TableCell>{t('transactionTypes.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(types ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>{t('transactionTypes.noTransactionTypes')}</TableCell>
              </TableRow>
            )}
            {(types ?? []).map((type) => (
              <TableRow key={type.id} data-testid={`tt-row-${type.id}`}>
                <TableCell>{type.name}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => { setEditTarget(type); setFormOpen(true) }}
                    aria-label={t('common.edit')}
                    data-testid={`edit-tt-${type.id}`}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(type)}
                    aria-label={t('common.delete')}
                    data-testid={`delete-tt-${type.id}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TransactionTypeFormDialog
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editType={editTarget}
      />
      <DeleteTransactionTypeDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        transactionType={deleteTarget}
      />
    </Box>
  )
}

// ─── TransactionTypesPage ──────────────────────────────────────────────────────

export function TransactionTypesPage() {
  return <TransactionTypesContent hideTitle={false} />
}
