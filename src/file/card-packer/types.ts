/**
 * CardPacker 卡片打包器类型定义
 * @module @chips/foundation/file/card-packer/types
 */

import { CardMetadata } from '../../core/types';

// ============================================================================
// 打包选项
// ============================================================================

/**
 * 打包选项
 */
export interface PackOptions {
  /** 打包前是否验证结构 */
  validate?: boolean;
  /** 是否计算文件校验值 */
  checksum?: boolean;
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
}

/**
 * 解包选项
 */
export interface UnpackOptions {
  /** 是否覆盖已存在的目录 */
  overwrite?: boolean;
  /** 解包后是否验证结构 */
  validate?: boolean;
}

// ============================================================================
// 验证相关
// ============================================================================

/**
 * 验证级别
 */
export type ValidationLevel = 'directory' | 'file' | 'reference' | 'full';

/**
 * 验证选项
 */
export interface ValidationOptions {
  /** 验证级别 */
  level?: ValidationLevel;
  /** 是否验证资源引用 */
  checkReferences?: boolean;
}

/**
 * 验证检查项
 */
export interface ValidationCheckItem {
  /** 检查项名称 */
  name: string;
  /** 是否通过 */
  passed: boolean;
  /** 检查类型 */
  type: 'directory' | 'file' | 'format' | 'reference';
  /** 相关路径 */
  path?: string;
  /** 错误消息（失败时） */
  message?: string;
}

/**
 * 卡片验证结果
 */
export interface CardValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 验证检查项列表 */
  checks: ValidationCheckItem[];
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
  /** 验证时间（毫秒） */
  duration: number;
}

// ============================================================================
// 卡片结构定义
// ============================================================================

/**
 * 卡片文件结构规范
 * 定义 .card 文件夹应包含的标准结构
 */
export interface CardFileStructure {
  /** .card 配置文件夹 */
  configDir: '.card';
  /** 必需的配置文件 */
  requiredFiles: string[];
  /** 可选的配置文件 */
  optionalFiles: string[];
  /** 内容文件夹 */
  contentDir: 'content';
  /** 资源文件夹 */
  assetsDir: 'assets';
}

/**
 * 默认卡片文件结构
 */
export const DEFAULT_CARD_STRUCTURE: CardFileStructure = {
  configDir: '.card',
  requiredFiles: ['metadata.yaml', 'structure.yaml'],
  optionalFiles: ['cover.html', 'theme.yaml'],
  contentDir: 'content',
  assetsDir: 'assets',
};

// ============================================================================
// 打包结果
// ============================================================================

/**
 * 打包结果
 */
export interface PackResult {
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件数量 */
  fileCount: number;
  /** 打包耗时（毫秒） */
  duration: number;
  /** 校验值（如果启用） */
  checksum?: string;
}

/**
 * 解包结果
 */
export interface UnpackResult {
  /** 是否成功 */
  success: boolean;
  /** 输出目录路径 */
  outputDir: string;
  /** 文件数量 */
  fileCount: number;
  /** 解包耗时（毫秒） */
  duration: number;
  /** 验证结果（如果启用） */
  validation?: CardValidationResult;
}

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 卡片打包器接口
 */
export interface ICardPacker {
  /**
   * 将卡片文件夹打包为 .card 文件
   * @param sourceDir - 源文件夹路径
   * @param targetPath - 目标文件路径
   * @param options - 打包选项
   */
  pack(sourceDir: string, targetPath: string, options?: PackOptions): Promise<PackResult>;

  /**
   * 将 .card 文件解包为文件夹
   * @param cardPath - .card 文件路径
   * @param targetDir - 目标目录路径
   * @param options - 解包选项
   */
  unpack(cardPath: string, targetDir: string, options?: UnpackOptions): Promise<UnpackResult>;

  /**
   * 验证卡片结构
   * @param cardPath - .card 文件路径或文件夹路径
   * @param options - 验证选项
   */
  validate(cardPath: string, options?: ValidationOptions): Promise<CardValidationResult>;

  /**
   * 读取卡片元数据
   * @param cardPath - .card 文件路径
   */
  getMetadata(cardPath: string): Promise<CardMetadata>;
}
