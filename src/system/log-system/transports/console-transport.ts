/**
 * 控制台日志传输器
 * @module @chips/foundation/system/log-system/transports/console-transport
 */

import type { ILogTransport } from '../../../core/interfaces';
import type { LogEntry, LogLevel } from '../../../core/types';
import { DefaultFormatter, type ILogFormatter } from '../formatters/default-formatter';

/**
 * 控制台传输器选项
 */
export interface ConsoleTransportOptions {
  /** 格式化器 */
  formatter?: ILogFormatter;
  /** 最低日志级别 */
  minLevel?: LogLevel;
}

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
 * 控制台传输器
 */
export class ConsoleTransport implements ILogTransport {
  readonly id = 'console';
  readonly name = 'Console Transport';

  private formatter: ILogFormatter;
  private minLevel: LogLevel;

  constructor(options?: ConsoleTransportOptions) {
    this.formatter = options?.formatter ?? new DefaultFormatter();
    this.minLevel = options?.minLevel ?? 'debug';
  }

  write(entry: LogEntry): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const formatted = this.formatter.format(entry);

    switch (entry.level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(formatted);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(formatted);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formatted);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(formatted);
        break;
    }
  }

  /**
   * 设置最低日志级别
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * 设置格式化器
   */
  setFormatter(formatter: ILogFormatter): void {
    this.formatter = formatter;
  }
}

/**
 * 全局控制台传输器
 */
export const consoleTransport = new ConsoleTransport();
