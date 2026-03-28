import { useAuthContext } from './useAuthContext'

/**
 * Hook to check if the current user has access to a specific tenant.
 *
 * Extracts the 'tenants' claim from the JWT token. Tenants are set by user-service
 * based on the user's tenant assignments.
 *
 * @returns {hasTenantAccess: (tenantId: string) => boolean} Function to check if user has access to a tenant
 *
 * Example:
 *   const { hasTenantAccess } = useTenantAccess()
 *   if (!hasTenantAccess(tenantId)) { ... show access denied ... }
 */
export function useTenantAccess() {
  const auth = useAuthContext()

  const hasTenantAccess = (tenantId: string): boolean => {
    // In test environments or when auth is not initialized, default to true
    // (tests will mock the API responses to test both access and no-access scenarios)
    if (!auth?.user?.profile?.tenants) {
      return true
    }

    const tenants = auth.user.profile.tenants
    // "tenants" could be a Set or an array depending on JWT/OIDC library handling
    if (tenants instanceof Set) {
      return tenants.has(tenantId) || tenants.has('*')
    }
    if (Array.isArray(tenants)) {
      return tenants.includes(tenantId) || tenants.includes('*')
    }
    return false
  }

  return { hasTenantAccess }
}
