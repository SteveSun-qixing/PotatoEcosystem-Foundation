/**
 * FileConverter 文件转换器
 * @module @chips/foundation/file/file-converter/file-converter
 */

import type {
  IFileConverter,
  ConverterPlugin,
  ConversionSource,
  ConversionOptions,
  ConversionResult,
  ConversionTypeInfo,
  ConversionError,
} from './types';
import { FileConverterErrorCode } from './types';

/**
 * 文件转换器
 *
 * 管理转换插件并提供统一的文件转换接口。
 * 支持多种源格式到多种目标格式的转换。
 *
 * @example
 * ```typescript
 * import { fileConverter, FileConverter } from '@chips/foundation';
 * import { CardtoHTMLPlugin } from '@chips/cardto-html-plugin';
 *
 * // 注册插件
 * fileConverter.registerConverter(new CardtoHTMLPlugin());
 *
 * // 执行转换
 * const result = await fileConverter.convert(
 *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
 *   'html',
 *   { outputPath: '/output/dir' }
 * );
 * ```
 */
export class FileConverter implements IFileConverter {
  /**
   * 已注册的转换插件
   * 键格式: `${sourceType}:${targetType}`
   */
  private _converters: Map<string, ConverterPlugin> = new Map();

  /**
   * 活动任务映射
   * 键: taskId, 值: 插件 ID
   */
  private _activeTasks: Map<string, string> = new Map();

  /**
   * 生成转换器键
   * @param sourceType 源文件类型
   * @param targetType 目标文件类型
   * @returns 唯一键
   */
  private _makeKey(sourceType: string, targetType: string): string {
    return `${sourceType.toLowerCase()}:${targetType.toLowerCase()}`;
  }

  /**
   * 注册转换插件
   *
   * @param plugin 转换插件实例
   * @throws 如果插件 ID 冲突或源/目标类型组合已存在
   *
   * @example
   * ```typescript
   * converter.registerConverter(new CardtoHTMLPlugin());
   * converter.registerConverter(new CardtoImagePlugin());
   * ```
   */
  registerConverter(plugin: ConverterPlugin): void {
    if (!plugin.id || !plugin.sourceTypes || !plugin.targetType) {
      throw new Error(
        `[FileConverter] 插件注册失败：插件必须提供 id、sourceTypes 和 targetType`
      );
    }

    // 为每种源类型注册转换映射
    for (const sourceType of plugin.sourceTypes) {
      const key = this._makeKey(sourceType, plugin.targetType);

      if (this._converters.has(key)) {
        console.warn(
          `[FileConverter] 覆盖已存在的转换器: ${sourceType} -> ${plugin.targetType}`
        );
      }

      this._converters.set(key, plugin);
    }

    console.log(
      `[FileConverter] 已注册插件: ${plugin.name} (${plugin.id} v${plugin.version})`
    );
  }

  /**
   * 注销转换插件
   *
   * @param pluginId 插件 ID
   * @returns 是否成功注销（找到并移除了至少一个映射）
   */
  unregisterConverter(pluginId: string): boolean {
    let removed = false;

    for (const [key, plugin] of this._converters.entries()) {
      if (plugin.id === pluginId) {
        this._converters.delete(key);
        removed = true;
      }
    }

    if (removed) {
      console.log(`[FileConverter] 已注销插件: ${pluginId}`);
    }

    return removed;
  }

  /**
   * 获取所有支持的转换类型
   *
   * @returns 转换类型信息列表
   */
  getSupportedConversions(): ConversionTypeInfo[] {
    const conversions: ConversionTypeInfo[] = [];
    const seen = new Set<string>();

    for (const [key, plugin] of this._converters.entries()) {
      if (seen.has(key)) continue;
      seen.add(key);

      const [sourceType, targetType] = key.split(':');
      conversions.push({
        sourceType,
        targetType,
        description: plugin.description,
      });
    }

    return conversions;
  }

  /**
   * 检查是否支持指定的转换
   *
   * @param sourceType 源文件类型
   * @param targetType 目标文件类型
   * @returns 是否支持
   */
  canConvert(sourceType: string, targetType: string): boolean {
    const key = this._makeKey(sourceType, targetType);
    return this._converters.has(key);
  }

  /**
   * 获取指定转换的插件
   *
   * @param sourceType 源文件类型
   * @param targetType 目标文件类型
   * @returns 插件实例或 undefined
   */
  getConverter(sourceType: string, targetType: string): ConverterPlugin | undefined {
    const key = this._makeKey(sourceType, targetType);
    return this._converters.get(key);
  }

