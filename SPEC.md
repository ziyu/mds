
> **Markdown 负责内容，MDS 只增加少量“语义指令”。**
> 作者不写 HTML 属性，不写 JSX，不写 XML，不写复杂参数。

---

# MDS v0.1 语法设计

## 0. 核心设计

MDS 是一个新的标记语言，基于markdown，像markdown一样简洁，但是像html一样丰富。
MDS 的核心目标不是“让 Markdown 支持所有 HTML 功能”，而是：

```txt
用最少的语法表达页面意图，
由主题、组件把它渲染成 HTML / CSS / JS。
```

所以 MDS 有几个硬规则：

```txt
1. 普通 Markdown 完全兼容。
2. 不引入 XML 风格标签。
3. 不引入 JSX。
4. 不在正文里写 key=value 属性。
5. 所有复杂样式、动画、交互参数交给主题和插件。
6. 文档作者只写语义、内容和少量动作。
```

---

# 1. 文件结构

一个 `.mds` 文件由三部分组成：

```mds
---
title: 首页
theme: aurora
layout: landing
---

# 正文标题

正文内容。

::: hero
# 欢迎来到 MDS

像写 Markdown 一样写网页。

[开始 -> /start]
:::
```

结构是：

```txt
元信息区，可选
普通 Markdown
MDS 语义块
MDS 动作链接
MDS 媒体指令
```

---

# 2. 元信息 Frontmatter

MDS 可以使用 YAML 风格的 frontmatter。

```mds
---
title: MDS Demo
description: 一个交互式 Markdown 页面
theme: aurora
layout: landing
lang: zh-CN
---
```

建议内置字段：

```txt
title       页面标题
description 页面描述
theme       使用的主题
layout      页面布局
lang        页面语言
cover       页面封面
draft       是否草稿
```

注意：
frontmatter 是**页面级配置**，不是正文属性系统。

正文中尽量不要出现：

```mds
::: card {color=red size=large animated=true}
```

而是应该写：

```mds
::: warning
危险操作，请谨慎。
:::
```

---

# 3. 普通 Markdown

MDS 必须完整继承基础 Markdown。

````mds
# 一级标题

## 二级标题

这是 **加粗**，这是 *斜体*。

- 项目一
- 项目二

1. 第一步
2. 第二步

