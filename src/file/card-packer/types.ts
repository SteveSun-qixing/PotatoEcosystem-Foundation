/**
 * CardPacker 卡片打包器类型定义
 * @module @chips/foundation/file/card-packer/types
 */

/**
 * 卡片元数据
 */
export interface CardMetadata {
  /** 薯片标准版本号 */
  chip_standards_version: string;
  /** 卡片ID (10位62进制) */
  card_id: string;
  /** 卡片名称 */
  name: string;
  /** 创建时间 (ISO 8601) */
  created_at: string;
  /** 修改时间 (ISO 8601) */
  modified_at: string;
  /** 主题包标识 */
  theme?: string;
  /** 标签数组 */
  tags?: Array<string | string[]>;
  /** 可见性 */
  visibility?: 'public' | 'private' | 'unlisted';
  /** 是否允许下载 */
  downloadable?: boolean;
  /** 是否允许二次创作 */
  remixable?: boolean;
  /** 是否允许评论 */
  commentable?: boolean;
  /** 许可证 */
  license?: string;
  /** 年龄分级 */
  age_rating?: string;
  /** 内容警告 */
  content_warning?: string[];
  /** 文件信息 */
  file_info?: {
    total_size?: number;
    file_count?: number;
    checksum?: string;
    generated_at?: string;
  };
}

/**
 * 基础卡片引用
 */
export interface BaseCardReference {
  /** 基础卡片ID */
  id: string;
  /** 基础卡片类型 */
  type: string;
}

/**
 * 资源清单项
 */
export interface ResourceManifestItem {
  /** 资源相对路径 */
  path: string;
  /** 文件大小 */
  size: number;
  /** MIME类型 */
  type: string;
  /** 视频/音频时长（秒） */
  duration?: number;
  /** 图片/视频宽度 */
  width?: number;
  /** 图片/视频高度 */
  height?: number;
  /** 字幕语言代码 */
  language?: string;
  /** 校验值 */
  checksum?: string;
}

/**
 * 卡片结构
 */
export interface CardStructure {
  /** 基础卡片列表 */
  structure: BaseCardReference[];
  /** 文件清单 */
  manifest: {
    card_count: number;
    resource_count: number;
    resources?: ResourceManifestItem[];
  };
}

/**
 * 资源模式
 */
export type ResourceMode = 'full' | 'semi' | 'shell';

/**
 * 打包选项
 */
export interface PackOptions {
  /** 是否压缩（false表示使用存储模式） */
  compress?: boolean;
  /** 资源处理模式 */
  resourceMode?: ResourceMode;
  /** 是否生成校验值 */
  generateChecksum?: boolean;
  /** 是否验证结构 */
  validateStructure?: boolean;
  /** 进度回调 */
  onProgress?: (progress: PackProgress) => void;
}

/**
 * 解包选项
 */
export interface UnpackOptions {
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 是否验证完整性 */
  validateIntegrity?: boolean;
  /** 只解包指定文件 */
  files?: string[];
  /** 进度回调 */
  onProgress?: (progress: UnpackProgress) => void;
}

/**
 * 打包进度
 */
export interface PackProgress {
  /** 当前步骤 */
  step: 'preparing' | 'validating' | 'collecting' | 'compressing' | 'writing' | 'completed';
  /** 完成百分比 (0-100) */
  percent: number;
  /** 当前处理的文件 */
  currentFile?: string;
  /** 已处理文件数 */
  processedFiles?: number;
  /** 总文件数 */
  totalFiles?: number;
}

/**
 * 解包进度
 */
export interface UnpackProgress {
  /** 当前步骤 */
  step: 'reading' | 'extracting' | 'validating' | 'writing' | 'completed';
  /** 完成百分比 (0-100) */
  percent: number;
  /** 当前处理的文件 */
  currentFile?: string;
  /** 已处理文件数 */
  processedFiles?: number;
  /** 总文件数 */
  totalFiles?: number;
}

/**
 * 打包结果
 */
