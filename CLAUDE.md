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

## Local Development

```bash
bundle install
bundle exec jekyll serve
# Preview at http://localhost:4000
```

## GitHub Pages

Deployed via GitHub Actions. Push to `main` branch triggers automatic deployment.