  /**
   * 执行转换
   *
   * @param source 转换源
   * @param targetType 目标文件类型
   * @param options 转换选项
   * @returns 转换结果
   *
   * @example
   * ```typescript
   * // 从文件路径转换
   * const result = await converter.convert(
   *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
   *   'html',
   *   { outputPath: '/output/dir' }
   * );
   *
   * // 从内存数据转换
   * const result = await converter.convert(
   *   { type: 'data', data: cardBuffer, fileType: 'card' },
   *   'image',
   *   { extra: { format: 'png', scale: 2 } }
   * );
   * ```
   */
  async convert(
    source: ConversionSource,
    targetType: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    const sourceType = source.fileType;
    const plugin = this.getConverter(sourceType, targetType);

    if (!plugin) {
      const error: ConversionError = {
        code: FileConverterErrorCode.CONVERTER_NOT_FOUND,
        message: `未找到转换器: ${sourceType} -> ${targetType}`,
      };

      return {
        success: false,
        taskId: this._generateTaskId(),
        error,
      };
    }

    // 验证选项
    if (options) {
      const validation = plugin.validateOptions(options);
      if (!validation.valid) {
        const error: ConversionError = {
          code: FileConverterErrorCode.INVALID_OPTIONS,
          message: `选项验证失败: ${validation.errors?.join(', ') || '未知错误'}`,
        };

        return {
          success: false,
          taskId: this._generateTaskId(),
          error,
          warnings: validation.warnings,
        };
      }
    }

    // 合并默认选项
    const mergedOptions: ConversionOptions = {
      ...plugin.getDefaultOptions(),
      ...options,
    };

    // 包装进度回调以追踪任务
    const originalOnProgress = mergedOptions.onProgress;
    let taskId: string | undefined;

    mergedOptions.onProgress = (progress) => {
      if (!taskId) {
        taskId = progress.taskId;
        this._activeTasks.set(taskId, plugin.id);
      }
      originalOnProgress?.(progress);
    };

    try {
      // 执行转换
      const result = await plugin.convert(source, mergedOptions);

      // 记录任务 ID
      if (result.taskId && !taskId) {
        taskId = result.taskId;
        this._activeTasks.set(taskId, plugin.id);
      }

      // 转换完成，清理任务
      if (taskId) {
        this._activeTasks.delete(taskId);
      }

      return result;
    } catch (error) {
      // 清理任务
      if (taskId) {
        this._activeTasks.delete(taskId);
      }

      const conversionError: ConversionError = {
        code: FileConverterErrorCode.CONVERSION_FAILED,
        message: error instanceof Error ? error.message : '转换失败',
        cause: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        taskId: taskId || this._generateTaskId(),
        error: conversionError,
      };
    }
  }

  /**
   * 取消转换任务
   *
   * @param taskId 任务 ID
   * @returns 是否成功取消
   */
  cancelConversion(taskId: string): boolean {
    const pluginId = this._activeTasks.get(taskId);
    if (!pluginId) {
      console.warn(`[FileConverter] 未找到活动任务: ${taskId}`);
      return false;
    }

    // 查找插件并调用取消方法
    for (const plugin of this._converters.values()) {
      if (plugin.id === pluginId && plugin.cancelTask) {
        const cancelled = plugin.cancelTask(taskId);
        if (cancelled) {
          this._activeTasks.delete(taskId);
          console.log(`[FileConverter] 已取消任务: ${taskId}`);
        }
        return cancelled;
      }
    }

    return false;
  }

  /**
   * 获取所有已注册的插件
   *
   * @returns 插件列表（去重）
   */
  getRegisteredPlugins(): ConverterPlugin[] {
    const plugins = new Map<string, ConverterPlugin>();
    for (const plugin of this._converters.values()) {
      plugins.set(plugin.id, plugin);
    }
    return Array.from(plugins.values());
  }

  /**
   * 获取活动任务数量
   *
   * @returns 活动任务数
   */
  getActiveTaskCount(): number {
    return this._activeTasks.size;
  }

  /**
   * 清除所有注册的转换器
   */
  clearConverters(): void {
    this._converters.clear();
    console.log('[FileConverter] 已清除所有转换器');
  }

  /**
   * 生成任务 ID
   */
  private _generateTaskId(): string {
    return `fc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 全局文件转换器实例
 *
 * @example
 * ```typescript
 * import { fileConverter } from '@chips/foundation';
 *
 * // 使用全局实例
 * fileConverter.registerConverter(myPlugin);
 * const result = await fileConverter.convert(source, 'html');
 * ```
 */
export const fileConverter = new FileConverter();
