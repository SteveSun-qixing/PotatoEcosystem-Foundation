/**
 * 错误处理测试
 */

import { describe, it, expect } from 'vitest';
import {
  ChipsError,
  ValidationError,
  ResourceNotFoundError,
  ParseError,
  ModuleError,
  NetworkError,
  FileError,
  RenderError,
  ErrorCodes,
  createError,
  isChipsError,
  wrapError,
  formatErrorMessage,
} from '../../../src/core/errors';

describe('ChipsError', () => {
  it('should create error with code and message', () => {
    const error = new ChipsError('TEST-001', 'Test error message');

    expect(error.code).toBe('TEST-001');
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('ChipsError');
    expect(error.timestamp).toBeDefined();
    expect(error.timestamp).toBeTypeOf('number');
  });

  it('should create error with details', () => {
    const details = { field: 'name', value: 'test' };
    const error = new ChipsError('TEST-002', 'Test error', details);

    expect(error.details).toEqual(details);
  });

  it('should create error with cause', () => {
    const cause = new Error('Original error');
    const error = new ChipsError('TEST-003', 'Wrapped error', undefined, cause);

    expect(error.originalCause).toBe(cause);
  });

  it('should convert to JSON', () => {
    const error = new ChipsError('TEST-004', 'JSON test', { data: 'test' });
    const json = error.toJSON();

    expect(json).toHaveProperty('name', 'ChipsError');
    expect(json).toHaveProperty('code', 'TEST-004');
    expect(json).toHaveProperty('message', 'JSON test');
    expect(json).toHaveProperty('details', { data: 'test' });
    expect(json).toHaveProperty('timestamp');
  });

  it('should convert to string', () => {
    const error = new ChipsError('TEST-005', 'String test');
    const str = error.toString();

    expect(str).toBe('[TEST-005] String test');
  });
});

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });

    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should be instance of ChipsError', () => {
    const error = new ValidationError('Test');
    expect(error).toBeInstanceOf(ChipsError);
  });
});

describe('ResourceNotFoundError', () => {
  it('should create resource not found error', () => {
    const error = new ResourceNotFoundError('Card', 'abc123');

    expect(error.name).toBe('ResourceNotFoundError');
    expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(error.message).toBe('Card not found: abc123');
    expect(error.details).toEqual({ resourceType: 'Card', resourceId: 'abc123' });
  });
});

describe('ParseError', () => {
  it('should create parse error', () => {
    const cause = new SyntaxError('Unexpected token');
    const error = new ParseError('YAML', 'Invalid syntax', cause);

    expect(error.name).toBe('ParseError');
    expect(error.code).toBe(ErrorCodes.PARSE_ERROR);
    expect(error.message).toBe('Failed to parse YAML: Invalid syntax');
    expect(error.cause).toBe(cause);
  });
});

describe('ModuleError', () => {
  it('should create module error', () => {
    const error = new ModuleError(
      ErrorCodes.MODULE_LOAD_ERROR,
      'my-module',
      'Failed to load module'
    );

    expect(error.name).toBe('ModuleError');
    expect(error.details).toEqual({ moduleId: 'my-module' });
  });
});

describe('NetworkError', () => {
  it('should create network error', () => {
    const error = new NetworkError('Connection refused', { url: 'http://example.com' });

    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
  });
});

describe('FileError', () => {
  it('should create file error', () => {
    const error = new FileError(
      ErrorCodes.FILE_NOT_FOUND,
      '/path/to/file.txt',
      'File not found'
    );

    expect(error.name).toBe('FileError');
    expect(error.details).toEqual({ filePath: '/path/to/file.txt' });
  });
});

describe('RenderError', () => {
  it('should create render error', () => {
    const error = new RenderError('Failed to render card', { cardId: 'abc123' });

    expect(error.name).toBe('RenderError');
    expect(error.code).toBe(ErrorCodes.RENDER_ERROR);
  });
});

describe('Error utility functions', () => {
  describe('createError', () => {
    it('should create ChipsError', () => {
      const error = createError('CUSTOM-001', 'Custom error', { data: 'test' });

      expect(error).toBeInstanceOf(ChipsError);
      expect(error.code).toBe('CUSTOM-001');
      expect(error.message).toBe('Custom error');
    });
  });

  describe('isChipsError', () => {
    it('should return true for ChipsError', () => {
      const error = new ChipsError('TEST', 'Test');
      expect(isChipsError(error)).toBe(true);
    });

    it('should return true for ChipsError subclasses', () => {
      const error = new ValidationError('Test');
      expect(isChipsError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');
      expect(isChipsError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isChipsError('string')).toBe(false);
      expect(isChipsError(123)).toBe(false);
      expect(isChipsError(null)).toBe(false);
      expect(isChipsError(undefined)).toBe(false);
    });
  });

  describe('wrapError', () => {
    it('should return ChipsError as-is', () => {
      const original = new ChipsError('ORIG', 'Original');
      const wrapped = wrapError(original);
      expect(wrapped).toBe(original);
    });

    it('should wrap regular Error', () => {
      const original = new Error('Regular error');
      const wrapped = wrapError(original);

      expect(wrapped).toBeInstanceOf(ChipsError);
      expect(wrapped.message).toBe('Regular error');
      expect(wrapped.originalCause).toBe(original);
    });

    it('should wrap non-error values', () => {
      const wrapped = wrapError('string error');

      expect(wrapped).toBeInstanceOf(ChipsError);
      expect(wrapped.message).toBe('string error');
    });

    it('should use custom error code', () => {
      const wrapped = wrapError(new Error('Test'), 'CUSTOM-001');
      expect(wrapped.code).toBe('CUSTOM-001');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format basic error', () => {
      const error = new ChipsError('TEST-001', 'Test message');
      const formatted = formatErrorMessage(error);

      expect(formatted).toBe('[TEST-001] Test message');
    });

    it('should include details', () => {
      const error = new ChipsError('TEST-002', 'Test', { field: 'name' });
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('Details:');
      expect(formatted).toContain('field');
      expect(formatted).toContain('name');
    });

    it('should include cause', () => {
      const cause = new Error('Cause message');
      const error = new ChipsError('TEST-003', 'Test', undefined, cause);
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('Caused by: Cause message');
    });
  });
});
