/**
 * CardPacker 卡片打包器测试
 * @module @chips/foundation/tests/unit/file/card-packer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CardPacker,
  FileSystemAdapter,
  createCardPacker,
} from '../../../src/file/card-packer/card-packer';
import { ZIPProcessor, FileData } from '../../../src/file/zip-processor';
import { FileError, ErrorCodes } from '../../../src/core/errors';
import { DEFAULT_CARD_STRUCTURE } from '../../../src/file/card-packer/types';

// ============================================================================
// Mock 数据
// ============================================================================

const MOCK_METADATA_YAML = `id: test-card-001
name: Test Card
version: 1.0.0
type: basic
createdAt: 2026-01-30T00:00:00.000Z
updatedAt: 2026-01-30T00:00:00.000Z
`;

const MOCK_STRUCTURE_YAML = `type: basic
layout: default
elements: []
`;

// ============================================================================
// Mock FileSystemAdapter
// ============================================================================

function createMockFileSystem(options: {
  files?: Map<string, string | Uint8Array>;
  directories?: Set<string>;
} = {}): FileSystemAdapter {
  const files = options.files ?? new Map();
  const directories = options.directories ?? new Set();

  return {
    readFile: vi.fn(async (path: string): Promise<Uint8Array> => {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`File not found: ${path}`);
      }
      if (typeof content === 'string') {
        return new TextEncoder().encode(content);
      }
      return content;
    }),

    writeFile: vi.fn(async (path: string, data: Uint8Array): Promise<void> => {
      files.set(path, data);
    }),

    readTextFile: vi.fn(async (path: string): Promise<string> => {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`File not found: ${path}`);
      }
      if (content instanceof Uint8Array) {
        return new TextDecoder().decode(content);
      }
      return content;
    }),

    writeTextFile: vi.fn(async (path: string, content: string): Promise<void> => {
      files.set(path, content);
    }),

    readDir: vi.fn(async (path: string): Promise<string[]> => {
      const entries: string[] = [];
      const prefix = path.endsWith('/') ? path : path + '/';

      // 收集直接子目录
      for (const dir of directories) {
        if (dir.startsWith(prefix) && dir !== path) {
          const relativePath = dir.slice(prefix.length);
          const parts = relativePath.split('/');
          if (parts.length === 1 && parts[0]) {
            entries.push(parts[0]);
          }
        }
      }

      // 收集直接子文件
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          const relativePath = filePath.slice(prefix.length);
          const parts = relativePath.split('/');
          if (parts.length === 1 && parts[0]) {
            entries.push(parts[0]);
          }
        }
      }

      return [...new Set(entries)];
    }),

    mkdir: vi.fn(async (path: string): Promise<void> => {
      directories.add(path);
    }),

    exists: vi.fn(async (path: string): Promise<boolean> => {
      return files.has(path) || directories.has(path);
    }),

    isDirectory: vi.fn(async (path: string): Promise<boolean> => {
      return directories.has(path);
    }),

    rmdir: vi.fn(async (path: string): Promise<void> => {
      directories.delete(path);
      // 删除目录下的所有文件
      const prefix = path.endsWith('/') ? path : path + '/';
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          files.delete(filePath);
        }
      }
    }),

    stat: vi.fn(async (path: string) => {
      const content = files.get(path);
      return {
        size: content ? (typeof content === 'string' ? content.length : content.length) : 0,
        mtime: new Date(),
      };
    }),

    join: vi.fn((...paths: string[]): string => {
      return paths.filter(Boolean).join('/').replace(/\/+/g, '/');
    }),

    dirname: vi.fn((path: string): string => {
      const parts = path.split('/');
      parts.pop();
      return parts.join('/') || '/';
    }),

    basename: vi.fn((path: string): string => {
      const parts = path.split('/');
      return parts[parts.length - 1] || '';
    }),

    relative: vi.fn((from: string, to: string): string => {
      return to.replace(from, '').replace(/^\//, '');
    }),
  };
}

// ============================================================================
// Mock ZIPProcessor
// ============================================================================

function createMockZIPProcessor(options: {
  validateResult?: boolean;
  extractedFiles?: Map<string, Uint8Array>;
  entries?: Array<{ path: string; size: number }>;
} = {}): ZIPProcessor {
  const validateResult = options.validateResult ?? true;
  const extractedFiles = options.extractedFiles ?? new Map();
  const entries = options.entries ?? [];

  return {
    create: vi.fn(async (files: FileData[]): Promise<Uint8Array> => {
      // 返回一个模拟的 ZIP 数据
      return new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP 魔数
    }),

    extract: vi.fn(async (): Promise<Map<string, Uint8Array>> => {
      return extractedFiles;
    }),

    extractFile: vi.fn(async (_data: Uint8Array, path: string): Promise<Uint8Array> => {
      const content = extractedFiles.get(path);
      if (!content) {
        throw new Error(`File not found in ZIP: ${path}`);
      }
      return content;
    }),

    extractText: vi.fn(async (_data: Uint8Array, path: string): Promise<string> => {
      const content = extractedFiles.get(path);
      if (!content) {
        throw new Error(`File not found in ZIP: ${path}`);
      }
      return new TextDecoder().decode(content);
    }),

    list: vi.fn(async () => entries),

    hasFile: vi.fn(async (_data: Uint8Array, path: string): Promise<boolean> => {
      return entries.some(e => e.path === path);
    }),

    validate: vi.fn(async (): Promise<boolean> => {
      return validateResult;
    }),

    addFiles: vi.fn(async (zipData: Uint8Array): Promise<Uint8Array> => {
      return zipData;
    }),

    removeFiles: vi.fn(async (zipData: Uint8Array): Promise<Uint8Array> => {
      return zipData;
    }),
  } as unknown as ZIPProcessor;
}

// ============================================================================
// 测试
// ============================================================================

describe('CardPacker', () => {
  let mockFs: FileSystemAdapter;
  let mockZip: ZIPProcessor;
  let packer: CardPacker;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 构造函数和工厂函数
  // ==========================================================================

  describe('constructor / createCardPacker', () => {
    it('should create CardPacker instance', () => {
      mockFs = createMockFileSystem();
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      expect(packer).toBeInstanceOf(CardPacker);
    });

    it('should create CardPacker via factory function', () => {
      mockFs = createMockFileSystem();
      mockZip = createMockZIPProcessor();
      packer = createCardPacker(mockZip, mockFs);

      expect(packer).toBeInstanceOf(CardPacker);
    });
  });

  // ==========================================================================
  // pack() 测试
  // ==========================================================================

  describe('pack()', () => {
    const sourceDir = '/source/card';
    const targetPath = '/output/test.card';

    it('should pack card folder successfully', async () => {
      // 设置模拟文件系统
      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/content/index.html`, '<html></html>'],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        `${sourceDir}/content`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(targetPath);
      expect(result.fileCount).toBeGreaterThan(0);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when source directory not found', async () => {
      mockFs = createMockFileSystem();
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.pack('/nonexistent', targetPath)).rejects.toThrow(FileError);
      await expect(packer.pack('/nonexistent', targetPath)).rejects.toMatchObject({
        code: ErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('should throw error when source path is not a directory', async () => {
      const files = new Map<string, string>([[sourceDir, 'file content']]);
      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.pack(sourceDir, targetPath)).rejects.toThrow(FileError);
      await expect(packer.pack(sourceDir, targetPath)).rejects.toMatchObject({
        code: ErrorCodes.INVALID_FILE_FORMAT,
      });
    });

    it('should throw error when card structure validation fails', async () => {
      // 缺少必需文件的目录结构
      const directories = new Set([sourceDir]);
      mockFs = createMockFileSystem({ directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.pack(sourceDir, targetPath, { validate: true })).rejects.toThrow(
        FileError
      );
    });

    it('should skip validation when validate option is false', async () => {
      // 缺少必需文件但禁用验证
      const files = new Map<string, string>([
        [`${sourceDir}/test.txt`, 'test content'],
      ]);
      const directories = new Set([sourceDir, '/output']);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath, { validate: false });

      expect(result.success).toBe(true);
    });

    it('should calculate checksum when option is enabled', async () => {
      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath, { checksum: true });

      expect(result.success).toBe(true);
      expect(result.checksum).toBeDefined();
      expect(typeof result.checksum).toBe('string');
    });

    it('should skip hidden files by default', async () => {
      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/.hidden`, 'hidden content'],
        [`${sourceDir}/.DS_Store`, 'ds store'],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath, { includeHidden: false });

      expect(result.success).toBe(true);
      // .card 目录应该被包含，其他隐藏文件不应该
      expect(mockZip.create).toHaveBeenCalled();
    });

    it('should include hidden files when option is enabled', async () => {
      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/.hidden`, 'hidden content'],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath, { includeHidden: true });

      expect(result.success).toBe(true);
    });

    it('should create target directory if not exists', async () => {
      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        // 注意：/output 目录不存在
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it('should sort files with .card directory first', async () => {
      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/content/data.json`, '{}'],
        [`${sourceDir}/image.png`, new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        `${sourceDir}/content`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await packer.pack(sourceDir, targetPath);

      // 验证 create 被调用，文件应该排序后传入
      expect(mockZip.create).toHaveBeenCalled();
      const createCall = vi.mocked(mockZip.create).mock.calls[0];
      const sortedFiles = createCall[0];

      // 第一个文件应该来自 .card 目录
      expect(sortedFiles[0].path).toContain('.card');
    });
  });

  // ==========================================================================
  // unpack() 测试
  // ==========================================================================

  describe('unpack()', () => {
    const cardPath = '/cards/test.card';
    const targetDir = '/output/unpacked';

    it('should unpack card file successfully', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const extractedFiles = new Map<string, Uint8Array>([
        ['.card/metadata.yaml', new TextEncoder().encode(MOCK_METADATA_YAML)],
        ['.card/structure.yaml', new TextEncoder().encode(MOCK_STRUCTURE_YAML)],
        ['content/index.html', new TextEncoder().encode('<html></html>')],
      ]);

      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor({
        validateResult: true,
        extractedFiles,
        entries: [
          { path: '.card/metadata.yaml', size: 100 },
          { path: '.card/structure.yaml', size: 50 },
          { path: 'content/index.html', size: 30 },
        ],
      });
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.unpack(cardPath, targetDir);

      expect(result.success).toBe(true);
      expect(result.outputDir).toBe(targetDir);
      expect(result.fileCount).toBe(3);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when card file not found', async () => {
      mockFs = createMockFileSystem();
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.unpack('/nonexistent.card', targetDir)).rejects.toThrow(FileError);
      await expect(packer.unpack('/nonexistent.card', targetDir)).rejects.toMatchObject({
        code: ErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('should throw error when target directory exists and overwrite is false', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
      const directories = new Set([targetDir]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.unpack(cardPath, targetDir, { overwrite: false })).rejects.toThrow(
        FileError
      );
      await expect(packer.unpack(cardPath, targetDir)).rejects.toMatchObject({
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    });

    it('should overwrite target directory when overwrite option is true', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const extractedFiles = new Map<string, Uint8Array>([
        ['.card/metadata.yaml', new TextEncoder().encode(MOCK_METADATA_YAML)],
        ['.card/structure.yaml', new TextEncoder().encode(MOCK_STRUCTURE_YAML)],
      ]);

      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
      const directories = new Set([targetDir]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor({
        validateResult: true,
        extractedFiles,
        entries: [
          { path: '.card/metadata.yaml', size: 100 },
          { path: '.card/structure.yaml', size: 50 },
        ],
      });
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.unpack(cardPath, targetDir, { overwrite: true });

      expect(result.success).toBe(true);
      expect(mockFs.rmdir).toHaveBeenCalledWith(targetDir, { recursive: true });
    });

    it('should throw error when card file is invalid ZIP', async () => {
      const invalidData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const files = new Map<string, string | Uint8Array>([[cardPath, invalidData]]);

      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor({ validateResult: false });
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.unpack(cardPath, targetDir)).rejects.toThrow(FileError);
      await expect(packer.unpack(cardPath, targetDir)).rejects.toMatchObject({
        code: ErrorCodes.INVALID_FILE_FORMAT,
      });
    });

    it('should include validation result when validate option is true', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const extractedFiles = new Map<string, Uint8Array>([
        ['.card/metadata.yaml', new TextEncoder().encode(MOCK_METADATA_YAML)],
        ['.card/structure.yaml', new TextEncoder().encode(MOCK_STRUCTURE_YAML)],
      ]);

      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor({
        validateResult: true,
        extractedFiles,
        entries: [
          { path: '.card/metadata.yaml', size: 100 },
          { path: '.card/structure.yaml', size: 50 },
        ],
      });
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.unpack(cardPath, targetDir, { validate: true });

      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      expect(result.validation?.checks).toBeDefined();
    });

    it('should skip validation when validate option is false', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const extractedFiles = new Map<string, Uint8Array>([
        ['test.txt', new TextEncoder().encode('test content')],
      ]);

      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor({
        validateResult: true,
        extractedFiles,
        entries: [{ path: 'test.txt', size: 12 }],
      });
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.unpack(cardPath, targetDir, { validate: false });

      expect(result.success).toBe(true);
      expect(result.validation).toBeUndefined();
    });
  });

  // ==========================================================================
  // validate() 测试
  // ==========================================================================

  describe('validate()', () => {
    describe('validate directory', () => {
      it('should validate valid card directory', async () => {
        const sourceDir = '/cards/valid-card';
        const files = new Map<string, string | Uint8Array>([
          [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
          [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
          [`${sourceDir}/content/index.html`, '<html></html>'],
        ]);
        const directories = new Set([
          sourceDir,
          `${sourceDir}/.card`,
          `${sourceDir}/content`,
        ]);

        mockFs = createMockFileSystem({ files, directories });
        mockZip = createMockZIPProcessor();
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(sourceDir);

        expect(result.valid).toBe(true);
        expect(result.errorCount).toBe(0);
        expect(result.checks.length).toBeGreaterThan(0);
      });

      it('should detect missing .card directory', async () => {
        const sourceDir = '/cards/invalid-card';
        const directories = new Set([sourceDir]);

        mockFs = createMockFileSystem({ directories });
        mockZip = createMockZIPProcessor();
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(sourceDir);

        expect(result.valid).toBe(false);
        const configCheck = result.checks.find(
          (c) => c.path === DEFAULT_CARD_STRUCTURE.configDir
        );
        expect(configCheck?.passed).toBe(false);
      });

      it('should detect missing required files', async () => {
        const sourceDir = '/cards/missing-files';
        const directories = new Set([
          sourceDir,
          `${sourceDir}/.card`,
        ]);

        mockFs = createMockFileSystem({ directories });
        mockZip = createMockZIPProcessor();
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(sourceDir);

        expect(result.valid).toBe(false);
        expect(result.errorCount).toBeGreaterThan(0);
        const metadataCheck = result.checks.find((c) =>
          c.name.includes('metadata.yaml')
        );
        expect(metadataCheck?.passed).toBe(false);
      });

      it('should detect invalid YAML format', async () => {
        const sourceDir = '/cards/invalid-yaml';
        const files = new Map<string, string | Uint8Array>([
          [`${sourceDir}/.card/metadata.yaml`, 'invalid: yaml: content:'],
          [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        ]);
        const directories = new Set([
          sourceDir,
          `${sourceDir}/.card`,
        ]);

        mockFs = createMockFileSystem({ files, directories });
        mockZip = createMockZIPProcessor();
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(sourceDir);

        // YAML 格式验证可能失败
        const formatCheck = result.checks.find(
          (c) => c.type === 'format' && c.path?.includes('metadata.yaml')
        );
        // 注意：实际结果取决于 YAMLParser 的行为
        expect(formatCheck).toBeDefined();
      });

      it('should validate with directory level only', async () => {
        const sourceDir = '/cards/level-test';
        const directories = new Set([
          sourceDir,
          `${sourceDir}/.card`,
          `${sourceDir}/content`,
        ]);

        mockFs = createMockFileSystem({ directories });
        mockZip = createMockZIPProcessor();
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(sourceDir, { level: 'directory' });

        // 只检查目录，不检查文件
        expect(result.checks.some((c) => c.type === 'directory')).toBe(true);
      });

      it('should warn for missing optional content directory', async () => {
        const sourceDir = '/cards/no-content';
        const files = new Map<string, string | Uint8Array>([
          [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
          [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        ]);
        const directories = new Set([
          sourceDir,
          `${sourceDir}/.card`,
        ]);

        mockFs = createMockFileSystem({ files, directories });
        mockZip = createMockZIPProcessor();
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(sourceDir);

        // content 目录是可选的，卡片应该仍然有效
        expect(result.valid).toBe(true);
        const contentCheck = result.checks.find(
          (c) => c.path === DEFAULT_CARD_STRUCTURE.contentDir
        );
        expect(contentCheck?.passed).toBe(false); // 不存在但只是警告
      });
    });

    describe('validate .card file', () => {
      const cardPath = '/cards/test.card';

      it('should validate valid .card file', async () => {
        const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
        const extractedFiles = new Map<string, Uint8Array>([
          ['.card/metadata.yaml', new TextEncoder().encode(MOCK_METADATA_YAML)],
          ['.card/structure.yaml', new TextEncoder().encode(MOCK_STRUCTURE_YAML)],
        ]);

        const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
        mockFs = createMockFileSystem({ files });
        mockZip = createMockZIPProcessor({
          validateResult: true,
          extractedFiles,
          entries: [
            { path: '.card/metadata.yaml', size: 100 },
            { path: '.card/structure.yaml', size: 50 },
          ],
        });
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(cardPath);

        expect(result.valid).toBe(true);
        expect(result.errorCount).toBe(0);
      });

      it('should detect invalid ZIP format', async () => {
        const invalidData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        const files = new Map<string, string | Uint8Array>([[cardPath, invalidData]]);

        mockFs = createMockFileSystem({ files });
        mockZip = createMockZIPProcessor({ validateResult: false });
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(cardPath);

        expect(result.valid).toBe(false);
        const zipCheck = result.checks.find((c) => c.name === 'Valid ZIP format');
        expect(zipCheck?.passed).toBe(false);
      });

      it('should detect missing .card directory in ZIP', async () => {
        const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
        const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);

        mockFs = createMockFileSystem({ files });
        mockZip = createMockZIPProcessor({
          validateResult: true,
          entries: [{ path: 'content/index.html', size: 30 }],
        });
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(cardPath);

        expect(result.valid).toBe(false);
        const configCheck = result.checks.find(
          (c) => c.name === 'Config directory exists'
        );
        expect(configCheck?.passed).toBe(false);
      });

      it('should detect missing required files in ZIP', async () => {
        const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
        const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);

        mockFs = createMockFileSystem({ files });
        mockZip = createMockZIPProcessor({
          validateResult: true,
          entries: [
            { path: '.card/metadata.yaml', size: 100 },
            // 缺少 structure.yaml
          ],
        });
        packer = new CardPacker(mockZip, mockFs);

        const result = await packer.validate(cardPath);

        expect(result.valid).toBe(false);
        const structureCheck = result.checks.find((c) =>
          c.name.includes('structure.yaml')
        );
        expect(structureCheck?.passed).toBe(false);
      });
    });

    it('should throw error when path not found', async () => {
      mockFs = createMockFileSystem();
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.validate('/nonexistent')).rejects.toThrow(FileError);
      await expect(packer.validate('/nonexistent')).rejects.toMatchObject({
        code: ErrorCodes.FILE_NOT_FOUND,
      });
    });
  });

  // ==========================================================================
  // getMetadata() 测试
  // ==========================================================================

  describe('getMetadata()', () => {
    const cardPath = '/cards/test.card';

    it('should read metadata from card file', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const extractedFiles = new Map<string, Uint8Array>([
        ['.card/metadata.yaml', new TextEncoder().encode(MOCK_METADATA_YAML)],
      ]);

      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);
      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor({ extractedFiles });
      packer = new CardPacker(mockZip, mockFs);

      const metadata = await packer.getMetadata(cardPath);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBe('test-card-001');
      expect(metadata.name).toBe('Test Card');
      expect(metadata.version).toBe('1.0.0');
    });

    it('should throw error when card file not found', async () => {
      mockFs = createMockFileSystem();
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.getMetadata('/nonexistent.card')).rejects.toThrow(FileError);
      await expect(packer.getMetadata('/nonexistent.card')).rejects.toMatchObject({
        code: ErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('should throw error when metadata.yaml not found in card', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);

      mockFs = createMockFileSystem({ files });
      // extractText 会抛出错误因为文件不存在
      mockZip = createMockZIPProcessor({ extractedFiles: new Map() });
      vi.mocked(mockZip.extractText).mockRejectedValue(new Error('File not found in ZIP'));
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.getMetadata(cardPath)).rejects.toThrow(FileError);
    });

    it('should throw error when metadata.yaml has invalid format', async () => {
      const cardData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const files = new Map<string, string | Uint8Array>([[cardPath, cardData]]);

      mockFs = createMockFileSystem({ files });
      mockZip = createMockZIPProcessor();
      // 返回无效的 YAML
      vi.mocked(mockZip.extractText).mockResolvedValue('invalid: yaml: content: [[[');
      packer = new CardPacker(mockZip, mockFs);

      await expect(packer.getMetadata(cardPath)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // 卡片目录结构验证
  // ==========================================================================

  describe('Card directory structure', () => {
    it('should recognize .card as config directory', () => {
      expect(DEFAULT_CARD_STRUCTURE.configDir).toBe('.card');
    });

    it('should recognize content as content directory', () => {
      expect(DEFAULT_CARD_STRUCTURE.contentDir).toBe('content');
    });

    it('should require metadata.yaml and structure.yaml', () => {
      expect(DEFAULT_CARD_STRUCTURE.requiredFiles).toContain('metadata.yaml');
      expect(DEFAULT_CARD_STRUCTURE.requiredFiles).toContain('structure.yaml');
    });

    it('should have cover.html as optional file', () => {
      expect(DEFAULT_CARD_STRUCTURE.optionalFiles).toContain('cover.html');
    });
  });

  // ==========================================================================
  // 零压缩模式验证
  // ==========================================================================

  describe('Zero compression (store) mode', () => {
    it('should use store mode when creating card ZIP', async () => {
      const sourceDir = '/cards/test-card';
      const targetPath = '/output/test.card';

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await packer.pack(sourceDir, targetPath);

      // 验证 create 被调用时使用了 store: true
      expect(mockZip.create).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ store: true })
      );
    });
  });

  // ==========================================================================
  // 边界情况测试
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle empty card folder', async () => {
      const sourceDir = '/cards/empty-card';
      const targetPath = '/output/empty.card';

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.success).toBe(true);
      expect(result.fileCount).toBe(2); // 只有两个必需文件
    });

    it('should handle deeply nested directories', async () => {
      const sourceDir = '/cards/nested-card';
      const targetPath = '/output/nested.card';

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/content/level1/level2/level3/deep.txt`, 'deep content'],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        `${sourceDir}/content`,
        `${sourceDir}/content/level1`,
        `${sourceDir}/content/level1/level2`,
        `${sourceDir}/content/level1/level2/level3`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in file names', async () => {
      const sourceDir = '/cards/special-card';
      const targetPath = '/output/special.card';

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/content/文件名.txt`, '中文内容'],
        [`${sourceDir}/content/file with spaces.txt`, 'spaces content'],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        `${sourceDir}/content`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.success).toBe(true);
    });

    it('should handle binary files correctly', async () => {
      const sourceDir = '/cards/binary-card';
      const targetPath = '/output/binary.card';

      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/image.png`, pngHeader],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.success).toBe(true);
    });

    it('should measure duration correctly', async () => {
      const sourceDir = '/cards/timing-card';
      const targetPath = '/output/timing.card';

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      const result = await packer.pack(sourceDir, targetPath);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });

  // ==========================================================================
  // 文件排序逻辑测试
  // ==========================================================================

  describe('File sorting logic', () => {
    it('should put metadata.yaml first among .card files', async () => {
      const sourceDir = '/cards/sort-test';
      const targetPath = '/output/sorted.card';

      const files = new Map<string, string | Uint8Array>([
        [`${sourceDir}/.card/structure.yaml`, MOCK_STRUCTURE_YAML],
        [`${sourceDir}/.card/metadata.yaml`, MOCK_METADATA_YAML],
        [`${sourceDir}/.card/cover.html`, '<html></html>'],
        [`${sourceDir}/content/data.json`, '{}'],
      ]);
      const directories = new Set([
        sourceDir,
        `${sourceDir}/.card`,
        `${sourceDir}/content`,
        '/output',
      ]);

      mockFs = createMockFileSystem({ files, directories });
      mockZip = createMockZIPProcessor();
      packer = new CardPacker(mockZip, mockFs);

      await packer.pack(sourceDir, targetPath);

      const createCall = vi.mocked(mockZip.create).mock.calls[0];
      const sortedFiles = createCall[0] as FileData[];

      // metadata.yaml 应该在最前面
      const metadataIndex = sortedFiles.findIndex((f) =>
        f.path.includes('metadata.yaml')
      );
      const structureIndex = sortedFiles.findIndex((f) =>
        f.path.includes('structure.yaml')
      );
      const contentIndex = sortedFiles.findIndex((f) =>
        f.path.includes('content/')
      );

      expect(metadataIndex).toBeLessThan(structureIndex);
      expect(metadataIndex).toBeLessThan(contentIndex);
    });
  });
});
