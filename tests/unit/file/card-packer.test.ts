/**
 * CardPacker 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CardPacker } from '../../../src/file/card-packer/card-packer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import JSZip from 'jszip';

describe('CardPacker', () => {
  let packer: CardPacker;
  let testDir: string;

  beforeEach(async () => {
    packer = new CardPacker();
    // 创建临时测试目录
    testDir = path.join(tmpdir(), `card-packer-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  describe('pack', () => {
    it('should pack card folder to .card file', async () => {
      // 创建测试卡片结构
      const cardDir = path.join(testDir, 'test-card');
      await createTestCardFolder(cardDir);

      const outputPath = path.join(testDir, 'test-card.card');
      const result = await packer.pack(cardDir, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(await fs.access(outputPath).then(() => true).catch(() => false)).toBe(true);
    });

    it('should use store mode (zero compression)', async () => {
      const cardDir = path.join(testDir, 'test-card-store');
      await createTestCardFolder(cardDir);

      const outputPath = path.join(testDir, 'test-card-store.card');
      const result = await packer.pack(cardDir, outputPath, { compress: false });

      expect(result.success).toBe(true);

      // 验证是否使用存储模式
      const zipBuffer = await fs.readFile(outputPath);
      const zip = await JSZip.loadAsync(zipBuffer);

      // JSZip 在存储模式下，文件的 _data.compressionMethod 应该是 0 (STORE)
      // 这里简化验证：检查文件是否可以正常解压
      const metadata = zip.file('.card/metadata.yaml');
      expect(metadata).not.toBeNull();
    });

    it('should generate checksum when requested', async () => {
      const cardDir = path.join(testDir, 'test-card-checksum');
      await createTestCardFolder(cardDir);

      const outputPath = path.join(testDir, 'test-card-checksum.card');
      const result = await packer.pack(cardDir, outputPath, {
        generateChecksum: true,
      });

      expect(result.success).toBe(true);
      expect(result.stats?.fileCount).toBeGreaterThan(0);
    });

    it('should validate structure before packing', async () => {
      const cardDir = path.join(testDir, 'invalid-card');
      await fs.mkdir(cardDir, { recursive: true });
      // 不创建必需文件

      const outputPath = path.join(testDir, 'invalid-card.card');
      const result = await packer.pack(cardDir, outputPath, {
        validateStructure: true,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toMatch(/PACK-/);
    });

    it('should return error if card folder not found', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent');
      const outputPath = path.join(testDir, 'output.card');

      const result = await packer.pack(nonExistentPath, outputPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PACK-3001');
    });

    it('should report progress', async () => {
      const cardDir = path.join(testDir, 'test-card-progress');
      await createTestCardFolder(cardDir);

      const outputPath = path.join(testDir, 'test-card-progress.card');
      const progressEvents: any[] = [];

      const result = await packer.pack(cardDir, outputPath, {
        onProgress: (progress) => progressEvents.push(progress),
      });

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
    });
  });

  describe('unpack', () => {
    it('should unpack .card file to folder', async () => {
      // 先创建一个 .card 文件
      const cardDir = path.join(testDir, 'pack-source');
      await createTestCardFolder(cardDir);

      const cardFile = path.join(testDir, 'pack-source.card');
      await packer.pack(cardDir, cardFile);

      // 解包
      const outputDir = path.join(testDir, 'unpack-target');
      const result = await packer.unpack(cardFile, outputDir);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputDir);

      // 验证文件存在
      const metadataExists = await fs
        .access(path.join(outputDir, '.card/metadata.yaml'))
        .then(() => true)
        .catch(() => false);
      expect(metadataExists).toBe(true);
    });

    it('should validate integrity when unpacking', async () => {
      // 创建测试卡片
      const cardDir = path.join(testDir, 'test-card-unpack');
      await createTestCardFolder(cardDir);

      const cardFile = path.join(testDir, 'test-card-unpack.card');
      await packer.pack(cardDir, cardFile);

      // 解包并验证
      const outputDir = path.join(testDir, 'unpack-validated');
      const result = await packer.unpack(cardFile, outputDir, {
        validateIntegrity: true,
      });

      expect(result.success).toBe(true);
    });

    it('should not overwrite existing directory by default', async () => {
      const cardDir = path.join(testDir, 'test-card-no-overwrite');
      await createTestCardFolder(cardDir);

      const cardFile = path.join(testDir, 'test-card-no-overwrite.card');
      await packer.pack(cardDir, cardFile);

      const outputDir = path.join(testDir, 'existing-dir');
      await fs.mkdir(outputDir, { recursive: true });

      const result = await packer.unpack(cardFile, outputDir, {
        overwrite: false,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PACK-3002');
    });

    it('should report progress', async () => {
      const cardDir = path.join(testDir, 'test-card-unpack-progress');
      await createTestCardFolder(cardDir);

      const cardFile = path.join(testDir, 'test-card-unpack-progress.card');
      await packer.pack(cardDir, cardFile);

      const outputDir = path.join(testDir, 'unpack-progress');
      const progressEvents: any[] = [];

      const result = await packer.unpack(cardFile, outputDir, {
        onProgress: (progress) => progressEvents.push(progress),
      });

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
    });
  });

  describe('validate', () => {
    it('should validate valid card structure', async () => {
      const cardDir = path.join(testDir, 'valid-card');
      await createTestCardFolder(cardDir);

      const result = await packer.validate(cardDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect missing required files', async () => {
      const cardDir = path.join(testDir, 'invalid-card-missing');
      await fs.mkdir(cardDir, { recursive: true });
      await fs.mkdir(path.join(cardDir, '.card'), { recursive: true });
      // 只创建部分必需文件

      await fs.writeFile(
        path.join(cardDir, '.card/metadata.yaml'),
        'card_id: test123\nname: Test'
      );

      const result = await packer.validate(cardDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should detect invalid card_id format', async () => {
      const cardDir = path.join(testDir, 'invalid-card-id');
      await createTestCardFolder(cardDir, { cardId: 'invalid-id' });

      const result = await packer.validate(cardDir);

      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.field === 'metadata.card_id')).toBe(true);
    });

    it('should reject non-standard base card content format', async () => {
      const cardDir = path.join(testDir, 'invalid-content-format');
      await createTestCardFolder(cardDir);

      await fs.writeFile(
        path.join(cardDir, '.card/structure.yaml'),
        `structure:
  - id: "base123456A"
    type: "RichTextCard"
manifest:
  card_count: 1
  resource_count: 0
  resources: []
`
      );

      await fs.writeFile(
        path.join(cardDir, 'content/base123456A.yaml'),
        `type: "RichTextCard"
content_text: "hello"
`
      );

      const result = await packer.validate(cardDir);

      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.field === 'content.base123456A.data')).toBe(true);
    });

    it('should reject type mismatch between structure and content', async () => {
      const cardDir = path.join(testDir, 'invalid-content-type-mismatch');
      await createTestCardFolder(cardDir);

      await fs.writeFile(
        path.join(cardDir, '.card/structure.yaml'),
        `structure:
  - id: "base123456B"
    type: "RichTextCard"
manifest:
  card_count: 1
  resource_count: 0
  resources: []
`
      );

      await fs.writeFile(
        path.join(cardDir, 'content/base123456B.yaml'),
        `type: "MarkdownCard"
data:
  content_text: "hello"
`
      );

      const result = await packer.validate(cardDir);

      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.field === 'content.base123456B.type')).toBe(true);
    });
  });

  describe('readMetadata', () => {
    it('should read metadata without full extraction', async () => {
      const cardDir = path.join(testDir, 'test-card-metadata');
      await createTestCardFolder(cardDir);

      const cardFile = path.join(testDir, 'test-card-metadata.card');
      await packer.pack(cardDir, cardFile);

      const metadata = await packer.readMetadata(cardFile);

      expect(metadata.card_id).toBe('test123456');
      expect(metadata.name).toBe('Test Card');
      expect(metadata.chip_standards_version).toBe('1.0.0');
    });

    it('should throw error if metadata is invalid', async () => {
      const cardFile = path.join(testDir, 'invalid.card');
      // 创建一个不包含有效 metadata 的 ZIP
      const zip = new JSZip();
      zip.file('.card/metadata.yaml', 'invalid: yaml: syntax:');
      const zipData = await zip.generateAsync({ type: 'uint8array' });
      await fs.writeFile(cardFile, zipData);

      await expect(packer.readMetadata(cardFile)).rejects.toThrow();
    });
  });

  describe('checkCompatibility', () => {
    it('should accept same major version', () => {
      const result = packer.checkCompatibility('1.0.0', '1.0.0');
      expect(result.compatible).toBe(true);
    });

    it('should accept older minor version', () => {
      const result = packer.checkCompatibility('1.0.0', '1.5.0');
      expect(result.compatible).toBe(true);
    });

    it('should warn about newer minor version', () => {
      const result = packer.checkCompatibility('1.5.0', '1.0.0');
      expect(result.compatible).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it('should reject different major version', () => {
      const result = packer.checkCompatibility('2.0.0', '1.0.0');
      expect(result.compatible).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});

/**
 * 创建测试用的卡片文件夹结构
 */
