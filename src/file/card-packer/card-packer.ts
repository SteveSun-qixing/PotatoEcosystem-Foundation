/**
 * CardPacker 卡片打包器
 * @module @chips/foundation/file/card-packer/card-packer
 *
 * 负责卡片文件夹与 .card 文件之间的转换
 * 基于 ZIPProcessor 实现，专注于卡片格式的业务逻辑
 */

import { CardMetadata } from '../../core/types';
import { FileError, ErrorCodes } from '../../core/errors';
import { ZIPProcessor, FileData } from '../zip-processor/zip-processor';
import { YAMLParser } from '../../system/data-serializer/parsers/yaml-parser';
import {
  ICardPacker,
  PackOptions,
  UnpackOptions,
  ValidationOptions,
  CardValidationResult,
  PackResult,
  UnpackResult,
  ValidationCheckItem,
  DEFAULT_CARD_STRUCTURE,
} from './types';

// ============================================================================
// 文件系统接口（用于依赖注入）
// ============================================================================

/**
 * 文件系统适配器接口
 * 用于支持不同运行环境（Node.js / Browser）
 */
export interface FileSystemAdapter {
  /** 读取文件 */
  readFile(path: string): Promise<Uint8Array>;
  /** 写入文件 */
  writeFile(path: string, data: Uint8Array): Promise<void>;
  /** 读取文本文件 */
  readTextFile(path: string): Promise<string>;
  /** 写入文本文件 */
  writeTextFile(path: string, content: string): Promise<void>;
  /** 读取目录 */
  readDir(path: string): Promise<string[]>;
  /** 创建目录 */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** 检查路径是否存在 */
  exists(path: string): Promise<boolean>;
  /** 检查是否为目录 */
  isDirectory(path: string): Promise<boolean>;
  /** 删除目录 */
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** 获取文件状态 */
  stat(path: string): Promise<{ size: number; mtime: Date }>;
  /** 路径拼接 */
  join(...paths: string[]): string;
  /** 获取目录名 */
  dirname(path: string): string;
  /** 获取文件名 */
  basename(path: string): string;
  /** 获取相对路径 */
  relative(from: string, to: string): string;
}

// ============================================================================
// CardPacker 实现
// ============================================================================

/**
 * CardPacker 卡片打包器
 *
 * @description
 * 卡片打包器构建在 ZIP 处理器之上，复用 ZIP 处理器的压缩、解压、流式读取能力。
 * 打包器专注于卡片格式的业务逻辑，负责目录结构的组织和验证。
 *
 * @example
 * ```typescript
 * const packer = new CardPacker(zipProcessor, fileSystem);
 *
 * // 打包卡片
 * await packer.pack('/path/to/card-folder', '/path/to/output.card');
 *
 * // 解包卡片
 * await packer.unpack('/path/to/card.card', '/path/to/output-folder');
 *
 * // 验证卡片
 * const result = await packer.validate('/path/to/card.card');
 *
 * // 读取元数据
 * const metadata = await packer.getMetadata('/path/to/card.card');
 * ```
 */
export class CardPacker implements ICardPacker {
  private zipProcessor: ZIPProcessor;
  private fs: FileSystemAdapter;
  private yamlParser: YAMLParser;

  /**
   * 创建卡片打包器实例
   * @param zipProcessor - ZIP 处理器实例
   * @param fileSystem - 文件系统适配器
   */
  constructor(zipProcessor: ZIPProcessor, fileSystem: FileSystemAdapter) {
    this.zipProcessor = zipProcessor;
    this.fs = fileSystem;
    this.yamlParser = new YAMLParser();
  }

