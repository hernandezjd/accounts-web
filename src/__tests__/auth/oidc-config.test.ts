import { describe, it, expect } from 'vitest'
import { oidcConfig, userManager } from '@/auth/oidc-config'

/**
 * Unit tests for accounts-web OIDC configuration.
 *
 * These tests verify that the OIDC configuration correctly uses the API gateway
 * for OAuth/OpenID endpoints, preventing regressions from NFR-059 where web apps
 * were accidentally connecting directly to the user-service instead of through
 * the gateway's CORS-enabled proxy.
 */
describe('OIDC Configuration (accounts-web)', () => {
  describe('client configuration', () => {
    it('shouldHave_correctClientId_forAccountsWeb', () => {
      expect(oidcConfig.client_id).toBe('accounts-ui')
    })
  })

  describe('authority configuration', () => {
    it('shouldNotUse_directUserServicePort_8085', () => {
      expect(oidcConfig.authority).not.toContain(':8085')
    })

    it('shouldUse_apiGatewayInDevelopment_orWindowOriginInProduction', () => {
      // In development (localhost), should use gateway port 8080
      // In production, should use window.location.origin
      const authority = oidcConfig.authority as string
      const isLocalhost = authority.includes('localhost')

      if (isLocalhost) {
        expect(authority).toContain(':8080')
      } else {
        expect(authority).toMatch(/^https?:\/\//)
      }
    })
  })

  describe('redirect URIs', () => {
    it('shouldHave_redirectUri_containingCallbackPath', () => {
      expect(oidcConfig.redirect_uri).toContain('/callback')
    })

    it('shouldHave_postLogoutRedirectUri_matching_windowOrigin', () => {
      expect(oidcConfig.post_logout_redirect_uri).toBe(window.location.origin)
    })

    it('shouldMatch_redirectUri_in_oidcConfig_and_userManager', () => {
      expect(userManager.settings.redirect_uri).toBe(oidcConfig.redirect_uri)
    })
  })

  describe('OIDC protocol settings', () => {
    it('shouldUse_codeFlow_asResponseType', () => {
      expect(oidcConfig.response_type).toBe('code')
    })

    it('shouldRequest_openidProfile_scopes', () => {
      expect(oidcConfig.scope).toBe('openid profile')
    })
  })

  describe('UserManager construction', () => {
    it('shouldConstruct_userManager_withCorrectAuthority', () => {
      expect(userManager.settings.authority).toBe(oidcConfig.authority)
    })

    it('shouldConstruct_userManager_withAllRequiredSettings', () => {
      expect(userManager.settings.authority).toBe(oidcConfig.authority)
      expect(userManager.settings.client_id).toBe(oidcConfig.client_id)
      expect(userManager.settings.redirect_uri).toBe(oidcConfig.redirect_uri)
      expect(userManager.settings.response_type).toBe(oidcConfig.response_type)
      expect(userManager.settings.scope).toBe(oidcConfig.scope)
    })
  })

  describe('configuration integrity', () => {
    it('shouldUse_consistent_authority_across_oidcConfig_and_userManager', () => {
      expect(userManager.settings.authority).toBe(oidcConfig.authority)
    })

    it('shouldNot_useDirectUserServicePort_8085_anywhere', () => {
      expect(oidcConfig.authority).not.toContain(':8085')
      expect(userManager.settings.authority).not.toContain(':8085')
    })
  })
})
