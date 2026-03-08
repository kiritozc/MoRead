# 📜 墨读 (MoRead)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/Framework-Flask-green?style=flat-square&logo=flask" alt="Flask">
  <img src="https://img.shields.io/badge/OCR-PaddleOCR-orange?style=flat-square" alt="PaddleOCR">
  <img src="https://img.shields.io/badge/GPU-CUDA-purple?style=flat-square&logo=nvidia" alt="CUDA">
</p>

<p align="center">
  <b>智能古籍文字识别与数字化工具</b><br>
  <sub>专为古籍、书法、竖排文本优化的OCR解决方案</sub>
</p>

---

## ✨ 核心特性

### 🎯 古籍专属优化
- **竖排文字智能识别** - 针对古籍从右至左、从上至下的排版特点深度优化
- **古文顺序复制** - 一键按传统阅读顺序复制识别结果，保留古籍原有的阅读体验
- **多字体支持** - 完美识别楷体、宋体、隶书等传统书法字体

### 📄 多格式支持
- **图片格式**: PNG, JPG, JPEG, BMP
- **文档格式**: PDF（自动分页识别）
- **批量处理**: 支持多文件同时上传，一键批量识别

### 🔧 强大的后处理功能
- **在线编辑** - 识别结果支持实时修改与校对
- **多视图预览** - 原图 / 标注图 / 纯文字图三视图切换
- **历史记录** - 自动保存识别记录，随时回溯查看
- **JSON导出** - 结构化数据导出，便于二次开发

---

## 🚀 快速开始

### 环境要求

```bash
Python 3.10+
CUDA 12.0+ (GPU加速可选)
```

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/moread.git
cd moread

# 2. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 启动应用
python app.py
```

### 访问应用

启动后自动打开浏览器，或手动访问：
```
http://127.0.0.1:5005
```

---

## 📖 使用指南

### 单文件识别

1. 点击上传区域或拖拽文件至页面
2. 支持图片（PNG/JPG/BMP）和 PDF 文档
3. 等待识别完成，查看结果

### 批量识别

1. 选择多个文件（按住 Ctrl/Cmd 可多选）
2. 系统自动依次处理，显示进度
3. 完成后可逐个查看或批量导出

### 古文复制

识别完成后，点击「**复制古文顺序**」按钮，系统将按照传统竖排阅读顺序（从右到左、从上到下）整理并复制文字内容。

### 编辑与校对

- 点击识别结果中的任意文字块
- 直接修改识别错误的文字
- 修改后自动重新生成预览图

---

## 🛠 技术架构

```
┌─────────────────────────────────────────────────┐
│                    前端层                        │
│              HTML5 + JavaScript                 │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│                   服务层                         │
│              Flask Web Server                  │
│         RESTful API + 静态文件服务               │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│                  OCR引擎层                        │
│            PaddleOCR PP-OCRv5                   │
│      文字检测 (Det) + 文字识别 (Rec)             │
│              支持 GPU 加速                      │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│                 文件处理层                        │
│      PDF转图片 · 图像预处理 · 结果生成           │
└─────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
moread/
├── app.py                 # Flask 应用主入口
├── ocr_engine.py          # OCR 核心引擎
├── pdf_utils.py           # PDF 处理工具
├── requirements.txt       # Python 依赖
├── models/                # OCR 模型文件
│   ├── PP-OCRv5_server_det/   # 文字检测模型
│   └── PP-OCRv5_server_rec/   # 文字识别模型
├── static/                # 静态资源
│   ├── css/
│   └── js/
├── templates/             # HTML 模板
│   └── index.html
├── uploads/               # 上传文件存储
├── outputs/               # 识别结果存储
└── fonts/                 # 字体文件
```

---

## ⚙️ 配置说明

### GPU 加速

默认启用 CUDA 加速，如需使用 CPU 模式，请修改 `requirements.txt`：

```diff
- paddlepaddle-gpu==3.2.0
+ paddlepaddle==3.2.0
```

### 端口配置

编辑 `app.py` 修改服务端口：

```python
app.run(host='0.0.0.0', port=5005)  # 修改端口号
```

### 文件大小限制

```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
```

---

## 🔍 依赖列表

| 类别 | 依赖项 | 版本 |
|:---|:---|:---|
| **Web框架** | Flask | 3.1.3 |
| | Werkzeug | 3.1.6 |
| **OCR核心** | paddleocr | 3.2.0 |
| | paddlepaddle-gpu | 3.2.0 |
| | paddlex | 3.2.1 |
| **图像处理** | opencv-contrib-python | 4.10.0.84 |
| | Pillow | 12.1.1 |
| | pdf2image | 1.17.0 |
| | pypdfium2 | 5.5.0 |
| | imagesize | 1.4.1 |
| **PDF处理** | shapely | 2.1.2 |
| | pyclipper | 1.4.0 |

---

## 📝 API 接口

### 上传识别

```http
POST /upload
Content-Type: multipart/form-data

files: <file>
```

**响应:**
```json
{
  "session_id": "uuid",
  "results": [{
    "original": "/uploads/...",
    "result": "/outputs/...",
    "text_only": "/outputs/...",
    "page": "filename",
    "texts": [{"text": "", "box": [], "score": 0.99}]
  }]
}
```

### 获取历史记录

```http
GET /api/history
```

### 更新识别文字

```http
PUT /api/history/{session_id}/texts
Content-Type: application/json

{
  "page": "filename",
  "index": 0,
  "text": "修正后的文字"
}
```

---

## 🐛 常见问题

<details>
<summary><b>Q: PDF 识别失败怎么办？</b></summary>

确保已安装 PDF 处理依赖：
```bash
pip install pdf2image pypdfium2
```

</details>

<details>
<summary><b>Q: GPU 识别速度慢？</b></summary>

首次运行需要加载模型到显存，后续识别会加速。确保 CUDA 和 cuDNN 正确安装。

</details>



---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

```bash
# 1. Fork 本仓库
# 2. 创建特性分支
git checkout -b feature/AmazingFeature
# 3. 提交更改
git commit -m 'Add some AmazingFeature'
# 4. 推送分支
git push origin feature/AmazingFeature
# 5. 打开 Pull Request
```

---

## 📜 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  <b>墨读</b> - 让古籍数字化更简单
</p>

<p align="center">
  Made with ❤️ for ancient book digitization
</p>