export interface PackResult {
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath?: string;
  /** 输出数据（如果未指定输出路径） */
  data?: Uint8Array;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** 警告列表 */
  warnings?: string[];
  /** 统计信息 */
  stats?: {
    /** 耗时（毫秒） */
    duration: number;
    /** 输入大小（字节） */
    inputSize: number;
    /** 输出大小（字节） */
    outputSize: number;
    /** 文件数量 */
    fileCount: number;
    /** 资源数量 */
    resourceCount: number;
  };
}

/**
 * 解包结果
 */
export interface UnpackResult {
  /** 是否成功 */
  success: boolean;
  /** 输出目录路径 */
  outputPath?: string;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** 警告列表 */
  warnings?: string[];
  /** 统计信息 */
  stats?: {
    /** 耗时（毫秒） */
    duration: number;
    /** 卡片大小（字节） */
    cardSize: number;
    /** 提取文件数 */
    fileCount: number;
  };
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  /** 警告列表 */
  warnings?: string[];
}

/**
 * CardPacker 错误代码
 */
export enum CardPackerErrorCode {
  // 通用错误 (PACK-0xxx)
  PACK_FAILED = 'PACK-0001',
  UNPACK_FAILED = 'PACK-0002',
  INVALID_INPUT = 'PACK-0003',
  
  // 结构错误 (PACK-1xxx)
  INVALID_STRUCTURE = 'PACK-1001',
  MISSING_REQUIRED_FILE = 'PACK-1002',
  INVALID_METADATA = 'PACK-1003',
  INVALID_STRUCTURE_FILE = 'PACK-1004',
  INVALID_COVER = 'PACK-1005',
  
  // 资源错误 (PACK-2xxx)
  RESOURCE_NOT_FOUND = 'PACK-2001',
  RESOURCE_READ_FAILED = 'PACK-2002',
  RESOURCE_TOO_LARGE = 'PACK-2003',
  
  // 文件系统错误 (PACK-3xxx)
  FILE_READ_ERROR = 'PACK-3001',
  FILE_WRITE_ERROR = 'PACK-3002',
  PATH_TRAVERSAL = 'PACK-3003',
  PERMISSION_DENIED = 'PACK-3004',
  DISK_FULL = 'PACK-3005',
  
  // ZIP错误 (PACK-4xxx)
  ZIP_CREATE_FAILED = 'PACK-4001',
  ZIP_EXTRACT_FAILED = 'PACK-4002',
  ZIP_CORRUPTED = 'PACK-4003',
  
  // 验证错误 (PACK-5xxx)
  VALIDATION_FAILED = 'PACK-5001',
  CHECKSUM_MISMATCH = 'PACK-5002',
  VERSION_INCOMPATIBLE = 'PACK-5003',
}

/**
 * CardPacker 接口
 */
export interface ICardPacker {
  /**
   * 打包卡片文件夹为 .card 文件
   * @param cardPath - 卡片文件夹路径
   * @param outputPath - 输出文件路径
   * @param options - 打包选项
   */
  pack(cardPath: string, outputPath: string, options?: PackOptions): Promise<PackResult>;

  /**
   * 解包 .card 文件到文件夹
   * @param cardFilePath - .card 文件路径
   * @param outputDir - 输出目录路径
   * @param options - 解包选项
   */
  unpack(cardFilePath: string, outputDir: string, options?: UnpackOptions): Promise<UnpackResult>;

  /**
   * 验证卡片文件夹结构
   * @param cardPath - 卡片文件夹路径
   */
  validate(cardPath: string): Promise<ValidationResult>;

  /**
   * 读取卡片元数据（不完全解包）
   * @param cardFilePath - .card 文件路径
   */
  readMetadata(cardFilePath: string): Promise<CardMetadata>;

  /**
   * 检查卡片版本兼容性
   * @param cardVersion - 卡片版本号
   * @param systemVersion - 系统版本号
   */
  checkCompatibility(cardVersion: string, systemVersion: string): {
    compatible: boolean;
    reason?: string;
  };
}
