/**
 * FileConverter 文件转换接口
 * @module @chips/foundation/file/file-converter/file-converter
 *
 * 提供统一的文件转换接口，管理转换插件的注册和路由
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import {
  IFileConverter,
  ConverterPlugin,
  PluginRegistration,
  ConversionSource,
  ConversionResult,
  ConversionOptions,
  ConversionType,
  ConversionStats,
  MimeTypes,
} from './types';

// ============================================================================
// FileConverter 实现
// ============================================================================

/**
 * FileConverter 文件转换接口
 *
 * @description
 * 文件转换系统采用统一接口加插件化实现的架构。
 * 公共基础层提供转换接口，具体的转换逻辑由独立插件实现。
 *
 * 文件转换接口模块本身不包含任何具体的转换实现。
 * 它只定义转换的标准接口，管理已注册的转换插件，
 * 根据请求的转换类型将请求路由到对应的插件。
 *
 * @example
 * ```typescript
 * const converter = new FileConverter();
 *
 * // 注册转换插件
 * converter.registerConverter(myPlugin);
 *
 * // 查询支持的转换
 * const conversions = converter.getSupportedConversions();
 *
 * // 执行转换
 * const result = await converter.convert(
 *   { type: 'file', path: '/path/to/card.card', sourceType: 'card' },
 *   'html'
 * );
 * ```
 */
export class FileConverter implements IFileConverter {
  /** 插件注册表 */
  private plugins: Map<string, PluginRegistration> = new Map();

  /** 转换类型到插件的映射缓存 */
  private conversionCache: Map<string, PluginRegistration[]> = new Map();

  /**
   * 创建文件转换接口实例
   */
  constructor() {
    // 初始化为空
  }

  /**
   * 注册转换插件
   *
   * @description
   * 插件在启动时向接口模块注册自己，声明支持的源文件类型和目标文件类型。
   * 接口模块记录这些信息，建立转换类型到插件的映射关系。
   *
   * @param converter - 转换插件
   * @param priority - 优先级（默认为 0，数字越大优先级越高）
   */
  registerConverter(converter: ConverterPlugin, priority: number = 0): void {
    // 验证插件
    this.validatePlugin(converter);

    // 检查是否已注册
    if (this.plugins.has(converter.id)) {
      throw new ChipsError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        `Converter plugin already registered: ${converter.id}`,
        { pluginId: converter.id }
      );
    }

    // 注册插件
    this.plugins.set(converter.id, {
      plugin: converter,
      registeredAt: Date.now(),
      priority,
    });

