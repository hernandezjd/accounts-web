/**
 * Remembers which Accounting tree nodes the user has expanded, per workspace,
 * so the state survives leaving the page (and reloads) within the browser
 * session. Stored in sessionStorage: it is view state, not a preference.
 */

export interface AccountingTreeState {
  /** Account ids whose children are visible. */
  expanded: string[]
  /** Level filter the expansion was computed for (null = all levels). */
  level: number | null
  /** Every account id that has children, used to detect newly appearing parents. */
  seen: string[]
}

const keyFor = (workspaceId: string) => `accounting.treeState.${workspaceId}`

export function loadTreeState(workspaceId: string | undefined): AccountingTreeState | null {
  if (!workspaceId) return null
  try {
    const raw = window.sessionStorage.getItem(keyFor(workspaceId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as AccountingTreeState
    if (!Array.isArray(parsed.expanded) || !Array.isArray(parsed.seen)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveTreeState(workspaceId: string | undefined, state: AccountingTreeState): void {
  if (!workspaceId) return
  try {
    window.sessionStorage.setItem(keyFor(workspaceId), JSON.stringify(state))
  } catch {
    // Storage unavailable or full: the state simply is not remembered.
  }
}