[普通链接](https://example.com)

![图片](cover.png)

> 引用内容

```js
console.log("hello mds")
````

````

这些内容按普通 Markdown 解析。

---

# 4. 语义块 Block

MDS 最重要的扩展是语义块。

基本格式：

```mds
::: 类型
内容
:::
````

例如：

```mds
::: hero
# 重新想象 Markdown

用简单文本写出交互页面。

[开始 -> /start]
:::
```

块的语法只有两种：

```mds
::: 类型
内容
:::
```

或者：

```mds
::: 类型 名称
内容
:::
```

比如：

```mds
::: details faq
这里是可以展开的 FAQ 内容。
:::

[查看 FAQ !toggle faq]
```

这里的 `faq` 是块名称，用于动作引用。
它不是属性，也不支持 `key=value`。

---

# 5. 块名称规则

```txt
::: hero
::: card
::: warning
::: details faq
::: tabs product
```

解释：

| 写法                 | 含义                    |
| ------------------ | --------------------- |
| `::: hero`         | 一个 hero 块             |
| `::: card`         | 一个 card 块             |
| `::: details faq`  | 一个名为 faq 的 details 块  |
| `::: tabs product` | 一个名为 product 的 tabs 块 |

限制：

```txt
块类型只能是一个单词。
块名称可选。
块名称只能是一个单词。
不允许 key=value。
不允许花括号属性。
```

也就是说，不允许：

```mds
::: card {type=warning animated=true}
:::
```

应该写成：

```mds
::: warning
:::
```

或者由主题决定 card 的样式。

---

# 6. 内置基础块

## 6.1 页面结构块

```mds
::: page
整个页面内容
:::

::: section
一个普通区域
:::

::: hero
页面主视觉区域
:::

::: aside
侧边说明内容
:::

::: footer
页脚内容
:::
```

示例：

```mds
::: hero
# MDS

一种面向交互文档的新标记语言。

[开始 -> /docs]
:::

::: section
## 为什么需要 MDS？

因为 Markdown 太弱，HTML 太重。
:::

::: footer
© 2026 MDS
:::
```

---

## 6.2 内容强调块

```mds
::: note
普通提示
:::

::: info
信息提示
:::

::: warning
警告提示
:::

::: danger
危险提示
:::

::: success
成功提示
:::

::: quote
特殊引用
:::
```

示例：

```mds
::: warning
删除操作不可恢复。
:::
```

不要写：

```mds
::: alert {type=warning}
删除操作不可恢复。
:::
```

MDS 应该用块类型表达语义，而不是用属性表达差异。

---

## 6.3 卡片与列表块

```mds
::: card
# 标题

卡片内容。
:::
```

多卡片：

```mds
::: cards
- 简洁：像 Markdown 一样写
- 生动：支持动画和交互
- 扩展：可以接入自定义组件
:::
```

渲染器可以把它转成三张卡片。

也可以写成多个子块：

```mds
::: cards

::: card
# 简洁
像 Markdown 一样写。
:::

::: card
# 生动
支持动画和交互。
:::

::: card
# 扩展
可以接入自定义组件。
:::

:::
```

---

# 7. 布局块

为了避免属性，布局也用固定语义块。

## 7.1 横向分栏

```mds
::: split

--- left
# 左侧内容

这里是介绍。

--- right
![预览图](demo.png)

:::
```

## 7.2 网格

```mds
::: grid

--- item
# 快速
无需 HTML。

--- item
# 丰富
支持交互。

--- item
# 可扩展
支持组件。

:::
```

如果需要不同列数，不在正文里写 `columns=3`。

而是由主题决定，或者使用固定块类型：

```mds
::: grid-2
:::

::: grid-3
:::

::: grid-auto
:::
```

这比下面这种更符合 MDS 的简洁性：

```mds
::: grid {columns=3 gap=24}
```

---

# 8. Slot 语法

复杂块内部可以使用 slot。

slot 语法：

```mds
--- slot-name
内容
```

例如：

```mds
::: hero

--- title
# 构建更自然的文档

--- body
用 Markdown 写出网页级体验。

--- actions
[开始 -> /start]
[查看文档 => /docs]

:::
```

`--- title`、`--- body`、`--- actions` 是槽位，不是属性。

常见 slot：

```txt
--- title
--- body
--- media
--- actions
--- left
--- right
--- item
--- tab
--- panel
--- question
--- answer
```

slot 的好处是：
可以表达复杂结构，但不需要写 HTML。

---

# 9. 交互链接

MDS 不使用 `@click=xxx`。

统一使用动作链接。

## 9.1 页面跳转

```mds
[开始 -> /start]
```

语义：主操作跳转。

## 9.2 次级跳转

```mds
[了解更多 => /docs]
```

语义：次级操作跳转。

## 9.3 外部链接

```mds
[访问官网 >> https://example.com]
```

语义：外链。

## 9.4 动作触发

```mds
[展开详情 !toggle detail]
```

语义：触发 `toggle detail` 动作。

完整规则：

```txt
[文本 -> 目标]    主跳转
[文本 => 目标]    次级跳转
[文本 >> 目标]    外部跳转
[文本 !动作]      执行动作
```

示例：

```mds
::: details more
这里是更多内容。
:::

[展开更多 !toggle more]
```

---

# 10. 内置动作

MDS 内置一组简单动作。

```txt
!toggle name
!open name
!close name
!next name
!prev name
!play name
!pause name
!copy text
!submit name
!reset name
!route path
!back
!top
```

示例：

```mds
[打开菜单 !open menu]
[关闭菜单 !close menu]
[复制链接 !copy current-url]
[返回顶部 !top]
[提交表单 !submit contact]
```

动作仍然是声明式的，不允许直接写 JavaScript。

不允许：

```mds
[点击 !eval alert("hi")]
```

也不允许：

```mds
[点击 onclick="alert('hi')"]
```

---

# 11. 可展开内容 Details

```mds
::: details faq
# 什么是 MDS？

MDS 是 Markdown 的交互增强版本。
:::

[展开 FAQ !toggle faq]
```

也可以直接写：

```mds
::: details
# 什么是 MDS？

MDS 是 Markdown 的交互增强版本。
:::
```

如果没有名称，它就是一个自带展开行为的 details 组件。

---

# 12. Tabs

```mds
::: tabs

--- Markdown
Markdown 负责基础内容。

--- 交互
MDS 增加按钮、状态和动作。

--- 渲染
最终输出 HTML。

:::
```

也可以命名：

```mds
::: tabs docs

--- 基础
基础说明。

--- 高级
高级说明。

:::

[下一个 Tab !next docs]
[上一个 Tab !prev docs]
```

注意：

```mds
--- Markdown
```

这里的 `Markdown` 是 tab 标题，不是属性。

---

# 13. Accordion

```mds
::: accordion

--- 什么是 MDS？
MDS 是 Markdown 的交互扩展。

--- 它和 HTML 有什么区别？
MDS 写语义，HTML 是渲染结果。

--- 它和 MDX 有什么区别？
MDS 不要求作者写 JSX。

:::
```

---

# 14. Carousel

```mds
::: carousel gallery

--- item
![图一](1.png)

--- item
![图二](2.png)

--- item
![图三](3.png)

:::

[上一张 !prev gallery]
[下一张 !next gallery]
```

---

# 15. Dialog / Modal

```mds
::: dialog confirm-delete
# 确认删除？

这个操作不可恢复。

[取消 !close confirm-delete]
[确认删除 !submit delete]
:::

[删除 !open confirm-delete]
```

`dialog` 最终可以渲染成 HTML `<dialog>`，但作者不需要知道。

---

# 16. Drawer

```mds
::: drawer menu
# 菜单

- 首页
- 文档
- 关于

[关闭 !close menu]
:::

[打开菜单 !open menu]
```

---

# 17. 动画块

动画不写参数，而写语义。

## 17.1 reveal

```mds
::: reveal
# 滚动出现

当用户滚动到这里时，这块内容会出现。
:::
```

## 17.2 float

```mds
::: float
这个卡片会有轻微漂浮感。
:::
```

## 17.3 sticky

```mds
::: sticky
这个区域会在滚动时吸附。
:::
```

## 17.4 scene

```mds
::: scene
# 沉浸式场景

这里可以由主题渲染为动态背景、粒子、3D 或其他效果。
:::
```

动画块只表达意图：

```txt
reveal  进入视口时出现
float   轻微漂浮
sticky  滚动吸附
scene   沉浸式场景
motion  主题定义的动态区域
```

不要写：

```mds
::: reveal {duration=300 easing=ease-out delay=100}
```

这些参数交给主题。

---

# 18. 媒体语法

普通图片继续使用 Markdown：

```mds
![封面](cover.png)
```

增强媒体使用 `!类型 路径`。

## 18.1 视频

```mds
!video /media/demo.mp4
```

## 18.2 音频

```mds
!audio /media/bgm.mp3
```

## 18.3 嵌入网页

```mds
!embed https://example.com
```

## 18.4 3D 模型

```mds
!model /assets/robot.glb
```

## 18.5 图表

```mds
!chart /data/sales.json
```

## 18.6 地图

```mds
!map Singapore
```

规则：

```txt
!video
!audio
!embed
!model
!chart
!map
!file
!download
```

这些不是 HTML 标签，而是媒体意图。

---

# 19. 表单语法

表单一定要简单，不能变成 HTML form。

```mds
::: form contact

? name 文本 你的名字
? email 邮箱 你的邮箱
? message 长文本 留言内容

[提交 !submit contact]

:::
```

字段语法：

```txt
? 字段名 类型 提示文本
```

内置字段类型：

```txt
文本
邮箱
密码
数字
日期
时间
长文本
选择
开关
文件
```

示例：

```mds
::: form signup

? username 文本 用户名
? email 邮箱 邮箱地址
? password 密码 设置密码
? bio 长文本 简单介绍自己

[注册 !submit signup]

:::
```

选择字段可以这样写：

```mds
::: form survey

? role 选择 你的身份
- 开发者
- 设计师
- 产品经理
- 其他

[提交 !submit survey]

:::
```

这里的列表会自动归属到上一个字段。

---

# 20. 状态语法

MDS 可以有极简状态，但不要变成编程语言。

定义状态：

```mds
@state count 0
@state liked false
@state name ""
```

使用状态：

```mds
你点击了 {{ count }} 次。
```

修改状态：

```mds
[+1 !inc count]
[-1 !dec count]
[重置 !set count 0]
[喜欢 !toggle liked]
```

示例：

```mds
@state count 0

你点击了 {{ count }} 次。

[+1 !inc count]
[重置 !set count 0]
```

内置状态动作：

```txt
!set name value
!toggle name
!inc name
!dec name
!clear name
```

注意：
状态系统只支持简单值，不支持复杂 JS 表达式。

不允许：

```mds
{{ user.name.toUpperCase() }}
```

只允许：

```mds
{{ user.name }}
{{ count }}
{{ liked }}
```

---

# 21. 条件显示

为了保持简单，可以只支持一种条件块。

```mds
::: if liked
你已经喜欢了这篇文章。
:::
```

反向条件：

```mds
::: unless liked
你还没有点赞。
:::
```

示例：

```mds
@state liked false

[点赞 !toggle liked]

::: if liked
谢谢你的喜欢。
:::

::: unless liked
点个赞吧。
:::
```

---

# 22. 循环显示

可以支持简单列表循环，但不要做复杂模板语言。

```mds
@list features
- 简洁
- 生动
- 可扩展

::: each features
- {{ item }}
:::
```

更常见的是直接用语义块：

```mds
::: features
- 简洁：保持 Markdown 体验
- 生动：支持动画和交互
- 可扩展：主题和插件驱动
:::
```

所以 `each` 可以作为高级功能，不作为日常推荐。

---

# 23. 数据块

如果需要结构化数据，使用 `::: data 名称`。

```mds
::: data products
- name: MDS Basic
  price: 0
- name: MDS Pro
  price: 19
:::
```

然后组件可以引用：

```mds
::: pricing products
:::
```

这个意思是：

```txt
使用 products 数据渲染 pricing 组件。
```

注意：

```mds
::: pricing products
:::
```

这里 `products` 是数据名称，不是属性。

---

# 24. 代码演示块

普通代码块保持 Markdown 原样：

```js
console.log("hello")
```

交互式代码演示：

````mds
::: demo

--- preview
:button[点击我]

--- code
```html
<button>点击我</button>
```

:::
````

或者：

````mds
::: playground

```js
console.log("hello mds")
```

:::
````

---

# 25. 扩展组件

MDS 支持扩展，但语法仍然保持一致。

只要插件注册了某个块，就可以这样使用：

```mds
::: timeline
- 2024：项目启动
- 2025：发布测试版
- 2026：正式发布
:::
```

或者：

```mds
::: x-game-card
# 弹幕反击

一款反弹敌人子弹的 roguelite 小游戏。
:::
```

建议约定：

```txt
官方内置块：hero、card、tabs、form
插件扩展块：x-xxx
项目私有块：p-xxx
```

例如：

```mds
::: x-spline-scene
!model /scene.glb
:::
```

MDS 解析器不需要知道 `x-spline-scene` 是什么。
它只需要把这个块交给插件渲染。

---

# 26. 注释

MDS 可以支持注释：

```mds
%% 这是一条注释，不会渲染 %%
```

多行注释：

```mds
%%%
这里是多行注释。

不会被渲染。
%%%
```

---

# 27. 转义

如果用户想输出 MDS 特殊符号，可以使用反斜杠。

```mds
\::: hero
\[开始 -> /start]
\!video demo.mp4
\@state count 0
```

---

# 28. 完整示例

```mds
---
title: MDS Demo
theme: aurora
layout: landing
---

@state count 0
@state liked false

::: hero
# 像写 Markdown 一样写网页

MDS 让内容作者不用 HTML，也能写出丰富的交互页面。

[开始 -> /docs]
[查看示例 => /examples]
:::

::: reveal
## 为什么不是 HTML？

HTML 很强，但对内容作者来说太重。

MDS 只让你写语义。
:::

::: features
- 简洁：继承 Markdown 的书写体验
- 交互：支持按钮、展开、弹窗、表单
- 动画：通过 reveal、float、scene 等语义块表达
- 扩展：通过主题和插件渲染成真正的 HTML
:::

::: tabs docs

--- 内容
Markdown 负责正文、标题、列表、引用和代码。

--- 交互
MDS 通过动作链接表达交互。

--- 渲染
最终由渲染器输出 HTML、CSS 和运行时 JS。

:::

::: card
# 点击计数

你点击了 {{ count }} 次。

[+1 !inc count]
[重置 !set count 0]
:::

[喜欢 !toggle liked]

::: if liked
谢谢你的喜欢。
:::

::: details faq
# 什么是 MDS？

MDS 是一种继承 Markdown，但面向交互页面的新标记语言。
:::

[展开 FAQ !toggle faq]

::: dialog contact-dialog
# 联系我们

::: form contact
? name 文本 你的名字
? email 邮箱 你的邮箱
? message 长文本 留言内容

[提交 !submit contact]
:::

[关闭 !close contact-dialog]
:::

[联系我们 !open contact-dialog]

::: footer
Made with MDS.
:::
```

---

# 29. 语法总览

最终 MDS v0.1 的核心语法只有这些：

```txt
---             frontmatter
::: block       语义块开始
:::             语义块结束
--- slot        块内部槽位
[文本 -> 目标]   主跳转
[文本 => 目标]   次级跳转
[文本 >> 目标]   外链
[文本 !动作]     执行动作
!media path     媒体指令
? name type text 表单字段
@state name value 状态定义
{{ name }}      状态插值
::: if name     条件显示
::: unless name 反向条件
::: data name   数据块
%% 注释 %%       注释
```

这套语法的特点是：

```txt
没有 HTML 标签
没有 JSX
没有 key=value 属性
没有复杂事件绑定
没有 CSS 参数
没有动画参数
```

但仍然可以表达：

```txt
页面结构
卡片
提示
网格
分栏
Tab
折叠面板
轮播
弹窗
抽屉
表单
状态
动作
动画
媒体
数据
```

---

核心原则是：

> **语法只负责表达意图，不负责描述实现细节。**

复杂度应该被放在：

```txt
主题 theme
组件 component
动作 action
动画 motion
插件 plugin
渲染器 renderer
```

而不是放在 `.mds` 文件里。