    // 清除缓存
    this.clearConversionCache();
  }

  /**
   * 注销转换插件
   *
   * @description
   * 插件卸载时，向接口模块注销自己，接口模块移除该插件的转换能力记录。
   *
   * @param converterId - 插件 ID
   */
  unregisterConverter(converterId: string): void {
    if (!this.plugins.has(converterId)) {
      throw new ChipsError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Converter plugin not found: ${converterId}`,
        { pluginId: converterId }
      );
    }

    this.plugins.delete(converterId);

    // 清除缓存
    this.clearConversionCache();
  }

  /**
   * 获取支持的转换类型
   *
   * @description
   * 返回所有已注册插件声明的转换能力。
   *
   * @returns 转换类型数组
   */
  getSupportedConversions(): ConversionType[] {
    const conversions: ConversionType[] = [];
    const seen = new Set<string>();

    for (const { plugin } of this.plugins.values()) {
      for (const sourceType of plugin.sourceTypes) {
        const key = `${sourceType}:${plugin.targetType}`;
        if (!seen.has(key)) {
          seen.add(key);
          conversions.push({
            sourceType,
            targetType: plugin.targetType,
            description: plugin.description,
          });
        }
      }
    }

    return conversions;
  }

  /**
   * 执行转换
   *
   * @description
   * 接口模块解析请求，根据源类型和目标类型查找对应的转换插件。
   * 如果找到插件，验证转换选项的有效性，然后调用插件的转换方法。
   *
   * @param source - 转换源
   * @param targetType - 目标类型
   * @param options - 转换选项
   * @returns 转换结果
   */
  async convert(
    source: ConversionSource,
    targetType: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    // 验证源
    this.validateSource(source);

    // 查找插件
    const plugins = this.getConvertersForConversion(source.sourceType, targetType);

    if (plugins.length === 0) {
      return this.createErrorResult(
        startTime,
        'CONV-1001',
        `No converter found for ${source.sourceType} -> ${targetType}`,
        source
      );
    }

    // 使用优先级最高的插件
    const plugin = plugins[0].plugin;

    // 验证源（如果插件支持）
    if (plugin.validateSource) {
      const isValid = await plugin.validateSource(source);
      if (!isValid) {
        return this.createErrorResult(
          startTime,
          'CONV-1002',
          'Source validation failed',
          source
        );
      }
    }

    // 执行转换
    try {
      const result = await plugin.convert(source, options);

      // 补充统计信息
      if (!result.stats) {
        result.stats = this.createEmptyStats(startTime);
      } else {
        result.stats.duration = Date.now() - startTime;
      }

      return result;
    } catch (error) {
      return this.createErrorResult(
        startTime,
        'CONV-1003',
        `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source,
        error
      );
    }
  }

  /**
   * 检查是否支持某种转换
   *
   * @param sourceType - 源类型
   * @param targetType - 目标类型
   * @returns 是否支持
   */
  canConvert(sourceType: string, targetType: string): boolean {
    return this.getConvertersForConversion(sourceType, targetType).length > 0;
  }

  /**
   * 获取指定转换的可用插件
   *
   * @param sourceType - 源类型
   * @param targetType - 目标类型
   * @returns 插件数组（按优先级排序）
   */
  getConverters(sourceType: string, targetType: string): ConverterPlugin[] {
    return this.getConvertersForConversion(sourceType, targetType).map((r) => r.plugin);
  }

  /**
   * 获取所有已注册的插件
   *
   * @returns 插件数组
   */
  getAllPlugins(): ConverterPlugin[] {
    return Array.from(this.plugins.values()).map((r) => r.plugin);
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 验证插件
   */
  private validatePlugin(plugin: ConverterPlugin): void {
    if (!plugin.id) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Plugin id is required', {});
    }
    if (!plugin.name) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Plugin name is required', {});
    }
    if (!plugin.version) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Plugin version is required', {});
    }
    if (!plugin.sourceTypes || plugin.sourceTypes.length === 0) {
      throw new ChipsError(
        ErrorCodes.INVALID_INPUT,
        'Plugin must support at least one source type',
        {}
      );
    }
    if (!plugin.targetType) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Plugin targetType is required', {});
    }
    if (typeof plugin.convert !== 'function') {
      throw new ChipsError(
        ErrorCodes.INVALID_INPUT,
        'Plugin must implement convert method',
        {}
      );
    }
  }

  /**
   * 验证转换源
   */
  private validateSource(source: ConversionSource): void {
    if (!source.type) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Source type is required', {});
    }
    if (!source.sourceType) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Source sourceType is required', {});
    }

    switch (source.type) {
      case 'file':
        if (!source.path) {
          throw new ChipsError(
            ErrorCodes.INVALID_INPUT,
            'Source path is required for file type',
            {}
          );
        }
        break;
      case 'data':
        if (!source.data) {
          throw new ChipsError(
            ErrorCodes.INVALID_INPUT,
            'Source data is required for data type',
            {}
          );
        }
        break;
      case 'url':
        if (!source.url) {
          throw new ChipsError(
            ErrorCodes.INVALID_INPUT,
            'Source url is required for url type',
            {}
          );
        }
        break;
      default:
        throw new ChipsError(
          ErrorCodes.INVALID_INPUT,
          `Unknown source type: ${source.type}`,
          {}
        );
    }
  }

  /**
   * 获取指定转换的插件列表
   */
  private getConvertersForConversion(
    sourceType: string,
    targetType: string
  ): PluginRegistration[] {
    const cacheKey = `${sourceType}:${targetType}`;

    // 检查缓存
    if (this.conversionCache.has(cacheKey)) {
      return this.conversionCache.get(cacheKey)!;
    }

    // 查找匹配的插件
    const matchingPlugins: PluginRegistration[] = [];

    for (const registration of this.plugins.values()) {
      const { plugin } = registration;
      if (
        plugin.targetType === targetType &&
        plugin.sourceTypes.includes(sourceType)
      ) {
        matchingPlugins.push(registration);
      }
    }

    // 按优先级排序（高优先级在前）
    matchingPlugins.sort((a, b) => b.priority - a.priority);

    // 更新缓存
    this.conversionCache.set(cacheKey, matchingPlugins);

    return matchingPlugins;
  }

  /**
   * 清除转换缓存
   */
  private clearConversionCache(): void {
    this.conversionCache.clear();
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    startTime: number,
    code: string,
    message: string,
    source: ConversionSource,
    originalError?: unknown
  ): ConversionResult {
    const duration = Date.now() - startTime;

    return {
      success: false,
      mimeType: '',
      stats: {
        duration,
        inputSize: this.estimateSourceSize(source),
        outputSize: 0,
      },
      error: {
        code,
        message,
        details: originalError instanceof Error ? originalError.message : undefined,
      },
    };
  }

  /**
   * 创建空统计信息
   */
  private createEmptyStats(startTime: number): ConversionStats {
    return {
      duration: Date.now() - startTime,
      inputSize: 0,
      outputSize: 0,
    };
  }

  /**
   * 估算源数据大小
   */
  private estimateSourceSize(source: ConversionSource): number {
    if (source.type === 'data' && source.data) {
      if (typeof source.data === 'string') {
        return source.data.length;
      }
      return source.data.length;
    }
    return 0;
  }
}

/**
 * 创建文件转换接口实例
 */
export function createFileConverter(): FileConverter {
  return new FileConverter();
}

/**
 * 全局文件转换接口实例
 */
export const fileConverter = new FileConverter();