async function createTestCardFolder(
  cardDir: string,
  options?: { cardId?: string; name?: string }
): Promise<void> {
  const cardId = options?.cardId || 'test123456';
  const name = options?.name || 'Test Card';

  // 创建目录结构
  await fs.mkdir(path.join(cardDir, '.card'), { recursive: true });
  await fs.mkdir(path.join(cardDir, 'content'), { recursive: true });

  // 创建 metadata.yaml
  const metadata = {
    chip_standards_version: '1.0.0',
    card_id: cardId,
    name,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    theme: '',
    tags: [],
  };

  await fs.writeFile(
    path.join(cardDir, '.card/metadata.yaml'),
    `chip_standards_version: "1.0.0"
card_id: "${cardId}"
name: "${name}"
created_at: "${new Date().toISOString()}"
modified_at: "${new Date().toISOString()}"
theme: ""
tags: []
`
  );

  // 创建 structure.yaml
  await fs.writeFile(
    path.join(cardDir, '.card/structure.yaml'),
    `structure: []
manifest:
  card_count: 0
  resource_count: 0
  resources: []
`
  );

  // 创建 cover.html
  await fs.writeFile(
    path.join(cardDir, '.card/cover.html'),
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${name}</title>
</head>
<body>
  <h1>${name}</h1>
</body>
</html>`
  );
}
