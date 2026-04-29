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
   nav_order: 数字 # 按显示顺序设置，1为最先显示
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
       url: /docs/文档文件名/ # 去掉 .md 扩展名
   ```

3. **更新首页 `index.md`** (可选但推荐):

   ```markdown
   - [文档标题](/docs/文档文件名/) - 简短描述
   ```

4. **验证文件命名**:
   - 文件名避免特殊字符和空格（中文文件名可用）
   - URL 会自动基于文件名生成，无需 `.md` 扩展名

5. **格式化文档（强制执行）**: 运行prettier自动格式化所有markdown文档，保证格式统一：
   ```bash
   prettier --write "*.md" "docs/*.md" --prose-wrap always --tab-width 2
   ```

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
      url: /docs/文件名/ # 注意: 无 .md 扩展名
  ```

### 5. Sass 弃用警告处理

- **问题**: 运行 `make run` 时显示
  `DEPRECATION WARNING [import]: Sass @import rules are deprecated` 警告
- **原因**: Just the Docs 主题使用旧的 Sass `@import` 语法，Dart Sass
  3.0.0 将移除该语法
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

Deployed via GitHub Actions. Push to `main` branch triggers automatic
deployment.

---

## Skills 配置（Claude 自动执行规则

### Prettier 格式化 Skill

#### 触发条件

- ✅ 新增markdown文档时自动触发
- ✅ 修改现有markdown文档时自动触发
- ✅ 文档格式检查时自动触发

#### 功能

自动统一格式化所有markdown文档，确保：

- 表格前后空行正确
- 段落空行规范
- 代码块格式统一
- 缩进统一使用2空格
- 长文本自动折行

#### 调用命令

```bash
prettier --write "*.md" "docs/*.md" --prose-wrap always --tab-width 2
```

#### 强制执行规则

所有markdown文档在提交前必须经过prettier格式化，未格式化的文档不允许合并到main分支。

---

### 新增文档自动化 Skill
#### 触发条件
- ✅ 用户要求添加新文档/新增md文件时自动触发
- ✅ 提供文档标题和内容时自动执行全流程

#### 功能
自动完成新增文档的所有标准化步骤，无需人工干预每个环节。

#### 执行流程（自动按顺序执行）
```mermaid
flowchart LR
    A[接收文档信息] --> B[创建docs/xxx.md文件<br>自动添加front matter]
    B --> C[更新_data/navigation.yml<br>添加侧边栏导航]
    C --> D[更新index.md<br>添加首页链接和更新记录]
    D --> E[运行prettier格式化<br>统一所有文档格式]
    E --> F{本地验证?}
    F -->|是| G[运行make build验证构建]
    F -->|否| H[流程完成]
```

#### 具体步骤说明
1. **创建文档文件**
   - 文件名使用英文/中文，避免特殊字符
   - 自动添加标准front matter：
     ```yaml
     ---
     title: 文档标题
     layout: page
     nav_order: 自动分配序号
     date: 当前日期(YYYY-MM-DD)
     ---
     ```
   - 自动添加文档摘要和目录结构

2. **更新导航配置**
   - 在`_data/navigation.yml`的对应分类下添加新文档链接
   - URL格式：`/docs/文件名/`（自动去掉.md后缀）

3. **更新首页**
   - 在`index.md`的对应分类下添加文档链接，使用`{% link %}`标签格式
   - 在「最近更新」列表最上方添加更新记录：`- 日期: 新增 文档标题`

4. **自动格式化**
   运行prettier统一格式化所有修改过的markdown文件：
   ```bash
   prettier --write "*.md" "docs/*.md" --prose-wrap always --tab-width 2
   ```

5. **可选验证**
   如果用户需要，自动运行`make build`验证站点是否能正常构建。

#### 调用方式
用户只需提供：
- 文档标题
- 文档内容（可选，如果内容过长可分步提供）
- 分类名称（默认：分布式）

Claude会自动完成所有流程，无需用户手动执行每个步骤。
