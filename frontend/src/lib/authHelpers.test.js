import { hasPassword, isStrongPassword } from './authHelpers';

describe('authHelpers', () => {
  describe('hasPassword', () => {
    test('returns true when user.app_metadata.providers includes email', () => {
      const user = {
        app_metadata: {
          providers: ['google', 'email'],
        },
      };
      expect(hasPassword(user)).toBe(true);
    });

    test('returns false when user.app_metadata.providers does not include email', () => {
      const user = {
        app_metadata: {
          providers: ['google'],
        },
      };
      expect(hasPassword(user)).toBe(false);
    });

    test('falls back to identities array when app_metadata.providers is not an array', () => {
      const userWithEmailIdentity = {
        app_metadata: {},
        identities: [{ provider: 'google' }, { provider: 'email' }],
      };
      expect(hasPassword(userWithEmailIdentity)).toBe(true);

      const userWithoutEmailIdentity = {
        app_metadata: {},
        identities: [{ provider: 'google' }],
      };
      expect(hasPassword(userWithoutEmailIdentity)).toBe(false);
    });

    test('returns false for null or undefined user', () => {
      expect(hasPassword(null)).toBe(false);
      expect(hasPassword(undefined)).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    test('returns true for strong passwords meeting all criteria', () => {
      expect(isStrongPassword('SecureP@ssw0rd!')).toBe(true);
      expect(isStrongPassword('Abcd123#xyz')).toBe(true);
    });

    test('returns false for passwords shorter than 8 chars', () => {
      expect(isStrongPassword('Ab1!xyz')).toBe(false);
    });

    test('returns false for passwords without uppercase', () => {
      expect(isStrongPassword('securep@ssw0rd!')).toBe(false);
    });

    test('returns false for passwords without lowercase', () => {
      expect(isStrongPassword('SECUREP@SSW0RD!')).toBe(false);
    });

    test('returns false for passwords without number', () => {
      expect(isStrongPassword('SecurePassword!#')).toBe(false);
    });

    test('returns false for passwords without special char', () => {
      expect(isStrongPassword('SecurePassword123')).toBe(false);
    });

    test('returns false for non-string input', () => {
      expect(isStrongPassword(null)).toBe(false);
      expect(isStrongPassword(undefined)).toBe(false);
      expect(isStrongPassword(12345678)).toBe(false);
    });
  });
});

