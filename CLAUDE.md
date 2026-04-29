# BuzzCrow's Docs

GitHub Pages site powered by Jekyll + Just the Docs theme.

## Site Structure

```
├── _config.yml        # Jekyll config (title, theme, URL, search)
├── _data/
│   └── navigation.yml # Sidebar navigation structure
├── docs/              # Documentation pages (Markdown)
├── index.md           # Home page
└── .github/workflows/
    └── pages.yml      # GitHub Actions deployment
```

## Adding New Docs

### 完整步骤清单

1. **创建 Markdown 文件在 `docs/` 目录**:
   ```markdown
   ---
   title: 文档标题
   layout: page
   nav_order: 数字  # 按显示顺序设置，1为最先显示
   ---

   # 文档标题

   > 可选：文档摘要或说明

   ## 目录
   1. [章节一](#章节一)
   2. [章节二](#章节二)
   ```

2. **更新导航文件 `_data/navigation.yml`**:
   ```yaml
   分类名称:
     - title: 文档标题
       url: /docs/文档文件名/  # 去掉 .md 扩展名
   ```

3. **更新首页 `index.md`** (可选但推荐):
   ```markdown
   - [文档标题](/docs/文档文件名/) - 简短描述
   ```

4. **验证文件命名**:
   - 文件名避免特殊字符和空格（中文文件名可用）
   - URL 会自动基于文件名生成，无需 `.md` 扩展名

### URL 结构

URLs 基于文件路径。对于 `docs/分布式一致性.md`，URL 是 `/docs/分布式一致性/`。

### 本地开发验证

```bash
bundle install
bundle exec jekyll serve
# 预览地址: http://localhost:4000
```

## 常见问题与解决方案

### 1. 首页导航位置
- 首页 (`index.md`) 应添加 `nav_order: 0` 以确保在侧边栏中显示在第一位
- 示例 front matter:
  ```yaml
  ---
  title: 首页
  layout: home
  nav_order: 0
  ---
  ```

### 2. 首页中的文档链接格式
- 在首页 Markdown 文件中，文档链接应使用 Jekyll 的 `{% link %}` 标签
- 正确格式: `[文档标题]({% link docs/文件名.md %})`
- 错误格式: `[文档标题](/docs/文件名/)` 或 `[文档标题](docs/文件名.md)`
- `{% link %}` 标签会自动生成正确的 HTML 文件路径

### 3. 导航分类名称
- 确保 `_data/navigation.yml`、`index.md` 和 `README.md` 中的分类名称一致
- 当前分类名称: **分布式**

### 4. 侧边栏导航配置
- `_data/navigation.yml` 中使用 Jekyll URL 格式 (无 `.md` 扩展名)
- 示例:
  ```yaml
  分类名称:
    - title: 文档标题
      url: /docs/文件名/  # 注意: 无 .md 扩展名
  ```

### 5. Sass 弃用警告处理
- **问题**: 运行 `make run` 时显示 `DEPRECATION WARNING [import]: Sass @import rules are deprecated` 警告
- **原因**: Just the Docs 主题使用旧的 Sass `@import` 语法，Dart Sass 3.0.0 将移除该语法
- **解决方案**: 已在 Makefile 中设置 `RUBYOPT="-W0"` 环境变量抑制所有 Ruby 警告
- **影响**: 警告不影响站点功能，只是提示未来版本中的语法变化
- **验证**: 运行 `make build` 或 `make run` 时不再显示相关警告

## Local Development

```bash
bundle install
bundle exec jekyll serve
# Preview at http://localhost:4000
```

## GitHub Pages

Deployed via GitHub Actions. Push to `main` branch triggers automatic deployment.
