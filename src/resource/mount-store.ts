/**
 * 挂载表持久化存储
 * @module @chips/foundation/resource/mount-store
 *
 * 使用 JSON 文件持久化卡片挂载表。
 * 应用启动时自动恢复挂载表，挂载/卸载操作后自动保存。
 */

import type { MountDatabase, MountRecord } from './types';

/**
 * 默认数据库文件路径
 */
const DEFAULT_DB_PATH = '.chips/mount-registry.json';

/**
 * 数据库版本
 */
const DB_VERSION = '1.0.0';

/**
 * 挂载表存储
 *
 * 负责挂载记录的持久化读写。使用 JSON 文件作为数据库，
 * 适合桌面应用的轻量级持久化需求。
 */
export class MountStore {
  private _dbPath: string;
  private _records: Map<string, MountRecord> = new Map();
  private _initialized = false;

  /**
   * 创建挂载表存储实例
   *
   * @param dbPath - 数据库文件路径（可选）
   */
  constructor(dbPath?: string) {
    this._dbPath = dbPath ?? DEFAULT_DB_PATH;
  }

  /**
   * 初始化：从数据库文件加载已有记录
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      const data = await this._readFile(this._dbPath);
      if (data) {
        const db = JSON.parse(data) as MountDatabase;
        if (db.version && db.records) {
          for (const record of db.records) {
            this._records.set(record.cardId, record);
          }
        }
      }
    } catch {
      // 文件不存在或格式错误，使用空记录
      this._records.clear();
    }

    this._initialized = true;
  }

  /**
   * 添加挂载记录
   */
  async addRecord(record: MountRecord): Promise<void> {
    this._records.set(record.cardId, record);
    await this._save();
  }

  /**
   * 移除挂载记录
   */
  async removeRecord(cardId: string): Promise<boolean> {
    const existed = this._records.delete(cardId);
    if (existed) {
      await this._save();
    }
    return existed;
  }

  /**
   * 更新记录的最后访问时间
   */
  async updateLastAccess(cardId: string): Promise<void> {
    const record = this._records.get(cardId);
    if (record) {
      record.lastAccessedAt = new Date().toISOString();
      await this._save();
    }
  }

  /**
   * 获取单条记录
   */
  getRecord(cardId: string): MountRecord | undefined {
    return this._records.get(cardId);
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): MountRecord[] {
    return Array.from(this._records.values());
  }

  /**
   * 检查卡片是否在挂载表中
   */
  hasRecord(cardId: string): boolean {
    return this._records.has(cardId);
  }

  /**
   * 清空所有记录
   */
  async clear(): Promise<void> {
    this._records.clear();
    await this._save();
  }

  /**
   * 保存到数据库文件
   */
  private async _save(): Promise<void> {
    const db: MountDatabase = {
      version: DB_VERSION,
      updatedAt: new Date().toISOString(),
      records: Array.from(this._records.values()),
    };

    const content = JSON.stringify(db, null, 2);
    await this._writeFile(this._dbPath, content);
  }

  /**
   * 读取文件
   *
   * 支持 Node.js 和浏览器环境
   */
  private async _readFile(path: string): Promise<string | null> {
    // Node.js 环境
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const { readFile } = await import('fs/promises');
        const { resolve, dirname } = await import('path');
        const { homedir } = await import('os');

        const fullPath = path.startsWith('/') || path.startsWith('~')
          ? path.replace('~', homedir())
          : resolve(homedir(), path);

        return await readFile(fullPath, 'utf-8');
      } catch {
        return null;
      }
    }

    // 浏览器环境：使用 localStorage
    try {
      return localStorage.getItem(`chips:mount-store:${path}`);
    } catch {
      return null;
    }
  }

  /**
   * 写入文件
   *
   * 支持 Node.js 和浏览器环境
   */
  private async _writeFile(path: string, content: string): Promise<void> {
    // Node.js 环境
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const { writeFile, mkdir } = await import('fs/promises');
        const { resolve, dirname } = await import('path');
        const { homedir } = await import('os');

        const fullPath = path.startsWith('/') || path.startsWith('~')
          ? path.replace('~', homedir())
          : resolve(homedir(), path);

        // 确保目录存在
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, 'utf-8');
      } catch {
        // 写入失败，静默处理
      }
      return;
    }

    // 浏览器环境：使用 localStorage
    try {
      localStorage.setItem(`chips:mount-store:${path}`, content);
    } catch {
      // localStorage 可能满或不可用
    }
  }
}
