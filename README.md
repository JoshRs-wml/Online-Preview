# 轻量级纯前端文件在线预览工具 (Online-Preview)

本项目是一个专门为企业业务系统（如 ERP、MES、SRM、CRM）打造的**极轻量、纯前端、零后端转换依赖**的文件在线预览组件库。

它摒弃了庞大的第三方商业/开源预览引擎库，采用自研解析策略，以极低的内存开销实现对常用办公文件的秒级预览，尤其适合单据附件批量审核、归档浏览等高频操作场景。

## ✨ 核心特性

- **纯前端零依赖**：不需要额外部署任何 Java/Python 的文件转换服务（如 OpenOffice 转 PDF），拿到文件 URL 即可在浏览器端直接渲染。
- **极致轻量自研组件**：
  - `CustomExcelViewer`：自研解析 XLSX 的 XML 结构，摒弃臃肿的 canvas/exceljs 引擎，还原经典 Excel 表格边框与行列头，支持 Hover 高亮。
  - `CustomDocxViewer`：自研解析 DOCX 的 XML 结构，极速提取段落文本，适合只读审核场景。
  - `CustomPdfViewer`：0 负担封装浏览器原生 PDF 引擎，不引入 MB 级的 pdf.js。
  - `CustomVideoViewer`：沉浸式防下载（`nodownload`）HTML5 视频播放器，限制最大高度防撑爆。
- **批量预览工作台**：自带“左侧队列 + 右侧预览”经典布局，支持批量传入文件列表，通过快捷按钮无缝“上一份/下一份”切换。
- **丰富的操作矩阵**：内置了放大、缩小、还原比例、顺时针/逆时针旋转、水平/垂直翻转、全屏、一键下载功能。
- **工业级稳定性（4 重防御）**：
  - **网络防抖**：切换文件时利用 `AbortController` 瞬间切断上一文件的下载与解析，防止连续点击卡死。
  - **大小拦截**：加载前读取 `Content-Length`，对超大文件（如 >10MB 的 Excel）强制降级至下载模式，保护浏览器内存。
  - **DOM 截断**：长表格（>500行）、长文档（>2000段）采取截断渲染策略，杜绝页面假死。
  - **异常兜底**：全面捕获解压与解析异常，损坏文件优雅降级展示“错误状态页”。

## 📦 支持格式

| 格式分类 | 支持扩展名 | 渲染策略 |
| :--- | :--- | :--- |
| **文档** | `.docx` | 自研 XML 提取，原生 `<p>` 标签渲染 |
| **表格** | `.xlsx`, `.xls` | 自研 ZIP 解压 + XML 映射，原生 `<table>` 渲染 |
| **PDF** | `.pdf` | 浏览器原生引擎 (Iframe) |
| **图片** | `.jpg`, `.png`, `.gif`, `.svg`, `.webp` | 原生 `<img>` 标签结合 CSS Transform (支持翻转/旋转) |
| **视频** | `.mp4`, `.webm`, `.ogg` | 原生 `<video>` 标签，禁用下载按钮 |

## 🚀 快速开始

### 1. 环境准备
确保你已安装 Node.js (推荐 v18+)。

### 2. 安装与运行
```bash
# 克隆仓库
git clone https://github.com/JoshRs-wml/Online-Preview.git

# 进入目录
cd Online-Preview

# 安装依赖 (仅包含 Vue3, Element Plus, JSZip 等轻量库)
npm install

# 启动开发服务器
npm run dev
```
启动后访问 `http://localhost:5173` 即可看到内置了多份真实测试数据的预览工作台。

## 💡 如何接入你的业务系统 (ERP/MES)

本系统设计为“低侵入”模式，你有两种最简单的接入方式：

### 方式一：作为独立预览服务 (Iframe / URL 跳转)
将本项目打包部署到如 `http://preview.your-company.com`。
在你的 ERP 系统点击“附件预览”时，通过 URL 传参（或 PostMessage）把文件列表告诉预览页：
```html
<iframe src="http://preview.your-company.com?fileUrl=https://erp.com/api/download/123.xlsx"></iframe>
```
*注：你只需稍微修改 `App.vue` 中的 `mounted` 逻辑，让它从 URL 读取 `fileUrl` 并推入 `fileList` 即可。*

### 方式二：提取组件直接融合
本项目完全模块化，你可以直接把 `src/components/` 目录下的 `CustomXxxViewer.vue` 文件复制到你现有的 Vue3 项目中，像普通组件一样直接使用：
```vue
<template>
  <CustomExcelViewer :src="yourFileUrl" @error="handleError" />
</template>

<script setup>
import CustomExcelViewer from './components/CustomExcelViewer.vue'
// ...
</script>
```

## 🛠️ 技术栈

- **框架**：Vue 3 + Vite
- **UI 组件库**：Element Plus (仅用于按钮、提示框和布局壳子)
- **解压核心**：JSZip (仅用于 `.docx` 和 `.xlsx` 的前端解压)
- **渲染核心**：纯原生 DOM / HTML5 API

## 📝 许可证

MIT License