  /**
   * 将卡片文件夹打包为 .card 文件
   *
   * @description
   * 打包时遍历源文件夹的所有内容，按照卡片格式规范组织目录结构，
   * 使用零压缩模式创建 ZIP 文件。.card 配置文件夹最先添加，
   * 保证元数据文件在 ZIP 的前端，方便快速访问。
   *
   * @param sourceDir - 源文件夹路径
   * @param targetPath - 目标 .card 文件路径
   * @param options - 打包选项
   * @returns 打包结果
   *
   * @throws {FileError} 当源目录不存在或不是有效的卡片结构时
   */
  async pack(
    sourceDir: string,
    targetPath: string,
    options: PackOptions = {}
  ): Promise<PackResult> {
    const startTime = Date.now();
    const { validate = true, checksum = false, includeHidden = false } = options;

    // 检查源目录是否存在
    if (!(await this.fs.exists(sourceDir))) {
      throw new FileError(
        ErrorCodes.FILE_NOT_FOUND,
        sourceDir,
        'Source directory not found'
      );
    }

    // 检查是否为目录
    if (!(await this.fs.isDirectory(sourceDir))) {
      throw new FileError(
        ErrorCodes.INVALID_FILE_FORMAT,
        sourceDir,
        'Source path is not a directory'
      );
    }

    // 验证结构（如果启用）
    if (validate) {
      const validationResult = await this.validateDirectory(sourceDir);
      if (!validationResult.valid) {
        throw new FileError(
          ErrorCodes.INVALID_FILE_FORMAT,
          sourceDir,
          `Card structure validation failed: ${validationResult.checks
            .filter((c) => !c.passed)
            .map((c) => c.message)
            .join(', ')}`
        );
      }
    }

    // 收集文件
    const files: FileData[] = [];
    await this.collectFiles(sourceDir, '', files, includeHidden);

    // 按照卡片规范排序文件（.card 目录优先）
    this.sortCardFiles(files);

    // 创建零压缩 ZIP
    const zipData = await this.zipProcessor.create(files, { store: true });

    // 确保目标目录存在
    const targetDir = this.fs.dirname(targetPath);
    if (!(await this.fs.exists(targetDir))) {
      await this.fs.mkdir(targetDir, { recursive: true });
    }

    // 写入文件
    await this.fs.writeFile(targetPath, zipData);

    // 计算校验值（如果启用）
    let checksumValue: string | undefined;
    if (checksum) {
      checksumValue = await this.calculateChecksum(zipData);
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      outputPath: targetPath,
      fileSize: zipData.length,
      fileCount: files.length,
      duration,
      checksum: checksumValue,
    };
  }

  /**
   * 将 .card 文件解包为文件夹
   *
   * @description
   * 将 .card 文件作为 ZIP 文件解压到指定目录，
   * 解压后的文件夹结构与打包前完全一致。
   *
   * @param cardPath - .card 文件路径
   * @param targetDir - 目标目录路径
   * @param options - 解包选项
   * @returns 解包结果
   *
   * @throws {FileError} 当 .card 文件不存在或格式无效时
   */
  async unpack(
    cardPath: string,
    targetDir: string,
    options: UnpackOptions = {}
  ): Promise<UnpackResult> {
    const startTime = Date.now();
    const { overwrite = false, validate = true } = options;

    // 检查文件是否存在
    if (!(await this.fs.exists(cardPath))) {
      throw new FileError(ErrorCodes.FILE_NOT_FOUND, cardPath, 'Card file not found');
    }

    // 检查目标目录
    if (await this.fs.exists(targetDir)) {
      if (!overwrite) {
        throw new FileError(
          ErrorCodes.RESOURCE_ALREADY_EXISTS,
          targetDir,
          'Target directory already exists'
        );
      }
      // 删除已存在的目录
      await this.fs.rmdir(targetDir, { recursive: true });
    }

    // 读取 .card 文件
    const cardData = await this.fs.readFile(cardPath);

    // 验证是否为有效的 ZIP 文件
    const isValid = await this.zipProcessor.validate(cardData);
    if (!isValid) {
      throw new FileError(
        ErrorCodes.INVALID_FILE_FORMAT,
        cardPath,
        'Invalid card file format (not a valid ZIP)'
      );
    }

    // 解压文件
    const extractedFiles = await this.zipProcessor.extract(cardData);

    // 创建目标目录
    await this.fs.mkdir(targetDir, { recursive: true });

    // 写入文件
    let fileCount = 0;
    for (const [filePath, content] of extractedFiles) {
      const fullPath = this.fs.join(targetDir, filePath);
      const dir = this.fs.dirname(fullPath);

      // 创建目录
      if (!(await this.fs.exists(dir))) {
        await this.fs.mkdir(dir, { recursive: true });
      }

      // 写入文件
      await this.fs.writeFile(fullPath, content);
      fileCount++;
    }

    const duration = Date.now() - startTime;

    // 验证解压结果（如果启用）
    let validation: CardValidationResult | undefined;
    if (validate) {
      validation = await this.validateDirectory(targetDir);
    }

    return {
      success: true,
      outputDir: targetDir,
      fileCount,
      duration,
      validation,
    };
  }

