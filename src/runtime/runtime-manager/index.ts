/**
 * RuntimeManager 模块导出
 * @module @chips/foundation/runtime/runtime-manager
 *
 * 提供运行时管理功能的完整导出
 */

// 类型导出
export type {
  // 统计类型
  ModuleStats,
  DependencyGraph,
  // 事件类型
  ModuleLoadEvent,
  ModuleUnloadEvent,
  ModuleErrorEvent,
  // 事件处理器类型
  ModuleLoadHandler,
  ModuleUnloadHandler,
  ModuleErrorHandler,
  // 接口
  IRuntimeManager,
  ModuleRegistration,
  // 配置类型
  RuntimeManagerConfig,
} from './types';

// 实现导出
export { RuntimeManager, runtimeManager } from './runtime-manager';
