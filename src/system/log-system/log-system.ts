/**
 * LogSystem 日志系统
 * @module @chips/foundation/system/log-system/log-system
 */

import type { ILogSystem, ILogTransport, LogQueryOptions, LogClearOptions } from '../../core/interfaces';
import type { LogLevel, LogContext, LogEntry } from '../../core/types';
import { ConsoleTransport } from './transports/console-transport';

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 日志系统选项
 */
export interface LogSystemOptions {
  /** 默认日志级别 */
  level?: LogLevel;
  /** 最大缓存日志数 */
  maxEntries?: number;
  /** 默认模块名 */
  defaultModule?: string;
}

/**
 * LogSystem 实现
 */
export class LogSystem implements ILogSystem {
  private level: LogLevel;
  private transports: Map<string, ILogTransport> = new Map();
  private entries: LogEntry[] = [];
  private maxEntries: number;
  private defaultModule?: string;

  constructor(options?: LogSystemOptions) {
    this.level = options?.level ?? 'info';
    this.maxEntries = options?.maxEntries ?? 10000;
    this.defaultModule = options?.defaultModule;

    // 默认添加控制台传输器
    this.addTransport(new ConsoleTransport({ minLevel: this.level }));
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * 信息日志
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
    // 同步更新控制台传输器的级别
    const consoleTransport = this.transports.get('console');
    if (consoleTransport && 'setMinLevel' in consoleTransport) {
      (consoleTransport as ConsoleTransport).setMinLevel(level);
    }
  }

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 添加传输器
   */
  addTransport(transport: ILogTransport): void {
    this.transports.set(transport.id, transport);
  }

  /**
   * 移除传输器
   */
  removeTransport(transportId: string): void {
    const transport = this.transports.get(transportId);
    if (transport?.destroy) {
      void transport.destroy();
    }
    this.transports.delete(transportId);
  }

  /**
   * 查询日志
   */
  async query(options: LogQueryOptions): Promise<LogEntry[]> {
    let result = [...this.entries];

    // 级别过滤
    if (options.level) {
      const minPriority = LOG_LEVEL_PRIORITY[options.level];
      result = result.filter((entry) => LOG_LEVEL_PRIORITY[entry.level] >= minPriority);
    }

    // 模块过滤
    if (options.module) {
      result = result.filter((entry) => entry.context?.module === options.module);
    }

    // 时间范围过滤
    if (options.startTime) {
      result = result.filter((entry) => entry.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      result = result.filter((entry) => entry.timestamp <= options.endTime!);
    }

    // 搜索过滤
    if (options.search) {
      const search = options.search.toLowerCase();
      result = result.filter((entry) => entry.message.toLowerCase().includes(search));
    }

    // 分页
    const offset = options.offset ?? 0;
    const limit = options.limit ?? result.length;
    result = result.slice(offset, offset + limit);

    return result;
  }

  /**
   * 清理日志
   */
  async clear(options?: LogClearOptions): Promise<void> {
    if (!options) {
      this.entries = [];
      return;
    }

    if (options.before) {
      this.entries = this.entries.filter((entry) => entry.timestamp >= options.before!);
    }

    if (options.level) {
      const minPriority = LOG_LEVEL_PRIORITY[options.level];
      this.entries = this.entries.filter(
        (entry) => LOG_LEVEL_PRIORITY[entry.level] >= minPriority
      );
    }
  }

  /**
   * 创建子日志器（固定模块名）
   */
  child(module: string): LogSystem {
    const child = new LogSystem({
      level: this.level,
      maxEntries: this.maxEntries,
      defaultModule: module,
    });

    // 共享传输器
    child.transports = this.transports;
    // 共享日志条目
    child.entries = this.entries;

    return child;
  }

  /**
   * 内部日志方法
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    // 级别检查
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context: {
        module: context?.module ?? this.defaultModule,
        ...context,
      },
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    // 存储日志
    this.entries.push(entry);

    // 限制日志数量
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // 写入传输器
    for (const transport of this.transports.values()) {
      try {
        void transport.write(entry);
      } catch {
        // 忽略传输器错误
      }
    }
  }
}

/**
 * 全局日志系统实例
 */
export const logSystem = new LogSystem();

/**
 * 创建日志器
 */
export function createLogger(module: string): LogSystem {
  return logSystem.child(module);
}
