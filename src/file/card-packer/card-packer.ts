/**
 * CardPacker 卡片打包器
 * @module @chips/foundation/file/card-packer/card-packer
 * 
 * 负责卡片文件夹与 .card 文件之间的转换
 * 遵循《卡片文件格式规范》(生态共用/02-卡片文件格式规范.md)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { ZIPProcessor, type FileData } from '../zip-processor/zip-processor';
import { DataSerializer } from '../../system/data-serializer/data-serializer';
import { LogSystem } from '../../system/log-system/log-system';
import { ConfigManager } from '../../system/config-manager/config-manager';
import type {
  ICardPacker,
  CardMetadata,
  CardStructure,
  PackOptions,
  UnpackOptions,
  PackResult,
  UnpackResult,
  ValidationResult,
  PackProgress,
  UnpackProgress,
  CardPackerErrorCode,
} from './types';

/**
 * 必需的配置文件路径
 */
const REQUIRED_FILES = {
  METADATA: '.card/metadata.yaml',
  STRUCTURE: '.card/structure.yaml',
  COVER: '.card/cover.html',
};

/**
 * 默认打包选项
 */
const DEFAULT_PACK_OPTIONS: Required<Omit<PackOptions, 'onProgress'>> = {
  compress: false, // .card 使用存储模式（零压缩率）
  resourceMode: 'full',
  generateChecksum: true,
  validateStructure: true,
};

/**
 * 默认解包选项
 */
const DEFAULT_UNPACK_OPTIONS: Required<Omit<UnpackOptions, 'onProgress' | 'files'>> = {
  overwrite: false,
  validateIntegrity: true,
};

/**
 * CardPacker 卡片打包器实现
 * 
 * 功能：
 * - 将卡片文件夹打包为 .card 文件（ZIP格式）
 * - 将 .card 文件解包为文件夹
 * - 验证卡片文件结构完整性
 * - 读取卡片元数据（不完全解包）
 * - 版本兼容性检查
 * 
 * @example
 * ```typescript
 * import { cardPacker } from '@chips/foundation';
 * 
 * // 打包
 * const packResult = await cardPacker.pack(
 *   '/workspace/my-card',
 *   '/exports/my-card.card'
 * );
 * 
 * // 解包
 * const unpackResult = await cardPacker.unpack(
 *   '/exports/my-card.card',
 *   '/workspace/my-card-extracted'
 * );
 * ```
 */
export class CardPacker implements ICardPacker {
  private _zipProcessor: ZIPProcessor;
  private _serializer: DataSerializer;
  private _logger: LogSystem;
  private _config: ConfigManager;

  constructor(
    zipProcessor?: ZIPProcessor,
    serializer?: DataSerializer,
    logger?: LogSystem,
    config?: ConfigManager
  ) {
    this._zipProcessor = zipProcessor ?? new ZIPProcessor();
    this._serializer = serializer ?? new DataSerializer();
    this._logger = logger ?? new LogSystem({ defaultModule: 'CardPacker' });
    this._config = config ?? new ConfigManager();
  }

