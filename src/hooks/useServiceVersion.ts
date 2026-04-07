import { useState, useEffect } from 'react'

export interface ServiceVersion {
  serviceName: string
  version: string
  commitHash: string
}

export function useServiceVersion() {
  const [versionInfo, setVersionInfo] = useState<ServiceVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin
        const response = await fetch(`${baseUrl}/version`)

        if (!response.ok) {
          throw new Error(`Failed to fetch version: ${response.statusText}`)
        }

        const data = (await response.json()) as ServiceVersion
        setVersionInfo(data)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        console.warn('Failed to fetch service version:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVersion()
  }, [])

  return { versionInfo, loading, error }
}
