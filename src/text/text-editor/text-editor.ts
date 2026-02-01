/**
 * TextEditor 文本编辑器
 * @module @chips/foundation/text/text-editor/text-editor
 *
 * 提供基础文本编辑功能，支持撤销/重做
 */

/**
 * 编辑操作
 */
interface EditOperation {
  /** 操作类型 */
  type: 'insert' | 'delete' | 'replace';
  /** 位置 */
  position: number;
  /** 新文本 */
  newText?: string;
  /** 旧文本 */
  oldText?: string;
  /** 长度 */
  length?: number;
}

/**
 * 编辑器选项
 */
export interface TextEditorOptions {
  /** 初始内容 */
  initialContent?: string;
  /** 最大撤销栈大小 */
  maxHistorySize?: number;
}

/**
 * 选区
 */
export interface TextSelection {
  /** 开始位置 */
  start: number;
  /** 结束位置 */
  end: number;
}

/**
 * TextEditor 文本编辑器
 */
export class TextEditor {
  private content: string;
  private undoStack: EditOperation[] = [];
  private redoStack: EditOperation[] = [];
  private maxHistorySize: number;
  private selection: TextSelection = { start: 0, end: 0 };

  constructor(options?: TextEditorOptions) {
    this.content = options?.initialContent ?? '';
    this.maxHistorySize = options?.maxHistorySize ?? 100;
  }

  /**
   * 获取内容
   */
  getContent(): string {
    return this.content;
  }

  /**
   * 设置内容
   */
  setContent(content: string): void {
    const oldContent = this.content;
    this.content = content;
    this.pushUndo({
      type: 'replace',
      position: 0,
      oldText: oldContent,
      newText: content,
    });
    this.redoStack = [];
  }

  /**
   * 插入文本
   */
  insert(position: number, text: string): void {
    this.content = this.content.slice(0, position) + text + this.content.slice(position);
    this.pushUndo({
      type: 'insert',
      position,
      newText: text,
    });
    this.redoStack = [];
  }

  /**
   * 删除文本
   */
  delete(position: number, length: number): void {
    const deleted = this.content.slice(position, position + length);
    this.content = this.content.slice(0, position) + this.content.slice(position + length);
    this.pushUndo({
      type: 'delete',
      position,
      oldText: deleted,
      length,
    });
    this.redoStack = [];
  }

  /**
   * 替换文本
   */
  replace(position: number, length: number, text: string): void {
    const oldText = this.content.slice(position, position + length);
    this.content = this.content.slice(0, position) + text + this.content.slice(position + length);
    this.pushUndo({
      type: 'replace',
      position,
      oldText,
      newText: text,
      length,
    });
    this.redoStack = [];
  }

  /**
   * 撤销
   */
  undo(): boolean {
    const operation = this.undoStack.pop();
    if (!operation) {
      return false;
    }

    this.applyReverseOperation(operation);
    this.redoStack.push(operation);
    return true;
  }

  /**
   * 重做
   */
  redo(): boolean {
    const operation = this.redoStack.pop();
    if (!operation) {
      return false;
    }

    this.applyOperation(operation);
    this.undoStack.push(operation);
    return true;
  }

  /**
   * 是否可撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 设置选区
   */
  setSelection(selection: TextSelection): void {
    this.selection = selection;
  }

  /**
   * 获取选区
   */
  getSelection(): TextSelection {
    return this.selection;
  }

  /**
   * 获取选中文本
   */
  getSelectedText(): string {
    return this.content.slice(this.selection.start, this.selection.end);
  }

  /**
   * 搜索
   */
  search(query: string, options?: { caseSensitive?: boolean }): number[] {
    const positions: number[] = [];
    const content = options?.caseSensitive ? this.content : this.content.toLowerCase();
    const searchQuery = options?.caseSensitive ? query : query.toLowerCase();

    let pos = 0;
    while ((pos = content.indexOf(searchQuery, pos)) !== -1) {
      positions.push(pos);
      pos += 1;
    }

    return positions;
  }

  /**
   * 搜索并替换
   */
  searchAndReplace(
    query: string,
    replacement: string,
    options?: { caseSensitive?: boolean; replaceAll?: boolean }
  ): number {
    const positions = this.search(query, options);

    if (positions.length === 0) {
      return 0;
    }

    if (options?.replaceAll) {
      // 从后往前替换，避免位置偏移
      for (let i = positions.length - 1; i >= 0; i--) {
        const pos = positions[i];
        if (pos !== undefined) {
          this.replace(pos, query.length, replacement);
        }
      }
      return positions.length;
    } else {
      const firstPos = positions[0];
      if (firstPos !== undefined) {
        this.replace(firstPos, query.length, replacement);
      }
      return 1;
    }
  }

  /**
   * 获取行数
   */
  getLineCount(): number {
    return this.content.split('\n').length;
  }

  /**
   * 获取指定行
   */
  getLine(lineNumber: number): string | undefined {
    const lines = this.content.split('\n');
    return lines[lineNumber];
  }

  /**
   * 压入撤销栈
   */
  private pushUndo(operation: EditOperation): void {
    this.undoStack.push(operation);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * 应用操作
   */
  private applyOperation(operation: EditOperation): void {
    switch (operation.type) {
      case 'insert':
        this.content =
          this.content.slice(0, operation.position) +
          operation.newText +
          this.content.slice(operation.position);
        break;
      case 'delete':
        this.content =
          this.content.slice(0, operation.position) +
          this.content.slice(operation.position + (operation.length ?? 0));
        break;
      case 'replace':
        this.content =
          this.content.slice(0, operation.position) +
          operation.newText +
          this.content.slice(operation.position + (operation.length ?? operation.oldText?.length ?? 0));
        break;
    }
  }

  /**
   * 应用反向操作
   */
  private applyReverseOperation(operation: EditOperation): void {
    switch (operation.type) {
      case 'insert':
        // 反向：删除
        this.content =
          this.content.slice(0, operation.position) +
          this.content.slice(operation.position + (operation.newText?.length ?? 0));
        break;
      case 'delete':
        // 反向：插入
        this.content =
          this.content.slice(0, operation.position) +
          operation.oldText +
          this.content.slice(operation.position);
        break;
      case 'replace':
        // 反向：替换回旧文本
        this.content =
          this.content.slice(0, operation.position) +
          operation.oldText +
          this.content.slice(operation.position + (operation.newText?.length ?? 0));
        break;
    }
  }
}

/**
 * 创建文本编辑器
 */
export function createTextEditor(options?: TextEditorOptions): TextEditor {
  return new TextEditor(options);
}
