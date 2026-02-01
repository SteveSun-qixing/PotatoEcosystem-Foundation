/**
 * LogSystem 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogSystem, createLogger } from '../../../src/system/log-system';

describe('LogSystem', () => {
  let logger: LogSystem;

  beforeEach(() => {
    logger = new LogSystem({ level: 'debug', maxEntries: 100 });
    // 移除默认控制台传输器以避免测试输出
    logger.removeTransport('console');
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');
      // 由于没有传输器，这里只验证不抛出错误
    });

    it('should log info messages', () => {
      logger.info('Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);
    });
  });

  describe('log level', () => {
    it('should get current log level', () => {
      expect(logger.getLevel()).toBe('debug');
    });

    it('should set log level', () => {
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
    });
  });

  describe('query logs', () => {
    beforeEach(async () => {
      // 添加一些测试日志
      logger.debug('Debug 1', { module: 'test' });
      logger.info('Info 1', { module: 'test' });
      logger.warn('Warn 1', { module: 'other' });
      logger.error('Error 1');
    });

    it('should query all logs', async () => {
      const logs = await logger.query({});
      expect(logs.length).toBe(4);
    });

    it('should filter by level', async () => {
      const logs = await logger.query({ level: 'warn' });
      expect(logs.length).toBe(2); // warn + error
    });

    it('should filter by module', async () => {
      const logs = await logger.query({ module: 'test' });
      expect(logs.length).toBe(2);
    });

    it('should filter by search', async () => {
      const logs = await logger.query({ search: 'debug' });
      expect(logs.length).toBe(1);
    });

    it('should support pagination', async () => {
      const logs = await logger.query({ offset: 1, limit: 2 });
      expect(logs.length).toBe(2);
    });
  });

  describe('clear logs', () => {
    beforeEach(async () => {
      logger.debug('Debug 1');
      logger.info('Info 1');
    });

    it('should clear all logs', async () => {
      await logger.clear();
      const logs = await logger.query({});
      expect(logs.length).toBe(0);
    });

    it('should clear logs by level', async () => {
      await logger.clear({ level: 'info' });
      const logs = await logger.query({});
      // 只保留 info 及以上级别
      expect(logs.every((l) => l.level !== 'debug')).toBe(true);
    });
  });

  describe('child logger', () => {
    it('should create child logger with module', () => {
      const child = logger.child('test-module');
      expect(child).toBeInstanceOf(LogSystem);
    });
  });

  describe('transports', () => {
    it('should add transport', () => {
      const transport = {
        id: 'test',
        name: 'Test Transport',
        write: vi.fn(),
      };

      logger.addTransport(transport);
      logger.info('Test message');

      expect(transport.write).toHaveBeenCalled();
    });

    it('should remove transport', () => {
      const transport = {
        id: 'test',
        name: 'Test Transport',
        write: vi.fn(),
        destroy: vi.fn(),
      };

      logger.addTransport(transport);
      logger.removeTransport('test');

      logger.info('Test message');
      expect(transport.write).toHaveBeenCalledTimes(0);
    });
  });
});

describe('createLogger', () => {
  it('should create logger with module name', () => {
    const logger = createLogger('my-module');
    expect(logger).toBeInstanceOf(LogSystem);
  });
});
