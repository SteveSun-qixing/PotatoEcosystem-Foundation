/**
 * ConfigManager 配置管理器
 * @module @chips/foundation/system/config-manager/config-manager
 */

import type { IConfigManager, ConfigScope, ConfigChangeCallback } from '../../core/interfaces';
import { dataSerializer } from '../data-serializer/data-serializer';

/**
 * 配置变更监听器
 */
interface ConfigWatcher {
  key: string;
  callback: ConfigChangeCallback;
}

/**
 * 配置层级
 */
interface ConfigLayer {
  scope: ConfigScope;
  data: Record<string, unknown>;
}

/**
 * ConfigManager 配置管理器实现
 *
 * 支持层级化配置：default < system < user < runtime
 * 高优先级配置覆盖低优先级配置
 */
export class ConfigManager implements IConfigManager {
  private layers: ConfigLayer[] = [];
  private watchers: ConfigWatcher[] = [];
  private configFilePath?: string;

  constructor() {
    // 初始化默认层
    this.layers = [
      { scope: 'default', data: {} },
      { scope: 'system', data: {} },
      { scope: 'user', data: {} },
      { scope: 'runtime', data: {} },
    ];
  }

  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    // 从高优先级到低优先级查找
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer) {
        const value = this.getNestedValue(layer.data, key);
        if (value !== undefined) {
          return value as T;
        }
      }
    }
    return defaultValue;
  }

  /**
   * 获取所有配置（合并后）
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // 按优先级顺序合并
    for (const layer of this.layers) {
      this.deepMerge(result, layer.data);
    }

    return result;
  }

  /**
   * 设置配置值（默认设置到 runtime 层）
   */
  set(key: string, value: unknown): void {
    this.setInScope(key, value, 'runtime');
  }

  /**
   * 在指定作用域设置配置值
   */
  setInScope(key: string, value: unknown, scope: ConfigScope): void {
    const layer = this.layers.find((l) => l.scope === scope);
    if (!layer) {
      return;
    }

    const oldValue = this.get(key);
    this.setNestedValue(layer.data, key, value);
    const newValue = this.get(key);

    // 触发变更通知
    if (oldValue !== newValue) {
      this.notifyChange(key, newValue, oldValue);
    }
  }

  /**
   * 批量设置配置
   */
  setMultiple(configs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(configs)) {
      this.set(key, value);
    }
  }

  /**
   * 删除配置
   */
  delete(key: string): boolean {
    let deleted = false;

    // 从所有层删除
    for (const layer of this.layers) {
      if (this.deleteNestedValue(layer.data, key)) {
        deleted = true;
      }
    }

    if (deleted) {
      this.notifyChange(key, undefined, this.get(key));
    }

    return deleted;
  }

  /**
   * 检查配置是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 监听配置变化
   */
  watch(key: string, callback: ConfigChangeCallback): () => void {
    const watcher: ConfigWatcher = { key, callback };
    this.watchers.push(watcher);

    // 返回取消监听函数
    return () => {
      const index = this.watchers.indexOf(watcher);
      if (index !== -1) {
        this.watchers.splice(index, 1);
      }
    };
  }

  /**
   * 从文件加载配置
   */
  async load(filePath: string): Promise<void> {
    this.configFilePath = filePath;

    // 在实际环境中会读取文件
    // 这里简化处理，假设文件内容已提供
    // const content = await fs.readFile(filePath, 'utf-8');
    // const data = dataSerializer.autoParse<Record<string, unknown>>(content);
    // this.merge(data, 'user');
  }

  /**
   * 保存配置到文件
   */
  async save(filePath?: string): Promise<void> {
    const targetPath = filePath ?? this.configFilePath;
    if (!targetPath) {
      throw new Error('No config file path specified');
    }

    // 获取 user 层配置
    const userLayer = this.layers.find((l) => l.scope === 'user');
    if (!userLayer) {
      return;
    }

    // 序列化为 YAML
    const content = dataSerializer.stringifyYAML(userLayer.data);

    // 在实际环境中会写入文件
    // await fs.writeFile(targetPath, content, 'utf-8');
    void content;
  }

  /**
   * 合并配置
   */
  merge(source: Record<string, unknown>, scope: ConfigScope = 'runtime'): void {
    const layer = this.layers.find((l) => l.scope === scope);
    if (!layer) {
      return;
    }

    const oldConfig = this.getAll();
    this.deepMerge(layer.data, source);
    const newConfig = this.getAll();

    // 找出变更的键并通知
    this.findChangedKeys(oldConfig, newConfig).forEach((key) => {
      this.notifyChange(key, this.getNestedValue(newConfig, key), this.getNestedValue(oldConfig, key));
    });
  }

  /**
   * 设置默认配置
   */
  setDefaults(defaults: Record<string, unknown>): void {
    this.merge(defaults, 'default');
  }

  /**
   * 重置配置（清除 runtime 层）
   */
  reset(): void {
    const runtimeLayer = this.layers.find((l) => l.scope === 'runtime');
    if (runtimeLayer) {
      runtimeLayer.data = {};
    }
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const parts = key.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) {
        continue;
      }
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined) {
      current[lastPart] = value;
    }
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: Record<string, unknown>, key: string): boolean {
    const parts = key.split('.');
    let current: unknown = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined || current === null || typeof current !== 'object') {
        return false;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (current === null || typeof current !== 'object') {
      return false;
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined && lastPart in (current as Record<string, unknown>)) {
      delete (current as Record<string, unknown>)[lastPart];
      return true;
    }

    return false;
  }

  /**
   * 深度合并
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (!(key in target) || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(
          target[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        target[key] = value;
      }
    }
  }

  /**
   * 找出变更的键
   */
  private findChangedKeys(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    prefix = ''
  ): string[] {
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    const changedKeys: string[] = [];

    for (const key of keys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (oldVal !== newVal) {
        if (
          oldVal !== null &&
          newVal !== null &&
          typeof oldVal === 'object' &&
          typeof newVal === 'object' &&
          !Array.isArray(oldVal) &&
          !Array.isArray(newVal)
        ) {
          changedKeys.push(
            ...this.findChangedKeys(
              oldVal as Record<string, unknown>,
              newVal as Record<string, unknown>,
              fullKey
            )
          );
        } else {
          changedKeys.push(fullKey);
        }
      }
    }

    return changedKeys;
  }

  /**
   * 通知配置变更
   */
  private notifyChange(key: string, newValue: unknown, oldValue: unknown): void {
    for (const watcher of this.watchers) {
      if (key === watcher.key || key.startsWith(`${watcher.key}.`)) {
        try {
          watcher.callback(newValue, oldValue, key);
        } catch {
          // 忽略回调错误
        }
      }
    }
  }
}

/**
 * 全局配置管理器实例
 */
export const configManager = new ConfigManager();