  /**
   * 打包卡片文件夹为 .card 文件
   * 
   * @param cardPath - 卡片文件夹路径
   * @param outputPath - 输出 .card 文件路径
   * @param options - 打包选项
   * @returns 打包结果
   */
  async pack(
    cardPath: string,
    outputPath: string,
    options?: PackOptions
  ): Promise<PackResult> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_PACK_OPTIONS, ...options };
    const warnings: string[] = [];

    this._logger.info('Starting card pack', { cardPath, outputPath, options: mergedOptions });

    try {
      // 报告进度
      const reportProgress = (step: PackProgress['step'], percent: number, currentFile?: string) => {
        options?.onProgress?.({ step, percent, currentFile });
      };

      // 1. 准备阶段
      reportProgress('preparing', 0);

      // 验证输入路径
      const cardPathResolved = path.resolve(cardPath);
      const outputPathResolved = path.resolve(outputPath);

      // 检查卡片文件夹是否存在
      try {
        const stat = await fs.stat(cardPathResolved);
        if (!stat.isDirectory()) {
          return this._createErrorResult(
            'PACK-0003' as any,
            `Not a directory: ${cardPath}`
          );
        }
      } catch (error) {
        return this._createErrorResult(
          'PACK-3001' as any,
          `Card folder not found: ${cardPath}`,
          error
        );
      }

      // 2. 验证结构
      if (mergedOptions.validateStructure) {
        reportProgress('validating', 10);
        const validation = await this.validate(cardPathResolved);
        if (!validation.valid) {
          this._logger.error('Card structure validation failed', {
            errors: validation.errors,
          });
          return {
            success: false,
            error: {
              code: 'PACK-1001' as any,
              message: 'Invalid card structure',
              details: validation.errors,
            },
            warnings: validation.warnings,
          };
        }
        if (validation.warnings) {
          warnings.push(...validation.warnings);
        }
      }

      // 3. 收集文件
      reportProgress('collecting', 20);
      const files: FileData[] = [];
      let totalSize = 0;
      let fileCount = 0;

      // 读取必需的配置文件
      const metadataPath = path.join(cardPathResolved, REQUIRED_FILES.METADATA);
      const structurePath = path.join(cardPathResolved, REQUIRED_FILES.STRUCTURE);
      const coverPath = path.join(cardPathResolved, REQUIRED_FILES.COVER);

      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const structureContent = await fs.readFile(structurePath, 'utf-8');
      const coverContent = await fs.readFile(coverPath, 'utf-8');

      // 解析元数据和结构
      const metadata = this._serializer.parseYAML<CardMetadata>(metadataContent);
      const structure = this._serializer.parseYAML<CardStructure>(structureContent);

      // 更新修改时间
      metadata.modified_at = new Date().toISOString();

      // 添加配置文件到打包列表
      files.push({
        path: REQUIRED_FILES.METADATA,
        content: this._serializer.stringifyYAML(metadata),
      });
      files.push({
        path: REQUIRED_FILES.STRUCTURE,
        content: this._serializer.stringifyYAML(structure),
      });
      files.push({
        path: REQUIRED_FILES.COVER,
        content: coverContent,
      });

      // 收集 content 目录下的所有配置文件
      const contentDir = path.join(cardPathResolved, 'content');
      try {
        const contentFiles = await fs.readdir(contentDir);
        for (const filename of contentFiles) {
          if (filename.endsWith('.yaml')) {
            const filePath = path.join(contentDir, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            files.push({
              path: `content/${filename}`,
              content,
            });
            fileCount++;
          }
        }
      } catch (error) {
        warnings.push('Content directory not found or empty');
      }

      // 收集 cardcover 目录（如果存在）
      const cardcoverDir = path.join(cardPathResolved, '.card/cardcover');
      try {
        await this._collectDirectory(cardcoverDir, '.card/cardcover', files);
      } catch {
        // cardcover 是可选的
      }

      // 收集资源文件（根据资源模式）
      if (mergedOptions.resourceMode === 'full' || mergedOptions.resourceMode === 'semi') {
        reportProgress('collecting', 40);
        
        // 遍历根目录下的所有文件
        const rootFiles = await fs.readdir(cardPathResolved);
        for (const filename of rootFiles) {
          // 跳过配置目录和 content 目录
          if (filename === '.card' || filename === 'content') {
            continue;
          }

          const filePath = path.join(cardPathResolved, filename);
          const stat = await fs.stat(filePath);

          if (stat.isFile()) {
            // 检查文件大小
            const maxSize = this._config.get<number>('card.max_resource_size', 500 * 1024 * 1024);
            if (stat.size > maxSize) {
              if (mergedOptions.resourceMode === 'full') {
                warnings.push(`Resource too large, skipping: ${filename} (${stat.size} bytes)`);
                continue;
              }
            }

            const content = await fs.readFile(filePath);
            files.push({
              path: filename,
              content,
            });
            totalSize += stat.size;
            fileCount++;
          }
        }
      }

      const getContentSize = (content: FileData['content']): number => {
        if (typeof content === 'string') {
          return Buffer.byteLength(content, 'utf-8');
        }
        if (content instanceof ArrayBuffer) {
          return content.byteLength;
        }
        if (content instanceof Uint8Array) {
          return content.byteLength;
        }
        return 0;
      };

      fileCount = files.length;
      totalSize = files.reduce((sum, file) => sum + getContentSize(file.content), 0);

      reportProgress('collecting', 60, `Collected ${fileCount} files`);

      // 4. 生成文件信息（如果需要）
      if (mergedOptions.generateChecksum) {
        reportProgress('collecting', 70, 'Generating checksum');
        
        // 计算整体校验值
        const checksumData = files
          .map((f) => `${f.path}:${this._hashContent(f.content)}`)
          .join('|');
        const checksum = createHash('sha256').update(checksumData).digest('hex');

        // 更新元数据中的文件信息
        metadata.file_info = {
          total_size: totalSize,
          file_count: fileCount,
          checksum,
          generated_at: new Date().toISOString(),
        };

        // 重新序列化元数据
        files[0] = {
          path: REQUIRED_FILES.METADATA,
          content: this._serializer.stringifyYAML(metadata),
        };
      }

      // 5. 压缩阶段
      reportProgress('compressing', 80);
      const zipData = await this._zipProcessor.create(files, {
        store: !mergedOptions.compress, // .card 使用存储模式
      });

      const outputSize = zipData.byteLength;

      // 6. 写入文件
      reportProgress('writing', 90, outputPathResolved);
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPathResolved);
      await fs.mkdir(outputDir, { recursive: true });
      
      // 写入 .card 文件
      await fs.writeFile(outputPathResolved, zipData);

      // 7. 完成
      reportProgress('completed', 100);
      
      const duration = Date.now() - startTime;

      this._logger.info('Card pack completed', {
        outputPath: outputPathResolved,
        duration,
        fileCount,
        outputSize,
      });

      return {
        success: true,
        outputPath: outputPathResolved,
        warnings: warnings.length > 0 ? warnings : undefined,
        stats: {
          duration,
          inputSize: totalSize,
          outputSize,
          fileCount,
          resourceCount: structure.manifest.resource_count,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this._logger.error('Card pack failed', { cardPath, outputPath, error });
      
      return this._createErrorResult(
        'PACK-0001' as any,
        error instanceof Error ? error.message : 'Pack failed',
        error
      );
    }
  }

  /**
   * 解包 .card 文件到文件夹
   * 
   * @param cardFilePath - .card 文件路径
   * @param outputDir - 输出目录路径
   * @param options - 解包选项
   * @returns 解包结果
   */
  async unpack(
    cardFilePath: string,
    outputDir: string,
    options?: UnpackOptions
  ): Promise<UnpackResult> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_UNPACK_OPTIONS, ...options };
    const warnings: string[] = [];

    this._logger.info('Starting card unpack', { cardFilePath, outputDir, options: mergedOptions });

    try {
      // 报告进度
      const reportProgress = (
        step: UnpackProgress['step'],
        percent: number,
        currentFile?: string
      ) => {
        options?.onProgress?.({ step, percent, currentFile });
      };

      // 1. 读取 .card 文件
      reportProgress('reading', 0);

      const cardFilePathResolved = path.resolve(cardFilePath);
      const outputDirResolved = path.resolve(outputDir);

      // 检查输入文件
      try {
        const stat = await fs.stat(cardFilePathResolved);
        if (!stat.isFile()) {
          return this._createUnpackErrorResult(
            'PACK-0003' as any,
            `Not a file: ${cardFilePath}`
          );
        }
      } catch (error) {
        return this._createUnpackErrorResult(
          'PACK-3001' as any,
          `Card file not found: ${cardFilePath}`,
          error
        );
      }

      // 检查输出目录
      if (!mergedOptions.overwrite) {
        try {
          await fs.access(outputDirResolved);
          return this._createUnpackErrorResult(
            'PACK-3002' as any,
            `Output directory already exists: ${outputDir}`
          );
        } catch {
          // 目录不存在，可以继续
        }
      }

      // 读取 ZIP 文件
      const zipBuffer = await fs.readFile(cardFilePathResolved);
      const cardSize = zipBuffer.byteLength;

      // 2. 提取文件
      reportProgress('extracting', 20);

      const extractedFiles = await this._zipProcessor.extract(zipBuffer, {
        files: options?.files,
      });

      // 3. 验证完整性
      if (mergedOptions.validateIntegrity) {
        reportProgress('validating', 60);

        // 检查必需文件
        for (const requiredFile of Object.values(REQUIRED_FILES)) {
          if (!extractedFiles.has(requiredFile)) {
            return this._createUnpackErrorResult(
              'PACK-1002' as any,
              `Missing required file: ${requiredFile}`
            );
          }
        }

        // 验证元数据
        try {
          const metadataContent = extractedFiles.get(REQUIRED_FILES.METADATA);
          if (metadataContent) {
            const metadata = this._serializer.parseYAML<CardMetadata>(
              new TextDecoder().decode(metadataContent)
            );

            // 检查版本兼容性
            const compatibility = this.checkCompatibility(
              metadata.chip_standards_version,
              '1.0.0' // 当前系统版本
            );

            if (!compatibility.compatible) {
              warnings.push(`Version compatibility issue: ${compatibility.reason}`);
            }
          }
        } catch (error) {
          return this._createUnpackErrorResult(
            'PACK-1003' as any,
            'Invalid metadata format',
            error
          );
        }
      }

      // 4. 写入文件
      reportProgress('writing', 70);

      // 创建输出目录
      await fs.mkdir(outputDirResolved, { recursive: true });

      let processedFiles = 0;
      const totalFiles = extractedFiles.size;

      for (const [filePath, content] of extractedFiles.entries()) {
        const fullPath = path.join(outputDirResolved, filePath);
        const fileDir = path.dirname(fullPath);

        // 安全检查：防止路径遍历
        if (!fullPath.startsWith(outputDirResolved)) {
          warnings.push(`Skipping suspicious path: ${filePath}`);
          continue;
        }

        // 创建目录
        await fs.mkdir(fileDir, { recursive: true });

        // 写入文件
        await fs.writeFile(fullPath, content);

        processedFiles++;
        const percent = 70 + Math.floor((processedFiles / totalFiles) * 20);
        reportProgress('writing', percent, filePath);
      }

      // 5. 完成
      reportProgress('completed', 100);

      const duration = Date.now() - startTime;

      this._logger.info('Card unpack completed', {
        cardFilePath: cardFilePathResolved,
        outputDir: outputDirResolved,
        duration,
        fileCount: totalFiles,
      });

      return {
        success: true,
        outputPath: outputDirResolved,
        warnings: warnings.length > 0 ? warnings : undefined,
        stats: {
          duration,
          cardSize,
          fileCount: totalFiles,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this._logger.error('Card unpack failed', { cardFilePath, outputDir, error });

      return this._createUnpackErrorResult(
        'PACK-0002' as any,
        error instanceof Error ? error.message : 'Unpack failed',
        error
      );
    }
  }

  /**
   * 验证卡片文件夹结构
   * 
   * @param cardPath - 卡片文件夹路径
   * @returns 验证结果
   */
  async validate(cardPath: string): Promise<ValidationResult> {
    this._logger.debug('Validating card structure', { cardPath });

    const errors: ValidationResult['errors'] = [];
    const warnings: string[] = [];

    try {
      const cardPathResolved = path.resolve(cardPath);

      // 检查必需文件
      for (const [name, filePath] of Object.entries(REQUIRED_FILES)) {
        const fullPath = path.join(cardPathResolved, filePath);
        try {
          await fs.access(fullPath);
        } catch {
          errors.push({
            field: filePath,
            message: `Missing required file: ${filePath}`,
            code: 'PACK-1002',
          });
        }
      }

      // 如果缺少必需文件，直接返回
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }

      // 验证 metadata.yaml
      try {
        const metadataPath = path.join(cardPathResolved, REQUIRED_FILES.METADATA);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = this._serializer.parseYAML<CardMetadata>(metadataContent);

        // 检查必需字段
        if (!metadata.card_id) {
          errors.push({
            field: 'metadata.card_id',
            message: 'Missing card_id',
            code: 'PACK-1003',
          });
        } else if (!/^[0-9a-zA-Z]{10}$/.test(metadata.card_id)) {
          errors.push({
            field: 'metadata.card_id',
            message: 'Invalid card_id format (must be 10 char base62)',
            code: 'PACK-1003',
          });
        }

        if (!metadata.name) {
          errors.push({
            field: 'metadata.name',
            message: 'Missing card name',
            code: 'PACK-1003',
          });
        }

        if (!metadata.chip_standards_version) {
          errors.push({
            field: 'metadata.chip_standards_version',
            message: 'Missing chip_standards_version',
            code: 'PACK-1003',
          });
        }
      } catch (error) {
        errors.push({
          field: 'metadata.yaml',
          message: `Invalid metadata format: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'PACK-1003',
        });
      }

      // 验证 structure.yaml
      try {
        const structurePath = path.join(cardPathResolved, REQUIRED_FILES.STRUCTURE);
        const structureContent = await fs.readFile(structurePath, 'utf-8');
        const structure = this._serializer.parseYAML<CardStructure>(structureContent);

        if (!Array.isArray(structure.structure)) {
          errors.push({
            field: 'structure.structure',
            message: 'structure must be an array',
            code: 'PACK-1004',
          });
        } else {
          // 验证每个基础卡片引用
          for (const [index, card] of structure.structure.entries()) {
            if (!card.id) {
              errors.push({
                field: `structure.structure[${index}].id`,
                message: 'Missing base card id',
                code: 'PACK-1004',
              });
            }
            if (!card.type) {
              errors.push({
                field: `structure.structure[${index}].type`,
                message: 'Missing base card type',
                code: 'PACK-1004',
              });
            }

            // 检查对应的配置文件是否存在
            if (card.id) {
              const configPath = path.join(cardPathResolved, 'content', `${card.id}.yaml`);
              try {
                await fs.access(configPath);
              } catch {
                warnings.push(`Base card config not found: content/${card.id}.yaml`);
                continue;
              }

              try {
                const contentYaml = await fs.readFile(configPath, 'utf-8');
                const contentDoc = this._serializer.parseYAML<Record<string, unknown>>(contentYaml);
                const contentType = typeof contentDoc.type === 'string' ? contentDoc.type.trim() : '';
                const contentData = contentDoc.data;

                if (!contentType) {
                  errors.push({
                    field: `content.${card.id}.type`,
                    message: 'Base card content must include non-empty type',
                    code: 'PACK-1004',
                  });
                }

                if (!this._isPlainObject(contentData)) {
                  errors.push({
                    field: `content.${card.id}.data`,
                    message: 'Base card content must include data object',
                    code: 'PACK-1004',
                  });
                }

                if (contentType && card.type && contentType !== card.type) {
                  errors.push({
                    field: `content.${card.id}.type`,
                    message: `Base card type mismatch: structure=${card.type}, content=${contentType}`,
                    code: 'PACK-1004',
                  });
                }
              } catch (contentError) {
                errors.push({
                  field: `content.${card.id}`,
                  message: `Invalid base card content format: ${
                    contentError instanceof Error ? contentError.message : 'Unknown error'
                  }`,
                  code: 'PACK-1004',
                });
              }
            }
          }
        }
      } catch (error) {
        errors.push({
          field: 'structure.yaml',
          message: `Invalid structure format: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'PACK-1004',
        });
      }

      // 检查 content 目录
      const contentDir = path.join(cardPathResolved, 'content');
      try {
        await fs.access(contentDir);
      } catch {
        warnings.push('Content directory not found');
      }

      const valid = errors.length === 0;

      if (valid) {
        this._logger.debug('Card structure is valid', { cardPath });
      } else {
        this._logger.warn('Card structure validation failed', { cardPath, errors });
      }

      return {
        valid,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      this._logger.error('Card validation error', { cardPath, error });
      return {
        valid: false,
        errors: [
          {
            field: 'card',
            message: error instanceof Error ? error.message : 'Validation error',
            code: 'PACK-5001',
          },
        ],
      };
    }
  }

  /**
   * 读取卡片元数据（不完全解包）
   * 
   * @param cardFilePath - .card 文件路径
   * @returns 卡片元数据
   */
  async readMetadata(cardFilePath: string): Promise<CardMetadata> {
    this._logger.debug('Reading card metadata', { cardFilePath });

    try {
      const cardFilePathResolved = path.resolve(cardFilePath);

      // 读取 .card 文件
      const zipBuffer = await fs.readFile(cardFilePathResolved);

      // 只提取 metadata.yaml
      const metadataContent = await this._zipProcessor.extractText(
        zipBuffer,
        REQUIRED_FILES.METADATA
      );

      // 解析元数据
      const metadata = this._serializer.parseYAML<CardMetadata>(metadataContent);

      this._logger.debug('Metadata read successfully', {
        cardId: metadata.card_id,
        name: metadata.name,
      });

      return metadata;
    } catch (error) {
      this._logger.error('Failed to read metadata', { cardFilePath, error });
      throw new Error(
        `Failed to read card metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 检查卡片版本兼容性
   * 
   * @param cardVersion - 卡片版本号
   * @param systemVersion - 系统版本号
   * @returns 兼容性结果
   */
  checkCompatibility(
    cardVersion: string,
    systemVersion: string
  ): { compatible: boolean; reason?: string } {
    try {
      const [cardMajor, cardMinor] = cardVersion.split('.').map(Number);
      const [sysMajor, sysMinor] = systemVersion.split('.').map(Number);

      // 主版本号必须相同
      if (cardMajor !== sysMajor) {
        return {
          compatible: false,
          reason: `Incompatible major version: card=${cardMajor}, system=${sysMajor}`,
        };
      }

      // 卡片次版本号不能大于系统次版本号
      if (cardMinor > sysMinor) {
        return {
          compatible: true, // 部分兼容
          reason: `Card minor version (${cardMinor}) is newer than system (${sysMinor}), some features may not work`,
        };
      }

      return { compatible: true };
    } catch (error) {
      return {
        compatible: false,
        reason: 'Invalid version format',
      };
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 递归收集目录下的所有文件
   */
  private async _collectDirectory(
    dirPath: string,
    relativeBase: string,
    files: FileData[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.join(relativeBase, entry.name);

      if (entry.isDirectory()) {
        await this._collectDirectory(fullPath, relativePath, files);
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath);
        files.push({
          path: relativePath.replace(/\\/g, '/'), // 统一使用正斜杠
          content,
        });
      }
    }
  }

  /**
   * 计算内容哈希
   */
  private _hashContent(content: string | ArrayBuffer | Uint8Array): string {
    if (typeof content === 'string') {
      return createHash('sha256').update(content, 'utf-8').digest('hex');
    } else {
      return createHash('sha256').update(content as Buffer).digest('hex');
    }
  }

  private _isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * 创建错误结果（pack）
   */
  private _createErrorResult(
    code: CardPackerErrorCode,
    message: string,
    details?: unknown
  ): PackResult {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  }

  /**
   * 创建错误结果（unpack）
   */
  private _createUnpackErrorResult(
    code: CardPackerErrorCode,
    message: string,
    details?: unknown
  ): UnpackResult {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  }
}

/**
 * 全局 CardPacker 实例
 */
export const cardPacker = new CardPacker();
