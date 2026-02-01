/**
 * 文件处理模块集成测试
 * @module tests/integration/file-integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FileIdentifier,
  ZIPProcessor,
  FormatConverter,
  DataSerializer,
} from '../../src';

describe('文件处理模块集成测试', () => {
  describe('ZIPProcessor + FormatConverter 集成', () => {
    let zipProcessor: ZIPProcessor;
    let formatConverter: FormatConverter;

    beforeEach(() => {
      zipProcessor = new ZIPProcessor();
      formatConverter = new FormatConverter();
    });

    it('应该能够创建包含文本文件的 ZIP 并提取', async () => {
      // 创建文本内容
      const textContent = 'Hello, Chips Foundation!';
      const textBytes = formatConverter.stringToBytes(textContent);

      // 创建 ZIP
      const files = [{ path: 'content.txt', content: textBytes }];
      const zipData = await zipProcessor.create(files);

      // 提取 ZIP
      const extracted = await zipProcessor.extract(zipData);

      // 验证
      const extractedText = formatConverter.bytesToString(extracted.get('content.txt')!);
      expect(extractedText).toBe(textContent);
    });

    it('应该能够创建包含 YAML 配置的 ZIP', async () => {
      const serializer = new DataSerializer();

      // 创建 YAML 配置
      const config = {
        name: 'Test Card',
        version: '1.0.0',
        type: 'rich-text',
      };
      const yamlContent = serializer.stringifyYAML(config);
      const yamlBytes = formatConverter.stringToBytes(yamlContent);

      // 创建 ZIP
      const files = [{ path: 'config.yaml', content: yamlBytes }];
      const zipData = await zipProcessor.create(files, { store: true }); // 零压缩

      // 提取并解析
      const extracted = await zipProcessor.extract(zipData);
      const extractedYaml = formatConverter.bytesToString(extracted.get('config.yaml')!);
      const parsedConfig = serializer.parseYAML<typeof config>(extractedYaml);

      expect(parsedConfig.name).toBe('Test Card');
      expect(parsedConfig.version).toBe('1.0.0');
    });
  });

  describe('FileIdentifier + ZIPProcessor 集成', () => {
    let fileIdentifier: FileIdentifier;
    let zipProcessor: ZIPProcessor;
    let formatConverter: FormatConverter;

    beforeEach(() => {
      fileIdentifier = new FileIdentifier();
      zipProcessor = new ZIPProcessor();
      formatConverter = new FormatConverter();
    });

    it('应该能够识别 ZIP 文件类型', async () => {
      const files = [{ path: 'test.txt', content: formatConverter.stringToBytes('test') }];
      const zipData = await zipProcessor.create(files);

      const fileType = fileIdentifier.identify({ buffer: zipData });
      expect(fileType?.mime).toBe('application/zip');
    });

    it('应该能够识别 ZIP 内部文件类型', async () => {
      // 创建包含多种类型文件的 ZIP
      const files = [
        { path: 'document.txt', content: formatConverter.stringToBytes('Hello') },
        { path: 'config.yaml', content: formatConverter.stringToBytes('key: value') },
        { path: 'data.json', content: formatConverter.stringToBytes('{"a":1}') },
      ];
      const zipData = await zipProcessor.create(files);

      // 提取并识别
      const extracted = await zipProcessor.extract(zipData);

      for (const [filename, _content] of extracted) {
        const ext = filename.split('.').pop();
        const type = fileIdentifier.identifyByExtension(filename);

        if (ext === 'txt') {
          expect(type?.mime).toBe('text/plain');
        } else if (ext === 'yaml') {
          expect(type?.mime).toBe('application/x-yaml');
        } else if (ext === 'json') {
          expect(type?.mime).toBe('application/json');
        }
      }
    });
  });

  describe('模拟 .card 文件处理流程', () => {
    it('应该能够创建和解析符合 .card 格式的 ZIP', async () => {
      const zipProcessor = new ZIPProcessor();
      const formatConverter = new FormatConverter();
      const serializer = new DataSerializer();

      // 1. 创建卡片元数据
      const metadata = {
        id: 'abc123def0',
        name: '测试卡片',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };

      // 2. 创建卡片结构
      const structure = {
        base_cards: [
          { id: 'bc001', type: 'rich-text', order: 1 },
          { id: 'bc002', type: 'code', order: 2 },
        ],
      };

      // 3. 创建基础卡片内容
      const baseCard1 = {
        content: '这是一段富文本内容',
        isHtml: false,
      };

      const baseCard2 = {
        code: 'console.log("Hello");',
        language: 'javascript',
      };

      // 4. 组装 ZIP 文件
      const files = [
        { path: 'metadata.yaml', content: formatConverter.stringToBytes(serializer.stringifyYAML(metadata)) },
        { path: 'structure.yaml', content: formatConverter.stringToBytes(serializer.stringifyYAML(structure)) },
        { path: 'base_cards/bc001.yaml', content: formatConverter.stringToBytes(serializer.stringifyYAML(baseCard1)) },
        { path: 'base_cards/bc002.yaml', content: formatConverter.stringToBytes(serializer.stringifyYAML(baseCard2)) },
      ];

      // 5. 创建 .card 文件（零压缩 ZIP）
      const cardFile = await zipProcessor.create(files, { store: true });

      // 6. 解析 .card 文件
      const extracted = await zipProcessor.extract(cardFile);

      // 7. 验证元数据
      const extractedMetadata = serializer.parseYAML<typeof metadata>(
        formatConverter.bytesToString(extracted.get('metadata.yaml')!)
      );
      expect(extractedMetadata.name).toBe('测试卡片');

      // 8. 验证结构
      const extractedStructure = serializer.parseYAML<typeof structure>(
        formatConverter.bytesToString(extracted.get('structure.yaml')!)
      );
      expect(extractedStructure.base_cards).toHaveLength(2);

      // 9. 验证基础卡片内容
      const extractedBC1 = serializer.parseYAML<typeof baseCard1>(
        formatConverter.bytesToString(extracted.get('base_cards/bc001.yaml')!)
      );
      expect(extractedBC1.content).toBe('这是一段富文本内容');
    });
  });

  describe('Base64 编码/解码与 ZIP 集成', () => {
    it('应该能够将 ZIP 转换为 Base64 并还原', async () => {
      const zipProcessor = new ZIPProcessor();
      const formatConverter = new FormatConverter();

      // 创建 ZIP
      const files = [{ path: 'test.txt', content: formatConverter.stringToBytes('Hello World') }];
      const zipData = await zipProcessor.create(files);

      // 转换为 Base64
      const base64 = formatConverter.toBase64(zipData);
      expect(typeof base64).toBe('string');

      // 还原
      const restored = formatConverter.fromBase64(base64);

      // 验证
      const extracted = await zipProcessor.extract(restored);
      const text = formatConverter.bytesToString(extracted.get('test.txt')!);
      expect(text).toBe('Hello World');
    });
  });
});
