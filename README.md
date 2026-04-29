# BuzzCrow 技术文档站点

基于 Jekyll + Just the
Docs 构建的技术文档站点，专注于分布式系统、数据库和软件工程的深度解析。

## 🌐 在线访问

- **站点地址**:
  [https://buzzcrow.github.io/buzzcrow.github.io/](https://buzzcrow.github.io/buzzcrow.github.io/)
- **GitHub 仓库**:
  [https://github.com/buzzcrow/buzzcrow.github.io](https://github.com/buzzcrow/buzzcrow.github.io)

## 🛠 技术栈

- **静态站点生成器**: [Jekyll](https://jekyllrb.com/) 4.4.1
- **主题**: [Just the Docs](https://just-the-docs.github.io/just-the-docs/)
  0.12.0
- **部署**: GitHub Pages
- **持续集成**: GitHub Actions

## 🚀 本地开发

### 前置要求

- Ruby 3.0+
- Bundler 2.0+

### 使用 Makefile 命令

项目提供了完整的 Makefile 用于本地开发和验证：

```bash
# 查看所有可用命令
make help

# 安装 Ruby 依赖（首次使用）
make install

# 构建静态站点到 _site/ 目录
make build

# 构建并启动本地服务器（默认命令）
make run          # 或直接 make

# 启动带文件监视功能的服务器（推荐开发时使用）
make watch

# 清理生成的文件
make clean

# 运行构建测试
make test

# 检查环境配置
make check
```

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/buzzcrow/buzzcrow.github.io.git
cd buzzcrow.github.io

# 2. 安装依赖
make install

# 3. 启动本地服务器
make run
```

服务器启动后，在浏览器中访问：[http://localhost:4000/buzzcrow.github.io/](http://localhost:4000/buzzcrow.github.io/)

### 添加新文档

参考 [CLAUDE.md](CLAUDE.md) 中的完整步骤清单，主要包括：

1. 在 `docs/` 目录创建 Markdown 文件
2. 更新 `_data/navigation.yml` 导航配置
3. 更新 `index.md` 首页链接（可选）
4. 使用 `make run` 验证

## 📁 项目结构

```
.
├── _config.yml           # Jekyll 配置
├── _data/navigation.yml  # 侧边栏导航配置
├── docs/                 # 文档内容（Markdown）
├── index.md             # 首页
├── Makefile             # 构建和开发命令
├── CLAUDE.md            # 项目指令和文档添加指南
├── Gemfile              # Ruby 依赖管理
└── .github/workflows/   # GitHub Actions 配置
```

## 🔄 部署

站点通过 GitHub Pages 自动部署：

- 推送到 `main` 分支时自动触发构建
- 构建配置位于 `.github/workflows/pages.yml`
- 生成的站点发布到 `gh-pages` 分支

## 📝 文档规范

- 使用 Markdown 格式编写
- 文档标题使用中文，便于国内读者
- 包含清晰的目录结构
- 使用表格、代码块等增强可读性
- 遵循 Jekyll 的 front matter 规范

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进文档或修复问题。

## 📄 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE) 文件。
