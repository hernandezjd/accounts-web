/** Key of the draft that the "new transaction" form keeps in sessionStorage (see useFormDraft). */
export function transactionDraftKey(workspaceId: string): string {
  return `txn-draft-${workspaceId}-create`
}

/** Remove the stored "new transaction" draft, so the next new form starts empty. */
export function clearTransactionDraft(workspaceId: string): void {
  try {
    sessionStorage.removeItem(`form-draft:${transactionDraftKey(workspaceId)}`)
  } catch {
    // ignore storage errors
  }
}