  /**
   * 验证卡片结构
   *
   * @description
   * 检查卡片是否包含必需的文件和目录，验证配置文件的格式是否正确。
   * 支持验证文件夹或 .card 文件。
   *
   * @param cardPath - .card 文件路径或文件夹路径
   * @param options - 验证选项
   * @returns 验证结果
   */
  async validate(
    cardPath: string,
    options: ValidationOptions = {}
  ): Promise<CardValidationResult> {
    // 检查路径是否存在
    if (!(await this.fs.exists(cardPath))) {
      throw new FileError(ErrorCodes.FILE_NOT_FOUND, cardPath, 'Path not found');
    }

    // 判断是目录还是文件
    const isDir = await this.fs.isDirectory(cardPath);

    if (isDir) {
      return this.validateDirectory(cardPath, options);
    } else {
      return this.validateCardFile(cardPath, options);
    }
  }

  /**
   * 读取卡片元数据
   *
   * @description
   * 直接从 .card 文件中提取 metadata.yaml 的内容，
   * 不需要解压整个卡片，内存占用极小。
   *
   * @param cardPath - .card 文件路径
   * @returns 卡片元数据
   *
   * @throws {FileError} 当文件不存在或元数据文件不存在时
   */
  async getMetadata(cardPath: string): Promise<CardMetadata> {
    // 检查文件是否存在
    if (!(await this.fs.exists(cardPath))) {
      throw new FileError(ErrorCodes.FILE_NOT_FOUND, cardPath, 'Card file not found');
    }

    // 读取文件
    const cardData = await this.fs.readFile(cardPath);

    // 提取 metadata.yaml
    const metadataPath = `${DEFAULT_CARD_STRUCTURE.configDir}/metadata.yaml`;

    try {
      const metadataContent = await this.zipProcessor.extractText(cardData, metadataPath);
      const metadata = this.yamlParser.parse<CardMetadata>(metadataContent);
      return metadata;
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(
        ErrorCodes.FILE_READ_ERROR,
        cardPath,
        'Failed to read card metadata',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 验证目录结构
   */
  private async validateDirectory(
    dirPath: string,
    options: ValidationOptions = {}
  ): Promise<CardValidationResult> {
    const startTime = Date.now();
    const { level = 'full', checkReferences = true } = options;
    const checks: ValidationCheckItem[] = [];

    // 目录验证
    if (level === 'directory' || level === 'full') {
      // 检查 .card 配置目录
      const configDirPath = this.fs.join(dirPath, DEFAULT_CARD_STRUCTURE.configDir);
      const configDirExists = await this.fs.exists(configDirPath);
      checks.push({
        name: 'Config directory exists',
        passed: configDirExists,
        type: 'directory',
        path: DEFAULT_CARD_STRUCTURE.configDir,
        message: configDirExists ? undefined : 'Missing .card configuration directory',
      });

      // 检查 content 目录（可选）
      const contentDirPath = this.fs.join(dirPath, DEFAULT_CARD_STRUCTURE.contentDir);
      const contentDirExists = await this.fs.exists(contentDirPath);
      checks.push({
        name: 'Content directory exists',
        passed: contentDirExists,
        type: 'directory',
        path: DEFAULT_CARD_STRUCTURE.contentDir,
        message: contentDirExists ? undefined : 'Missing content directory (optional)',
      });
    }

    // 文件验证
    if (level === 'file' || level === 'full') {
      // 检查必需文件
      for (const requiredFile of DEFAULT_CARD_STRUCTURE.requiredFiles) {
        const filePath = this.fs.join(
          dirPath,
          DEFAULT_CARD_STRUCTURE.configDir,
          requiredFile
        );
        const fileExists = await this.fs.exists(filePath);
        checks.push({
          name: `Required file: ${requiredFile}`,
          passed: fileExists,
          type: 'file',
          path: `${DEFAULT_CARD_STRUCTURE.configDir}/${requiredFile}`,
          message: fileExists ? undefined : `Missing required file: ${requiredFile}`,
        });

        // 如果是 YAML 文件，验证格式
        if (fileExists && requiredFile.endsWith('.yaml')) {
          try {
            const content = await this.fs.readTextFile(filePath);
            this.yamlParser.parse(content);
            checks.push({
              name: `Format valid: ${requiredFile}`,
              passed: true,
              type: 'format',
              path: `${DEFAULT_CARD_STRUCTURE.configDir}/${requiredFile}`,
            });
          } catch (error) {
            checks.push({
              name: `Format valid: ${requiredFile}`,
              passed: false,
              type: 'format',
              path: `${DEFAULT_CARD_STRUCTURE.configDir}/${requiredFile}`,
              message: `Invalid YAML format: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      }
    }

    // 引用验证
    if ((level === 'reference' || level === 'full') && checkReferences) {
      // TODO: 实现资源引用验证
      // 解析配置文件中的资源引用，检查对应的文件是否存在
    }

    const duration = Date.now() - startTime;
    const errorCount = checks.filter((c) => !c.passed && c.type !== 'directory').length;
    const warningCount = checks.filter(
      (c) => !c.passed && c.type === 'directory' && c.path !== DEFAULT_CARD_STRUCTURE.configDir
    ).length;

    return {
      valid: errorCount === 0 && checks.some((c) => c.path === DEFAULT_CARD_STRUCTURE.configDir && c.passed),
      checks,
      errorCount,
      warningCount,
      duration,
    };
  }

  /**
   * 验证 .card 文件
   */
  private async validateCardFile(
    cardPath: string,
    options: ValidationOptions = {}
  ): Promise<CardValidationResult> {
    const startTime = Date.now();
    const { level = 'full' } = options;
    const checks: ValidationCheckItem[] = [];

    // 读取文件
    const cardData = await this.fs.readFile(cardPath);

    // 验证 ZIP 格式
    const isValidZip = await this.zipProcessor.validate(cardData);
    checks.push({
      name: 'Valid ZIP format',
      passed: isValidZip,
      type: 'format',
      message: isValidZip ? undefined : 'Invalid ZIP file format',
    });

    if (!isValidZip) {
      return {
        valid: false,
        checks,
        errorCount: 1,
        warningCount: 0,
        duration: Date.now() - startTime,
      };
    }

    // 获取文件列表
    const entries = await this.zipProcessor.list(cardData);
    const filePaths = entries.map((e) => e.path);

    // 检查目录结构
    if (level === 'directory' || level === 'full') {
      const hasConfigDir = filePaths.some((p) =>
        p.startsWith(`${DEFAULT_CARD_STRUCTURE.configDir}/`)
      );
      checks.push({
        name: 'Config directory exists',
        passed: hasConfigDir,
        type: 'directory',
        path: DEFAULT_CARD_STRUCTURE.configDir,
        message: hasConfigDir ? undefined : 'Missing .card configuration directory',
      });
    }

    // 检查必需文件
    if (level === 'file' || level === 'full') {
      for (const requiredFile of DEFAULT_CARD_STRUCTURE.requiredFiles) {
        const expectedPath = `${DEFAULT_CARD_STRUCTURE.configDir}/${requiredFile}`;
        const fileExists = filePaths.includes(expectedPath);
        checks.push({
          name: `Required file: ${requiredFile}`,
          passed: fileExists,
          type: 'file',
          path: expectedPath,
          message: fileExists ? undefined : `Missing required file: ${requiredFile}`,
        });

        // 验证 YAML 格式
        if (fileExists && requiredFile.endsWith('.yaml')) {
          try {
            const content = await this.zipProcessor.extractText(cardData, expectedPath);
            this.yamlParser.parse(content);
            checks.push({
              name: `Format valid: ${requiredFile}`,
              passed: true,
              type: 'format',
              path: expectedPath,
            });
          } catch (error) {
            checks.push({
              name: `Format valid: ${requiredFile}`,
              passed: false,
              type: 'format',
              path: expectedPath,
              message: `Invalid YAML format: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    const errorCount = checks.filter((c) => !c.passed && c.type !== 'directory').length;
    const warningCount = checks.filter(
      (c) => !c.passed && c.type === 'directory' && c.path !== DEFAULT_CARD_STRUCTURE.configDir
    ).length;

    return {
      valid: errorCount === 0 && checks.some((c) => c.name === 'Config directory exists' && c.passed),
      checks,
      errorCount,
      warningCount,
      duration,
    };
  }

  /**
   * 递归收集目录中的所有文件
   */
  private async collectFiles(
    baseDir: string,
    relativePath: string,
    files: FileData[],
    includeHidden: boolean
  ): Promise<void> {
    const currentPath = relativePath
      ? this.fs.join(baseDir, relativePath)
      : baseDir;
    const entries = await this.fs.readDir(currentPath);

    for (const entry of entries) {
      // 跳过隐藏文件（以 . 开头，但 .card 目录除外）
      if (!includeHidden && entry.startsWith('.') && entry !== '.card') {
        continue;
      }

      const entryRelativePath = relativePath
        ? this.fs.join(relativePath, entry)
        : entry;
      const entryFullPath = this.fs.join(baseDir, entryRelativePath);

      if (await this.fs.isDirectory(entryFullPath)) {
        // 递归处理子目录
        await this.collectFiles(baseDir, entryRelativePath, files, includeHidden);
      } else {
        // 读取文件内容
        const content = await this.fs.readFile(entryFullPath);
        files.push({
          path: entryRelativePath,
          content,
        });
      }
    }
  }

  /**
   * 按卡片规范排序文件
   * .card 目录的文件优先，确保元数据在 ZIP 文件的前端
   */
  private sortCardFiles(files: FileData[]): void {
    files.sort((a, b) => {
      const aIsConfig = a.path.startsWith(DEFAULT_CARD_STRUCTURE.configDir);
      const bIsConfig = b.path.startsWith(DEFAULT_CARD_STRUCTURE.configDir);

      if (aIsConfig && !bIsConfig) return -1;
      if (!aIsConfig && bIsConfig) return 1;

      // 在 .card 目录内，metadata.yaml 优先
      if (aIsConfig && bIsConfig) {
        const aIsMetadata = a.path.includes('metadata.yaml');
        const bIsMetadata = b.path.includes('metadata.yaml');
        if (aIsMetadata && !bIsMetadata) return -1;
        if (!aIsMetadata && bIsMetadata) return 1;
      }

      return a.path.localeCompare(b.path);
    });
  }

  /**
   * 计算校验值
   */
  private async calculateChecksum(data: Uint8Array): Promise<string> {
    // 使用 Web Crypto API 计算 SHA-256
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // 备用方案：简单的校验和
    let sum = 0;
    for (const byte of data) {
      sum = (sum + byte) & 0xffffffff;
    }
    return sum.toString(16).padStart(8, '0');
  }
}
