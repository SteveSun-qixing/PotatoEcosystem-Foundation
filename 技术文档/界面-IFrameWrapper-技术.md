# 网页框架组件 - 技术文档

## 架构设计

网页框架组件创建iframe元素,设置沙箱属性和其他配置。沙箱使用sandbox属性,指定允许的权限,如allow-scripts、allow-same-origin等。

通信使用postMessage API,父窗口调用iframe的contentWindow.postMessage发送消息,iframe调用window.parent.postMessage回复消息。监听message事件接收消息,验证消息来源和类型。

加载管理监听iframe的load事件,加载完成触发完成回调。监听error事件,加载失败触发错误回调。显示加载动画,加载完成后移除动画。

## 接口定义

创建iframe接口接收容器元素和配置对象,配置包括src URL、沙箱规则、是否允许全屏等。接口创建iframe元素,设置属性,添加到容器,返回iframe实例。

加载内容接口接收URL或HTML字符串,更新iframe的src属性或srcdoc属性。加载开始显示加载动画,加载完成移除动画。

发送消息接口接收消息对象和目标origin,调用postMessage发送消息。消息对象包含类型和数据,目标origin限制接收消息的域。

监听消息接口注册消息回调,监听message事件。事件触发时验证消息来源,来源匹配iframe的origin才处理消息。解析消息对象,调用回调函数。

## 使用方式

网页卡片需要嵌入外部网页时,使用网页框架组件创建iframe。设置沙箱规则,严格限制权限,防止恶意脚本。

iframe内的网页需要与父窗口通信时,调用postMessage发送消息。父窗口接收消息,验证后处理,回复消息到iframe。

## 技术细节

沙箱属性使用allow-scripts允许脚本,allow-forms允许表单,allow-popups允许弹窗,allow-same-origin允许同源访问。不设置allow-same-origin最安全,iframe不能访问父窗口。

消息验证检查event.origin,只处理来自可信域的消息。检查消息格式,验证消息类型和数据结构,防止恶意消息注入。

CSP内容安全策略设置iframe的CSP头,限制iframe加载的资源来源,防止加载恶意脚本或图片。
