/**
 * 默认日志格式化器
 * @module @chips/foundation/system/log-system/formatters/default-formatter
 */

import type { LogEntry } from '../../../core/types';

/**
 * 日志格式化器接口
 */
export interface ILogFormatter {
  format(entry: LogEntry): string;
}

/**
 * 默认日志格式化器
 * 输出格式：[时间] [级别] [模块] 消息
 */
export class DefaultFormatter implements ILogFormatter {
  private readonly colors: Record<string, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    reset: '\x1b[0m',
  };

  private readonly useColors: boolean;

  constructor(useColors = true) {
    this.useColors = useColors;
  }

  format(entry: LogEntry): string {
    const time = this.formatTime(entry.timestamp);
    const level = this.formatLevel(entry.level);
    const module = entry.context?.module ? `[${entry.context.module}]` : '';
    const message = entry.message;
    const data = this.formatData(entry);

    let output = `${time} ${level} ${module} ${message}`.trim();

    if (data) {
      output += ` ${data}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `[${date.toISOString()}]`;
  }

  private formatLevel(level: string): string {
    const upperLevel = level.toUpperCase().padEnd(5);
    if (this.useColors) {
      const color = this.colors[level] ?? this.colors['reset'];
      return `${color}[${upperLevel}]${this.colors['reset']}`;
    }
    return `[${upperLevel}]`;
  }

  private formatData(entry: LogEntry): string {
    const context = entry.context ?? {};
    const { module: _module, ...rest } = context;
    const data: Record<string, unknown> = { ...rest };

    if (Object.keys(data).length === 0) {
      return '';
    }

    return JSON.stringify(data);
  }
}

/**
 * 全局默认格式化器
 */
export const defaultFormatter = new DefaultFormatter();
