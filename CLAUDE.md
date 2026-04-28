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

1. Create a Markdown file in `docs/`:
   ```markdown
   ---
   title: Your Doc Title
   layout: page
   nav_order: 2
   ---

   # Your content...
   ```

2. Add entry to `_data/navigation.yml`:
   ```yaml
   category:
     - title: Your Doc Title
       url: /docs/your-doc-filename/
   ```

## URL Structure

URLs are based on file paths. For `docs/分布式一致性深度解析 理论演进 模型光谱与工程权衡.md`, the URL is `/docs/分布式一致性深度解析%20理论演进%20模型光谱与工程权衡/`.

## Local Development

```bash
bundle install
bundle exec jekyll serve
# Preview at http://localhost:4000
```

## GitHub Pages

Deployed via GitHub Actions. Push to `main` branch triggers automatic deployment.
