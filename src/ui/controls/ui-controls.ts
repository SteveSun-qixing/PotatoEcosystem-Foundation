/**
 * UIControls 基础UI控件
 * @module @chips/foundation/ui/controls/ui-controls
 *
 * 提供无样式的基础UI控件，样式由主题系统提供
 */

/**
 * 控件属性基类
 */
export interface BaseControlProps {
  /** 控件ID */
  id?: string;
  /** CSS类名 */
  className?: string;
  /** 样式 */
  style?: Partial<CSSStyleDeclaration>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 数据属性 */
  data?: Record<string, string>;
}

/**
 * 按钮属性
 */
export interface ButtonProps extends BaseControlProps {
  /** 按钮文本 */
  text: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * 输入框属性
 */
export interface InputProps extends BaseControlProps {
  /** 输入值 */
  value?: string;
  /** 占位符 */
  placeholder?: string;
  /** 输入类型 */
  type?: 'text' | 'password' | 'email' | 'number' | 'search';
  /** 变更回调 */
  onChange?: (value: string) => void;
}

/**
 * 创建DOM元素
 */
function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: BaseControlProps
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (props?.id) {
    element.id = props.id;
  }

  if (props?.className) {
    element.className = props.className;
  }

  if (props?.style) {
    Object.assign(element.style, props.style);
  }

  if (props?.disabled && 'disabled' in element) {
    (element as HTMLButtonElement | HTMLInputElement).disabled = true;
  }

  if (props?.data) {
    for (const [key, value] of Object.entries(props.data)) {
      element.dataset[key] = value;
    }
  }

  return element;
}

/**
 * UIControls 控件工厂
 */
export class UIControls {
  /**
   * 创建按钮
   */
  static createButton(props: ButtonProps): HTMLButtonElement {
    const button = createElement('button', props);
    button.type = props.type ?? 'button';
    button.textContent = props.text;

    if (props.onClick) {
      button.addEventListener('click', props.onClick);
    }

    return button;
  }

  /**
   * 创建输入框
   */
  static createInput(props: InputProps): HTMLInputElement {
    const input = createElement('input', props);
    input.type = props.type ?? 'text';

    if (props.value !== undefined) {
      input.value = props.value;
    }

    if (props.placeholder) {
      input.placeholder = props.placeholder;
    }

    if (props.onChange) {
      input.addEventListener('input', () => {
        props.onChange?.(input.value);
      });
    }

    return input;
  }

  /**
   * 创建容器
   */
  static createContainer(props?: BaseControlProps): HTMLDivElement {
    return createElement('div', props);
  }

  /**
   * 创建标签
   */
  static createLabel(
    text: string,
    forId?: string,
    props?: BaseControlProps
  ): HTMLLabelElement {
    const label = createElement('label', props);
    label.textContent = text;
    if (forId) {
      label.htmlFor = forId;
    }
    return label;
  }

  /**
   * 创建文本
   */
  static createText(text: string, tag: 'span' | 'p' = 'span', props?: BaseControlProps): HTMLElement {
    const element = createElement(tag, props);
    element.textContent = text;
    return element;
  }
}

/**
 * 便捷函数
 */
export const createButton = UIControls.createButton;
export const createInput = UIControls.createInput;
export const createContainer = UIControls.createContainer;
export const createLabel = UIControls.createLabel;
export const createText = UIControls.createText;
