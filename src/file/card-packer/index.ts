/**
 * CardPacker 卡片打包器模块
 * @module @chips/foundation/file/card-packer
 *
 * 负责卡片文件夹与 .card 文件之间的转换
 *
 * @description
 * 卡片打包器构建在 ZIP 处理器之上，提供以下核心功能：
 * - 打包：将卡片文件夹打包为 .card 文件（零压缩 ZIP 格式）
 * - 解包：将 .card 文件解压为文件夹
 * - 验证：检查卡片结构是否符合规范
 * - 元数据读取：快速提取卡片元数据而无需完全解包
 *
 * @example
 * ```typescript
 * import {
 *   CardPacker,
 *   createCardPacker,
 *   ZIPProcessor,
 *   DEFAULT_CARD_STRUCTURE
 * } from '@chips/foundation';
 *
 * // 创建打包器实例
 * const packer = createCardPacker(new ZIPProcessor(), fileSystemAdapter);
 *
 * // 打包卡片
 * const packResult = await packer.pack('/path/to/card-folder', '/path/to/output.card');
 *
 * // 解包卡片
 * const unpackResult = await packer.unpack('/path/to/card.card', '/path/to/output-folder');
 *
 * // 验证卡片结构
 * const validationResult = await packer.validate('/path/to/card.card');
 *
 * // 读取元数据（不需要完整解包）
 * const metadata = await packer.getMetadata('/path/to/card.card');
 * ```
 */

export * from './types';
export { CardPacker, createCardPacker, type FileSystemAdapter } from './card-packer';
