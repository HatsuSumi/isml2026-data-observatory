# 🌟 ISML 2026 数据观测项目

---

## 🚨 **温馨提示**
> ⚠️ **建议使用电脑端谷歌浏览器打开，移动端和其他浏览器一定会有兼容性问题，因为一人开发，在时间精力成本的影响下没有适配移动端布局。**


## 📖 **项目简介**
本项目致力于为**国际最萌大会2026赛季**提供全面的数据服务，包括：

- 📊 **赛事数据展示与分析**
- 📈 **角色数据统计与对比**
- 📅 **赛程安排与进度追踪**

## 🌐 **在线访问**
🔗 [ISML 2026 数据观测](https://hatsusumi.github.io/isml2026-data-observatory/)

## 🧰 **技术栈**

- **页面结构**：HTML5
- **样式**：原生 CSS3，按页面和功能拆分样式文件
- **交互逻辑**：原生 JavaScript，使用 ES Modules 组织代码
- **数据加载**：浏览器 Fetch API，读取项目内 JSON 数据文件
- **页面模板**：通过 `template-loader.js` 加载和插入公共 Header、Footer 等模板
- **外部依赖**：
  - [Font Awesome](https://fontawesome.com/)：页面图标
  - [Highlight.js](https://highlightjs.org/)：对比指南中的代码高亮
- **部署**：[GitHub Pages](https://pages.github.com/)

## 🏠 **开发环境**

本项目为居家开发，没有工作，也没有收入。在孤独和抑郁症的陪伴下，独自完成项目的设计、开发与维护。

## 🗂️ **项目结构**

```text
ISML2026/
├── index.html              # 首页
├── pages/                  # 各功能页面
│   ├── comparison/         # 数据对比页面
│   ├── schedule/           # 赛事日程页面
│   ├── statistics/         # 数据统计页面
│   ├── characters-data/    # 角色数据页面
│   ├── characters-detail/  # 角色详情页面
│   ├── events-data/        # 赛事数据页面
│   ├── tables/             # 数据表格页面
│   ├── visualization/      # 数据可视化页面
│   ├── gallery/            # 图库页面
│   ├── groups/             # 分组页面
│   ├── rules/              # 规则页面
│   └── about/              # 关于页面
├── css/                    # 样式文件
│   ├── common/             # 公共样式
│   ├── comparison/         # 对比页面样式
│   ├── schedule/           # 日程页面样式
│   └── ...                 # 其他功能页面样式
├── js/                     # JavaScript 模块
│   ├── common/             # 公共模块和模板加载器
│   ├── comparison/         # 对比功能模块
│   ├── schedule/           # 日程功能模块
│   ├── statistics/         # 统计功能模块
│   └── ...                 # 其他功能模块
├── data/                   # JSON 数据文件
├── images/                 # 图片资源
├── templates/              # Header、Footer、Navbar 等公共模板
├── scripts/                # 项目辅助脚本
└── README.md               # 项目说明文档
```

---

## 📊 项目规模

### 文件统计

- **总文件数**：269 个
  - JavaScript文件：112 个
  - CSS文件：79 个
  - JSON文件：24 个
  - HTML文件：22 个
  - 其他文件：13 个
  - Markdown文档：2 个

### 代码规模

- **代码总行数**：132,240 行（不含空行、注释）
  - JSON：106,486 行（80.5%）
  - JavaScript：11,842 行（9.0%）
  - CSS：11,107 行（8.4%）
  - HTML：2,805 行（2.1%）

- **字符总数**：3,559,814 字符（不含注释）
  - JSON：2,706,423 字符（76.0%）
  - JavaScript：490,253 字符（13.8%）
  - CSS：240,828 字符（6.8%）
  - HTML：122,310 字符（3.4%）

### 资源文件

- **资源文件总数**：17 个
- **资源文件总大小**：753.04 KB
  - 图片文件：5 个文件，478.37 KB
  - Office文档：12 个文件，274.68 KB

> 💡 **数据来源**：以上所有项目规模数据均基于 `scripts\project_stats.py` 脚本自动统计生成

---

## 🎯 **主要功能**

### 🏠 **首页**
- **概览**：展示角色最新的参赛情况

### 🗓️ **赛事日程**
- **时间线形式**：交互式查看赛事进程和日程安排
- **图片形式**：静态展示整体赛程

### 📊 **数据展示**
- **赛事数据**：展示投票数据和赛事进程
- **角色数据**：展示个人每场赛事的表现

### 🔍 **数据对比**
- **角色数据对比**：支持多种对比方式，包括一对一、基准、平均值、分组等多维度分析
- **赛事数据对比**：分析不同赛事的数据变化

### 📈 **数据统计**
- **提名阶段统计**：分析提名阶段的角色分布情况
- **主赛事阶段统计**：分析每位角色的数据表现

### 🖼️ **图库**
- **海报展示**：展示本赛季所有荣誉海报  

---

## 🔗 **相关链接**
- [哔哩哔哩主页](https://b23.tv/KBky1wX)
- [ISML 官网](https://www.internationalsaimoe.com/)
- [个人网站，作品集，遗书](https://hatsusumi.github.io/FinalTestamentProofILived/)

## 👤 **开发者**
**初雪戈墨**

## 💖 **支持项目**
如果你喜欢这个项目，欢迎：
- 🌟 **Star** 本项目
- 🌐 **与更多人分享这个项目**
- ☕ [**请作者喝杯咖啡**](https://hatsusumi.github.io/isml2026-data-observatory/pages/about/about.html?from=github)
