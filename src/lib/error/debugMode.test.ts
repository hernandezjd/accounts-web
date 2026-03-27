import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDebugMode, enableDebugMode, disableDebugMode } from './debugMode';

describe('debugMode', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock window.location.search
    delete (window as any).location;
    (window as any).location = { ...originalLocation, search: '' };
  });

  afterEach(() => {
    localStorage.clear();
    (window as any).location = originalLocation;
  });

  describe('isDebugMode', () => {
    it('should return false when debug mode is not enabled', () => {
      expect(isDebugMode()).toBe(false);
    });

    it('should return true when URL has ?debug=true', () => {
      (window.location as any).search = '?debug=true';
      expect(isDebugMode()).toBe(true);
    });

    it('should return true when URL has ?debug=1', () => {
      (window.location as any).search = '?debug=1';
      expect(isDebugMode()).toBe(true);
    });

    it('should return true when URL has ?debug=yes', () => {
      (window.location as any).search = '?debug=yes';
      expect(isDebugMode()).toBe(true);
    });

    it('should return false when URL has ?debug=false', () => {
      (window.location as any).search = '?debug=false';
      expect(isDebugMode()).toBe(false);
    });

    it('should return false when URL has ?debug=0', () => {
      (window.location as any).search = '?debug=0';
      expect(isDebugMode()).toBe(false);
    });

    it('should return true when URL has ?debug with no value', () => {
      (window.location as any).search = '?debug';
      expect(isDebugMode()).toBe(true);
    });

    it('should return true when localStorage has debug key', () => {
      localStorage.setItem('debug', 'true');
      expect(isDebugMode()).toBe(true);
    });

    it('should return true when localStorage has debug key with any value', () => {
      localStorage.setItem('debug', '');
      expect(isDebugMode()).toBe(true);
    });

    it('should return false when localStorage does not have debug key', () => {
      expect(isDebugMode()).toBe(false);
    });

    it('should prioritize URL params over localStorage', () => {
      localStorage.setItem('debug', 'true');
      (window.location as any).search = '?debug=false';
      expect(isDebugMode()).toBe(false);
    });

    it('should handle debug=true with other URL params', () => {
      (window.location as any).search = '?foo=bar&debug=true&baz=qux';
      expect(isDebugMode()).toBe(true);
    });

    it('should be case-insensitive for debug parameter', () => {
      (window.location as any).search = '?debug=TRUE';
      expect(isDebugMode()).toBe(true);
    });
  });

  describe('enableDebugMode', () => {
    it('should set debug in localStorage', () => {
      enableDebugMode();
      expect(localStorage.getItem('debug')).toBe('true');
    });

    it('should make isDebugMode return true', () => {
      enableDebugMode();
      expect(isDebugMode()).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      enableDebugMode();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });

  describe('disableDebugMode', () => {
    it('should remove debug from localStorage', () => {
      localStorage.setItem('debug', 'true');
      disableDebugMode();
      expect(localStorage.getItem('debug')).toBeNull();
    });

    it('should make isDebugMode return false when localStorage was the only source', () => {
      enableDebugMode();
      disableDebugMode();
      expect(isDebugMode()).toBe(false);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      disableDebugMode();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });
});
