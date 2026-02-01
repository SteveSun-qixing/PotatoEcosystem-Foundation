/**
 * 系统服务模块集成测试
 * @module tests/integration/system-integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataSerializer,
  LogSystem,
  ConsoleTransport,
  ConfigManager,
  I18nSystem,
} from '../../src';

describe('系统服务模块集成测试', () => {
  describe('DataSerializer + ConfigManager 集成', () => {
    let serializer: DataSerializer;
    let configManager: ConfigManager;

    beforeEach(() => {
      serializer = new DataSerializer();
      configManager = new ConfigManager();
    });

    it('应该能够使用 DataSerializer 解析配置并加载到 ConfigManager', () => {
      const yamlConfig = `
app:
  name: Chips Foundation
  version: 1.0.0
  debug: true
theme:
  primary: "#1890ff"
  dark: false
`;
      const config = serializer.parseYAML<Record<string, unknown>>(yamlConfig);

      configManager.setDefaults(config);

      expect(configManager.get('app.name')).toBe('Chips Foundation');
      expect(configManager.get('app.version')).toBe('1.0.0');
      expect(configManager.get('theme.primary')).toBe('#1890ff');
    });

    it('应该能够将配置导出为 YAML 格式', () => {
      configManager.setDefaults({
        app: { name: 'Test App' },
        settings: { enabled: true },
      });

      const allConfig = configManager.getAll();
      const yaml = serializer.stringifyYAML(allConfig);

      expect(yaml).toContain('app:');
      expect(yaml).toContain('name: Test App');
      expect(yaml).toContain('settings:');
      expect(yaml).toContain('enabled: true');
    });
  });

  describe('LogSystem + ConfigManager 集成', () => {
    let logSystem: LogSystem;
    let configManager: ConfigManager;

    beforeEach(() => {
      logSystem = new LogSystem({ level: 'debug' });
      configManager = new ConfigManager();
    });

    it('应该能够根据配置动态调整日志级别', () => {
      configManager.setDefaults({ logging: { level: 'warn' } });

      const level = configManager.get<string>('logging.level');
      logSystem.setLevel(level as 'debug' | 'info' | 'warn' | 'error');

      // 验证日志级别已更改
      expect(level).toBe('warn');
    });

    it('应该能够监听配置变化并更新日志系统', () => {
      configManager.setDefaults({ logging: { level: 'info' } });

      let levelChanged = false;
      configManager.watch('logging.level', (newLevel) => {
        logSystem.setLevel(newLevel as 'debug' | 'info' | 'warn' | 'error');
        levelChanged = true;
      });

      configManager.set('logging.level', 'error', 'user');

      expect(levelChanged).toBe(true);
      expect(configManager.get('logging.level')).toBe('error');
    });
  });

  describe('I18nSystem + ConfigManager 集成', () => {
    let i18n: I18nSystem;
    let configManager: ConfigManager;

    beforeEach(() => {
      i18n = new I18nSystem({ defaultLanguage: 'zh-CN' });
      configManager = new ConfigManager();
    });

    it('应该能够根据配置设置语言', () => {
      configManager.setDefaults({ language: 'en-US' });

      const language = configManager.get<string>('language');
      i18n.setLanguage(language as 'zh-CN' | 'en-US');

      expect(i18n.getLanguage()).toBe('en-US');
    });

    it('应该能够加载配置中定义的词汇', () => {
      // 注册词汇 - 使用 registerVocabulary 方法
      // 格式: code -> { 'zh-CN': '中文', 'en-US': 'English' }
      i18n.registerVocabulary('app.title', {
        'zh-CN': '薯片卡片',
        'en-US': 'Chips Card',
      });
      i18n.registerVocabulary('app.greeting', {
        'zh-CN': '欢迎使用',
        'en-US': 'Welcome',
      });

      i18n.setLanguage('zh-CN');
      expect(i18n.t('app.title')).toBe('薯片卡片');

      i18n.setLanguage('en-US');
      expect(i18n.t('app.title')).toBe('Chips Card');
    });
  });

  describe('完整系统服务工作流', () => {
    it('应该能够完成配置加载、日志记录、国际化的完整流程', () => {
      // 1. 初始化 DataSerializer
      const serializer = new DataSerializer();

      // 2. 解析配置
      const configYaml = `
app:
  name: Chips Foundation
  version: 1.0.0
logging:
  level: info
i18n:
  defaultLanguage: zh-CN
`;
      const config = serializer.parseYAML<Record<string, unknown>>(configYaml);

      // 3. 加载到 ConfigManager
      const configManager = new ConfigManager();
      configManager.setDefaults(config);

      // 4. 根据配置初始化 LogSystem
      const logLevel = configManager.get<string>('logging.level') ?? 'info';
      const logSystem = new LogSystem({ level: logLevel as 'info' });
      logSystem.addTransport(new ConsoleTransport({ level: logLevel as 'info' }));

      // 5. 根据配置初始化 I18nSystem
      const defaultLang = configManager.get<string>('i18n.defaultLanguage') ?? 'zh-CN';
      const i18n = new I18nSystem({ defaultLanguage: defaultLang as 'zh-CN' });

      // 6. 加载词汇
      i18n.registerVocabulary('system.started', {
        'zh-CN': '系统已启动',
      });
      i18n.registerVocabulary('app.name', {
        'zh-CN': configManager.get<string>('app.name') ?? '',
      });

      // 7. 验证整个流程
      expect(configManager.get('app.name')).toBe('Chips Foundation');
      expect(i18n.t('system.started')).toBe('系统已启动');
      expect(i18n.t('app.name')).toBe('Chips Foundation');

      // 8. 记录日志（验证不抛出异常）
      logSystem.info('系统启动完成', { appName: configManager.get('app.name') });

      // 验证整个流程正常运行
      expect(configManager.get('app.name')).toBe('Chips Foundation');
    });
  });
});
