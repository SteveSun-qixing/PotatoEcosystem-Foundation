# 基础控件库 - 技术文档

## 架构设计

基础控件库使用Web Components技术构建,每个控件是自定义元素,封装HTML、逻辑和样式接口。控件使用Shadow DOM隔离样式,不受外部样式影响。

控件库提供基类,所有控件继承基类。基类实现通用功能,如生命周期管理、事件系统、属性监听。具体控件实现特定逻辑,渲染自己的模板。

样式使用CSS变量定义,控件模板引用CSS变量。主题包定义变量值,控件自动应用主题样式。控件不包含硬编码样式,所有样式通过变量控制。

## 接口定义

创建控件通过HTML标签或JavaScript API。HTML方式使用自定义标签,浏览器自动创建控件实例。JavaScript方式调用构造函数创建实例,挂载到DOM。

属性设置通过HTML属性或JavaScript属性。HTML属性自动同步到JavaScript属性,JavaScript属性变化触发attributeChangedCallback。

事件监听使用标准DOM事件API,addEventListener注册回调。控件触发自定义事件,事件冒泡到父元素。

## 使用方式

插件需要UI控件时,直接使用控件标签或创建控件实例。配置控件属性,监听控件事件,处理用户交互。

控件样式由应用主题包提供,插件不需要编写样式。主题切换时,控件自动应用新主题样式。

## 技术细节

Web Components使用customElements.define注册自定义元素,继承HTMLElement类。实现connectedCallback创建Shadow DOM,渲染模板。实现attributeChangedCallback响应属性变化。

虚拟滚动列表只渲染可见项,使用Intersection Observer检测项是否可见,动态添加删除DOM元素。维护滚动位置,计算应该渲染的项范围。

表单验证使用约束验证API,设置input元素的validity属性,调用checkValidity验证。自定义验证使用setCustomValidity设置错误消息。
