import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getErrorMessage,
  getShortErrorMessage,
  formatValidationErrors,
} from './errorMessages';

// Mock navigator.onLine
const originalNavigator = global.navigator;

describe('errorMessages', () => {
  describe('getErrorMessage', () => {
    beforeEach(() => {
      // Reset navigator mock
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });
    });

    it('should return specific error message for known error code', () => {
      const error = {
        response: {
          data: { code: 'INVALID_CREDENTIALS' },
          status: 401,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Invalid email or password');
      expect(result.description).toBe('Please check your credentials and try again.');
      expect(result.action).toBe('Forgot your password?');
      expect(result.actionUrl).toBe('/forgot-password');
    });

    it('should return resource limit exceeded message', () => {
      const error = {
        response: {
          data: { code: 'RESOURCE_LIMIT_EXCEEDED' },
          status: 403,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Resource limit exceeded');
      expect(result.actionUrl).toBe('/billing');
    });

    it('should handle field-specific validation errors', () => {
      const error = {
        response: {
          data: { field: 'email' },
          status: 400,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Validation error');
      expect(result.description).toBe('Please enter a valid email address');
    });

    it('should handle port validation error', () => {
      const error = {
        response: {
          data: { field: 'port' },
          status: 400,
        },
      };

      const result = getErrorMessage(error);

      expect(result.description).toBe('Port must be between 1 and 65535');
    });

    it('should return HTTP status fallback for unknown errors', () => {
      const error = {
        response: {
          status: 404,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Not found');
      expect(result.description).toBe('The requested resource could not be found.');
    });

    it('should return 429 rate limit message', () => {
      const error = {
        response: {
          status: 429,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Too many requests');
    });

    it('should return 500 server error message', () => {
      const error = {
        response: {
          status: 500,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Server error');
      expect(result.description).toBe('Something went wrong on our end. Please try again.');
    });

    it('should detect network errors when offline', () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const error = {};

      const result = getErrorMessage(error);

      expect(result.title).toBe('Connection lost');
      expect(result.description).toBe('Please check your internet connection and try again.');
    });

    it('should detect network error from error code', () => {
      const error = {
        code: 'NETWORK_ERROR',
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Connection lost');
    });

    it('should detect network error from error message', () => {
      const error = {
        message: 'Network Error',
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Connection lost');
    });

    it('should use context for fallback message', () => {
      const error = {
        response: {
          status: 999, // Unknown status
        },
      };

      const result = getErrorMessage(error, 'deploy your service');

      expect(result.title).toBe("Couldn't deploy your service");
    });

    it('should use error message in fallback description', () => {
      const error = {
        response: {
          data: { message: 'Custom error message' },
          status: 999,
        },
      };

      const result = getErrorMessage(error);

      expect(result.description).toBe('Custom error message');
    });

    it('should handle template errors', () => {
      const error = {
        response: {
          data: { code: 'TEMPLATE_NOT_FOUND' },
          status: 404,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Template not found');
      expect(result.actionUrl).toBe('/templates');
    });

    it('should handle workspace limit error', () => {
      const error = {
        response: {
          data: { code: 'WORKSPACE_LIMIT_REACHED' },
          status: 403,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Workspace limit reached');
      expect(result.action).toBe('Upgrade plan');
    });

    it('should handle domain errors', () => {
      const error = {
        response: {
          data: { code: 'DOMAIN_ALREADY_EXISTS' },
          status: 409,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Domain already in use');
    });

    it('should handle 503 service unavailable', () => {
      const error = {
        response: {
          status: 503,
        },
      };

      const result = getErrorMessage(error);

      expect(result.title).toBe('Service unavailable');
      expect(result.description).toContain('maintenance');
    });
  });

  describe('getShortErrorMessage', () => {
    it('should return only the description', () => {
      const error = {
        response: {
          data: { code: 'INVALID_CREDENTIALS' },
          status: 401,
        },
      };

      const result = getShortErrorMessage(error);

      expect(result).toBe('Please check your credentials and try again.');
    });

    it('should use context for fallback', () => {
      const error = {
        response: {
          data: { message: 'Something specific went wrong' },
          status: 999,
        },
      };

      const result = getShortErrorMessage(error, 'save changes');

      expect(result).toBe('Something specific went wrong');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format array of field errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Too short' },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toBe('email: Invalid email format\npassword: Too short');
    });

    it('should handle single error', () => {
      const errors = [{ field: 'name', message: 'Required' }];

      const result = formatValidationErrors(errors);

      expect(result).toBe('name: Required');
    });

    it('should handle empty array', () => {
      const result = formatValidationErrors([]);

      expect(result).toBe('');
    });
  });
});
