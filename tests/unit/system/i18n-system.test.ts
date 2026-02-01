/**
 * I18nSystem 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  I18nSystem,
  i18nSystem,
  t,
  setLanguage,
  getLanguage,
} from '../../../src/system/i18n-system';
import { interpolate, pluralize, processText } from '../../../src/system/i18n-system/interpolator';

describe('I18nSystem', () => {
  let i18n: I18nSystem;

  beforeEach(() => {
    i18n = new I18nSystem();
    i18n.registerVocabularyBatch({
      'common.save': {
        'zh-CN': '保存',
        'en-US': 'Save',
      },
      'common.cancel': {
        'zh-CN': '取消',
        'en-US': 'Cancel',
      },
      'greeting': {
        'zh-CN': '你好，{name}！',
        'en-US': 'Hello, {name}!',
      },
      'items.count': {
        'zh-CN': '共 {count} 项',
        'en-US': '{count} items',
      },
    });
  });

  describe('language management', () => {
    it('should get default language', () => {
      expect(i18n.getLanguage()).toBe('zh-CN');
    });

    it('should set language', () => {
      i18n.setLanguage('en-US');
      expect(i18n.getLanguage()).toBe('en-US');
    });

    it('should throw for unsupported language', () => {
      expect(() => i18n.setLanguage('invalid' as never)).toThrow();
    });

    it('should get supported languages', () => {
      const languages = i18n.getSupportedLanguages();
      expect(languages).toContain('zh-CN');
      expect(languages).toContain('en-US');
    });
  });

  describe('translation', () => {
    it('should translate simple text', () => {
      expect(i18n.t('common.save')).toBe('保存');

      i18n.setLanguage('en-US');
      expect(i18n.t('common.save')).toBe('Save');
    });

    it('should translate with variables', () => {
      expect(i18n.t('greeting', { name: '世界' })).toBe('你好，世界！');

      i18n.setLanguage('en-US');
      expect(i18n.t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should return code in brackets for missing translation', () => {
      expect(i18n.t('nonexistent')).toBe('[nonexistent]');
    });

    it('should fallback to other languages', () => {
      i18n.registerVocabulary('only-english', { 'en-US': 'English only' });
      i18n.setLanguage('zh-CN');
      // 应该回退到 en-US
      expect(i18n.t('only-english')).toBe('English only');
    });
  });

  describe('batch operations', () => {
    it('should translate batch', () => {
      const result = i18n.translateBatch(['common.save', 'common.cancel']);
      expect(result['common.save']).toBe('保存');
      expect(result['common.cancel']).toBe('取消');
    });
  });

  describe('vocabulary management', () => {
    it('should check if vocabulary exists', () => {
      expect(i18n.hasVocabulary('common.save')).toBe(true);
      expect(i18n.hasVocabulary('nonexistent')).toBe(false);
    });

    it('should get all codes', () => {
      const codes = i18n.getAllCodes();
      expect(codes).toContain('common.save');
      expect(codes).toContain('common.cancel');
    });

    it('should export vocabulary', () => {
      const exported = i18n.exportVocabulary();
      expect(exported.vocabulary['common.save']).toBeDefined();
    });

    it('should clear vocabulary', () => {
      i18n.clear();
      expect(i18n.getAllCodes().length).toBe(0);
    });

    it('should load vocabulary data', () => {
      const newI18n = new I18nSystem();
      newI18n.loadVocabulary({
        version: '1.0.0',
        vocabulary: {
          'test.key': { 'zh-CN': '测试', 'en-US': 'Test' },
        },
      });
      expect(newI18n.t('test.key')).toBe('测试');
    });
  });
});

describe('Interpolator', () => {
  describe('interpolate', () => {
    it('should replace simple variables', () => {
      expect(interpolate('Hello, {name}!', { name: 'World' })).toBe(
        'Hello, World!'
      );
    });

    it('should replace multiple variables', () => {
      expect(interpolate('{a} + {b} = {c}', { a: 1, b: 2, c: 3 })).toBe(
        '1 + 2 = 3'
      );
    });

    it('should keep unknown variables', () => {
      expect(interpolate('Hello, {name}!', {})).toBe('Hello, {name}!');
    });

    it('should escape HTML characters', () => {
      expect(interpolate('{html}', { html: '<script>' })).toBe(
        '&lt;script&gt;'
      );
    });
  });

  describe('processText', () => {
    it('should handle simple interpolation', () => {
      expect(processText('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('should handle numeric interpolation', () => {
      expect(processText('Count: {count}', { count: 5 })).toBe('Count: 5');
    });
  });
});

describe('Global functions', () => {
  beforeEach(() => {
    i18nSystem.clear();
    i18nSystem.registerVocabulary('test', { 'zh-CN': '测试', 'en-US': 'Test' });
    setLanguage('zh-CN');
  });

  it('should use t function', () => {
    expect(t('test')).toBe('测试');
  });

  it('should use setLanguage function', () => {
    setLanguage('en-US');
    expect(getLanguage()).toBe('en-US');
  });
});
