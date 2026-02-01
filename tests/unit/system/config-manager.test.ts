/**
 * ConfigManager 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager, configManager } from '../../../src/system/config-manager';

describe('ConfigManager', () => {
  let config: ConfigManager;

  beforeEach(() => {
    config = new ConfigManager();
  });

  describe('get/set', () => {
    it('should set and get simple value', () => {
      config.set('key', 'value');
      expect(config.get('key')).toBe('value');
    });

    it('should set and get nested value', () => {
      config.set('a.b.c', 'nested');
      expect(config.get('a.b.c')).toBe('nested');
    });

    it('should return default value when key not found', () => {
      expect(config.get('nonexistent', 'default')).toBe('default');
    });

    it('should return undefined when key not found and no default', () => {
      expect(config.get('nonexistent')).toBeUndefined();
    });
  });

  describe('setMultiple', () => {
    it('should set multiple values at once', () => {
      config.setMultiple({
        key1: 'value1',
        key2: 'value2',
      });

      expect(config.get('key1')).toBe('value1');
      expect(config.get('key2')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      config.set('existing', 'value');
      expect(config.has('existing')).toBe(true);
    });

    it('should return false for non-existing key', () => {
      expect(config.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      config.set('key', 'value');
      const result = config.delete('key');

      expect(result).toBe(true);
      expect(config.has('key')).toBe(false);
    });

    it('should return false for non-existing key', () => {
      const result = config.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all merged config', () => {
      config.setDefaults({ default: 'value' });
      config.set('runtime', 'value');

      const all = config.getAll();
      expect(all['default']).toBe('value');
      expect(all['runtime']).toBe('value');
    });
  });

  describe('merge', () => {
    it('should merge config into specified scope', () => {
      config.merge({ merged: 'value' }, 'runtime');
      expect(config.get('merged')).toBe('value');
    });

    it('should deep merge nested objects', () => {
      config.set('obj.a', 1);
      config.merge({ obj: { b: 2 } });

      expect(config.get('obj.a')).toBe(1);
      expect(config.get('obj.b')).toBe(2);
    });
  });

  describe('setDefaults', () => {
    it('should set default values', () => {
      config.setDefaults({ default: 'value' });
      expect(config.get('default')).toBe('value');
    });

    it('should be overridden by runtime values', () => {
      config.setDefaults({ key: 'default' });
      config.set('key', 'runtime');
      expect(config.get('key')).toBe('runtime');
    });
  });

  describe('reset', () => {
    it('should clear runtime scope', () => {
      config.set('runtime', 'value');
      config.setDefaults({ default: 'value' });

      config.reset();

      expect(config.get('runtime')).toBeUndefined();
      expect(config.get('default')).toBe('value');
    });
  });

  describe('watch', () => {
    it('should call callback when value changes', () => {
      const callback = vi.fn();
      config.watch('key', callback);

      config.set('key', 'value');

      expect(callback).toHaveBeenCalledWith('value', undefined, 'key');
    });

    it('should call callback for nested key changes', () => {
      const callback = vi.fn();
      config.watch('obj', callback);

      config.set('obj.nested', 'value');

      expect(callback).toHaveBeenCalled();
    });

    it('should return unwatch function', () => {
      const callback = vi.fn();
      const unwatch = config.watch('key', callback);

      unwatch();
      config.set('key', 'value');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('setInScope', () => {
    it('should set value in specific scope', () => {
      config.setInScope('key', 'user-value', 'user');
      config.setInScope('key', 'runtime-value', 'runtime');

      // runtime 优先级更高
      expect(config.get('key')).toBe('runtime-value');
    });
  });
});
