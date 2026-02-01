/**
 * ZIPProcessor 测试
 */

import { describe, it, expect } from 'vitest';
import { ZIPProcessor, zipProcessor } from '../../../src/file/zip-processor';

describe('ZIPProcessor', () => {
  const processor = new ZIPProcessor();

  describe('create', () => {
    it('should create empty ZIP', async () => {
      const zip = await processor.create([]);
      expect(zip).toBeInstanceOf(Uint8Array);
      expect(zip.length).toBeGreaterThan(0);
    });

    it('should create ZIP with text files', async () => {
      const zip = await processor.create([
        { path: 'test.txt', content: 'Hello World' },
        { path: 'folder/nested.txt', content: 'Nested content' },
      ]);

      expect(zip).toBeInstanceOf(Uint8Array);

      // 验证可以列出文件
      const entries = await processor.list(zip);
      const paths = entries.map((e) => e.path);
      expect(paths).toContain('test.txt');
      expect(paths).toContain('folder/nested.txt');
    });

    it('should create ZIP with binary files', async () => {
      const binaryContent = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const zip = await processor.create([
        { path: 'binary.bin', content: binaryContent },
      ]);

      const extracted = await processor.extractFile(zip, 'binary.bin');
      expect(extracted).toEqual(binaryContent);
    });

    it('should create store ZIP (no compression)', async () => {
      const zip = await processor.create(
        [{ path: 'test.txt', content: 'Hello World' }],
        { store: true }
      );
      expect(zip).toBeInstanceOf(Uint8Array);
    });
  });

  describe('extract', () => {
    it('should extract all files', async () => {
      const zip = await processor.create([
        { path: 'a.txt', content: 'A' },
        { path: 'b.txt', content: 'B' },
      ]);

      const extracted = await processor.extract(zip);
      expect(extracted.size).toBe(2);
      expect(extracted.has('a.txt')).toBe(true);
      expect(extracted.has('b.txt')).toBe(true);
    });

    it('should extract specific files', async () => {
      const zip = await processor.create([
        { path: 'a.txt', content: 'A' },
        { path: 'b.txt', content: 'B' },
      ]);

      const extracted = await processor.extract(zip, { files: ['a.txt'] });
      expect(extracted.size).toBe(1);
      expect(extracted.has('a.txt')).toBe(true);
    });
  });

  describe('extractFile', () => {
    it('should extract single file', async () => {
      const zip = await processor.create([
        { path: 'test.txt', content: 'Hello World' },
      ]);

      const content = await processor.extractFile(zip, 'test.txt');
      const text = new TextDecoder().decode(content);
      expect(text).toBe('Hello World');
    });

    it('should throw for non-existent file', async () => {
      const zip = await processor.create([]);

      await expect(processor.extractFile(zip, 'nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('extractText', () => {
    it('should extract text file as string', async () => {
      const zip = await processor.create([
        { path: 'test.txt', content: 'Hello World' },
      ]);

      const text = await processor.extractText(zip, 'test.txt');
      expect(text).toBe('Hello World');
    });
  });

  describe('list', () => {
    it('should list all entries', async () => {
      const zip = await processor.create([
        { path: 'a.txt', content: 'A' },
        { path: 'folder/b.txt', content: 'B' },
      ]);

      const entries = await processor.list(zip);
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw for invalid ZIP', async () => {
      const invalid = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      await expect(processor.list(invalid)).rejects.toThrow();
    });
  });

  describe('hasFile', () => {
    it('should return true for existing file', async () => {
      const zip = await processor.create([
        { path: 'test.txt', content: 'Hello' },
      ]);

      expect(await processor.hasFile(zip, 'test.txt')).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const zip = await processor.create([]);
      expect(await processor.hasFile(zip, 'nonexistent.txt')).toBe(false);
    });
  });

  describe('addFiles', () => {
    it('should add files to existing ZIP', async () => {
      let zip = await processor.create([
        { path: 'original.txt', content: 'Original' },
      ]);

      zip = await processor.addFiles(zip, [
        { path: 'added.txt', content: 'Added' },
      ]);

      expect(await processor.hasFile(zip, 'original.txt')).toBe(true);
      expect(await processor.hasFile(zip, 'added.txt')).toBe(true);
    });
  });

  describe('removeFiles', () => {
    it('should remove files from ZIP', async () => {
      let zip = await processor.create([
        { path: 'keep.txt', content: 'Keep' },
        { path: 'remove.txt', content: 'Remove' },
      ]);

      zip = await processor.removeFiles(zip, ['remove.txt']);

      expect(await processor.hasFile(zip, 'keep.txt')).toBe(true);
      expect(await processor.hasFile(zip, 'remove.txt')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return true for valid ZIP', async () => {
      const zip = await processor.create([]);
      expect(await processor.validate(zip)).toBe(true);
    });

    it('should return false for invalid ZIP', async () => {
      const invalid = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      expect(await processor.validate(invalid)).toBe(false);
    });
  });
});
