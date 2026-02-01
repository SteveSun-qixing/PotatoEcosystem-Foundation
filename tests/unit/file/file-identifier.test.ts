/**
 * FileIdentifier 测试
 */

import { describe, it, expect } from 'vitest';
import {
  FileIdentifier,
  fileIdentifier,
} from '../../../src/file/file-identifier';

describe('FileIdentifier', () => {
  const identifier = new FileIdentifier();

  describe('identifyByExtension', () => {
    it('should identify common image formats', () => {
      expect(identifier.identifyByExtension('image.jpg')?.mime).toBe('image/jpeg');
      expect(identifier.identifyByExtension('image.png')?.mime).toBe('image/png');
      expect(identifier.identifyByExtension('image.gif')?.mime).toBe('image/gif');
      expect(identifier.identifyByExtension('image.webp')?.mime).toBe('image/webp');
    });

    it('should identify video formats', () => {
      expect(identifier.identifyByExtension('video.mp4')?.mime).toBe('video/mp4');
      expect(identifier.identifyByExtension('video.webm')?.mime).toBe('video/webm');
    });

    it('should identify audio formats', () => {
      expect(identifier.identifyByExtension('audio.mp3')?.mime).toBe('audio/mpeg');
      expect(identifier.identifyByExtension('audio.wav')?.mime).toBe('audio/wav');
    });

    it('should identify Chips formats', () => {
      const card = identifier.identifyByExtension('test.card');
      expect(card?.mime).toBe('application/x-chips-card');
      expect(card?.isChipsFormat).toBe(true);
      expect(card?.chipsType).toBe('card');

      const box = identifier.identifyByExtension('test.box');
      expect(box?.mime).toBe('application/x-chips-box');
      expect(box?.isChipsFormat).toBe(true);
      expect(box?.chipsType).toBe('box');
    });

    it('should return null for unknown extensions', () => {
      expect(identifier.identifyByExtension('file.xyz')).toBeNull();
    });
  });

  describe('identifyByMagicBytes', () => {
    it('should identify PNG by magic bytes', () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = identifier.identifyByMagicBytes(pngHeader);
      expect(result?.mime).toBe('image/png');
    });

    it('should identify JPEG by magic bytes', () => {
      const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const result = identifier.identifyByMagicBytes(jpegHeader);
      expect(result?.mime).toBe('image/jpeg');
    });

    it('should identify ZIP by magic bytes', () => {
      const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const result = identifier.identifyByMagicBytes(zipHeader);
      expect(result?.mime).toBe('application/zip');
    });

    it('should identify PDF by magic bytes', () => {
      const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const result = identifier.identifyByMagicBytes(pdfHeader);
      expect(result?.mime).toBe('application/pdf');
    });

    it('should return null for unknown magic bytes', () => {
      const unknown = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const result = identifier.identifyByMagicBytes(unknown);
      expect(result).toBeNull();
    });
  });

  describe('identify', () => {
    it('should identify by filename only', () => {
      const result = identifier.identify({ filename: 'test.jpg' });
      expect(result.mime).toBe('image/jpeg');
    });

    it('should identify by buffer only', () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = identifier.identify({ buffer: pngHeader });
      expect(result.mime).toBe('image/png');
    });

    it('should prefer magic bytes over extension', () => {
      // 一个声称是 .jpg 的 PNG 文件
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = identifier.identify({
        filename: 'fake.jpg',
        buffer: pngHeader,
      });
      expect(result.mime).toBe('image/png');
    });

    it('should return unknown for unidentifiable files', () => {
      const result = identifier.identify({});
      expect(result.mime).toBe('application/octet-stream');
    });
  });

  describe('helper methods', () => {
    it('should get extension', () => {
      expect(identifier.getExtension('file.txt')).toBe('txt');
      expect(identifier.getExtension('file.tar.gz')).toBe('gz');
      expect(identifier.getExtension('noextension')).toBeNull();
    });

    it('should get MIME type', () => {
      expect(identifier.getMimeType('file.json')).toBe('application/json');
      expect(identifier.getMimeType('unknown')).toBe('application/octet-stream');
    });

    it('should check if image', () => {
      expect(identifier.isImage('photo.jpg')).toBe(true);
      expect(identifier.isImage('video.mp4')).toBe(false);
    });

    it('should check if video', () => {
      expect(identifier.isVideo('video.mp4')).toBe(true);
      expect(identifier.isVideo('photo.jpg')).toBe(false);
    });

    it('should check if audio', () => {
      expect(identifier.isAudio('music.mp3')).toBe(true);
      expect(identifier.isAudio('photo.jpg')).toBe(false);
    });

    it('should check if text', () => {
      expect(identifier.isText('file.txt')).toBe(true);
      expect(identifier.isText('file.json')).toBe(true);
      expect(identifier.isText('photo.jpg')).toBe(false);
    });
  });
});
