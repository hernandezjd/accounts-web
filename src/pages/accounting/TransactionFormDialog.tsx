import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useTranslation } from 'react-i18next'
import { TransactionForm, type FormMode, type TransactionFormInitialData } from './TransactionForm'
import { clearTransactionDraft } from './transactionDraft'

interface TransactionFormDialogProps {
  workspaceId: string
  mode: FormMode
  transactionId?: string
  initialData?: TransactionFormInitialData
  /** The transaction was saved or deleted. */
  onSuccess: () => void
  /** The dialog was closed without saving. */
  onClose: () => void
}

/**
 * The transaction form in a dialog over the list, so the list keeps its scroll position.
 * Mount it only while a transaction is being created or edited.
 *
 * It cannot be closed by accident: a click outside does nothing, and Escape or Cancel ask
 * for confirmation once the user has changed something.
 */
export function TransactionFormDialog({
  workspaceId,
  mode,
  transactionId,
  initialData,
  onSuccess,
  onClose,
}: TransactionFormDialogProps) {
  const { t } = useTranslation()
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const requestClose = () => {
    if (dirty) {
      setConfirmOpen(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    if (mode === 'create') clearTransactionDraft(workspaceId)
    setConfirmOpen(false)
    onClose()
  }

  return (
    <>
      <Dialog
        open
        fullWidth
        maxWidth="xl"
        onClose={(_, reason) => {
          if (reason === 'backdropClick') return
          requestClose()
        }}
        data-testid="transaction-form-dialog"
      >
        <DialogContent>
          <TransactionForm
            workspaceId={workspaceId}
            mode={mode}
            transactionId={transactionId}
            initialData={initialData}
            onSuccess={onSuccess}
            onCancel={requestClose}
            onDirtyChange={setDirty}
            frameless
          />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} data-testid="discard-changes-dialog">
        <DialogTitle>{t('transactionForm.discardChangesTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('transactionForm.discardChangesMessage')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} data-testid="keep-editing-btn">
            {t('transactionForm.keepEditing')}
          </Button>
          <Button color="error" onClick={handleDiscard} data-testid="discard-changes-btn">
            {t('transactionForm.draftDiscard')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
