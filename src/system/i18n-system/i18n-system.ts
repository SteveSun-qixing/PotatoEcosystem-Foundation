/**
 * I18nSystem 多语言系统
 * @module @chips/foundation/system/i18n-system/i18n-system
 */

import type { II18nSystem } from '../../core/interfaces';
import type { SupportedLanguage, LanguageTranslations, VocabularyData } from '../../core/types';
import { processText } from './interpolator';

/**
 * 支持的语言列表
 */
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'];

/**
 * 默认语言
 */
const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';

/**
 * 回退语言链
 */
const FALLBACK_CHAINS: Record<SupportedLanguage, SupportedLanguage[]> = {
  'zh-CN': ['zh-TW', 'en-US'],
  'zh-TW': ['zh-CN', 'en-US'],
  'en-US': [],
  'ja-JP': ['en-US'],
  'ko-KR': ['en-US'],
};

/**
 * I18nSystem 选项
 */
export interface I18nSystemOptions {
  /** 默认语言 */
  defaultLanguage?: SupportedLanguage;
  /** 是否启用回退 */
  enableFallback?: boolean;
  /** 缺失翻译处理 */
  onMissingTranslation?: (code: string, lang: SupportedLanguage) => string;
}

/**
 * I18nSystem 多语言系统实现
 */
export class I18nSystem implements II18nSystem {
  private currentLanguage: SupportedLanguage;
  private vocabulary: Map<string, LanguageTranslations> = new Map();
  private enableFallback: boolean;
  private onMissingTranslation: (code: string, lang: SupportedLanguage) => string;

  constructor(options?: I18nSystemOptions) {
    this.currentLanguage = options?.defaultLanguage ?? DEFAULT_LANGUAGE;
    this.enableFallback = options?.enableFallback ?? true;
    this.onMissingTranslation =
      options?.onMissingTranslation ?? ((code) => `[${code}]`);
  }

  /**
   * 翻译文本
   */
  t(code: string, vars?: Record<string, string | number>): string {
    const text = this.getTranslation(code, this.currentLanguage);

    if (!text) {
      return this.onMissingTranslation(code, this.currentLanguage);
    }

    if (vars) {
      return processText(text, vars);
    }

    return text;
  }

  /**
   * 设置当前语言
   */
  setLanguage(lang: SupportedLanguage): void {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }
    this.currentLanguage = lang;
  }

  /**
   * 获取当前语言
   */
  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return [...SUPPORTED_LANGUAGES];
  }

  /**
   * 加载词汇表
   */
  loadVocabulary(data: VocabularyData): void {
    for (const [code, translations] of Object.entries(data.vocabulary)) {
      this.vocabulary.set(code, translations);
    }
  }

  /**
   * 注册单个词汇
   */
  registerVocabulary(code: string, translations: LanguageTranslations): void {
    const existing = this.vocabulary.get(code);
    if (existing) {
      // 合并翻译
      this.vocabulary.set(code, { ...existing, ...translations });
    } else {
      this.vocabulary.set(code, translations);
    }
  }

  /**
   * 批量注册词汇
   */
  registerVocabularyBatch(
    vocabularies: Record<string, LanguageTranslations>
  ): void {
    for (const [code, translations] of Object.entries(vocabularies)) {
      this.registerVocabulary(code, translations);
    }
  }

  /**
   * 批量翻译
   */
  translateBatch(codes: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const code of codes) {
      result[code] = this.t(code);
    }
    return result;
  }

  /**
   * 检查词汇是否存在
   */
  hasVocabulary(code: string): boolean {
    return this.vocabulary.has(code);
  }

  /**
   * 获取所有词汇代码
   */
  getAllCodes(): string[] {
    return Array.from(this.vocabulary.keys());
  }

  /**
   * 导出词汇表
   */
  exportVocabulary(): VocabularyData {
    const vocabulary: Record<string, LanguageTranslations> = {};
    for (const [code, translations] of this.vocabulary) {
      vocabulary[code] = translations;
    }
    return { version: '1.0.0', vocabulary };
  }

  /**
   * 清空词汇表
   */
  clear(): void {
    this.vocabulary.clear();
  }

  /**
   * 获取翻译（带回退）
   */
  private getTranslation(code: string, lang: SupportedLanguage): string | undefined {
    const translations = this.vocabulary.get(code);

    if (!translations) {
      return undefined;
    }

    // 尝试当前语言
    if (translations[lang]) {
      return translations[lang];
    }

    // 尝试回退语言
    if (this.enableFallback) {
      const fallbacks = FALLBACK_CHAINS[lang] ?? [];
      for (const fallbackLang of fallbacks) {
        if (translations[fallbackLang]) {
          return translations[fallbackLang];
        }
      }
    }

    return undefined;
  }
}

/**
 * 全局多语言系统实例
 */
export const i18nSystem = new I18nSystem();

/**
 * 翻译函数（快捷方式）
 */
export function t(code: string, vars?: Record<string, string | number>): string {
  return i18nSystem.t(code, vars);
}

/**
 * 设置语言（快捷方式）
 */
export function setLanguage(lang: SupportedLanguage): void {
  i18nSystem.setLanguage(lang);
}

/**
 * 获取当前语言（快捷方式）
 */
export function getLanguage(): SupportedLanguage {
  return i18nSystem.getLanguage();
}
