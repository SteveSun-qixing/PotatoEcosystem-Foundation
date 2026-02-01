/**
 * JSON 日志格式化器
 * @module @chips/foundation/system/log-system/formatters/json-formatter
 */

import type { LogEntry } from '../../../core/types';
import type { ILogFormatter } from './default-formatter';

/**
 * JSON 格式化器
 * 输出结构化 JSON 日志
 */
export class JSONFormatter implements ILogFormatter {
  private readonly pretty: boolean;

  constructor(pretty = false) {
    this.pretty = pretty;
  }

  format(entry: LogEntry): string {
    const output = {
      timestamp: new Date(entry.timestamp).toISOString(),
      level: entry.level,
      message: entry.message,
      ...entry.context,
      error: entry.error
        ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          }
        : undefined,
    };

    return JSON.stringify(output, null, this.pretty ? 2 : undefined);
  }
}

/**
 * 全局 JSON 格式化器
 */
export const jsonFormatter = new JSONFormatter();
