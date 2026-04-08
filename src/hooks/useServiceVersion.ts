export interface AppVersion {
  version: string
  commitHash: string
}

export function useAppVersion() {
  const version = import.meta.env.VITE_APP_VERSION || 'unknown'
  const commitHash = import.meta.env.VITE_COMMIT_HASH || 'unknown'

  return {
    versionInfo: {
      version,
      commitHash,
    } as AppVersion,
    loading: false,
    error: null,
  }
}
