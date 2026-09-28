# CROWDB Blog

A Jekyll engineering blog for Gian Crow and CROWDB. Public copy is English;
editorial and design rules live in [AGENTS.md](AGENTS.md).

**Production URL:** https://buzzcrow.github.io  
**Product site:** https://crowdb.dev  
**Product repository:** https://github.com/buzzcrow/crowdb

## Local development

Use Ruby 3.3 and Bundler. From this directory:

```sh
bundle install
bundle exec jekyll serve
# Open http://localhost:4000
```

Production build:

```sh
JEKYLL_ENV=production bundle exec jekyll build
```

The public URL is a user-site root, with `baseurl: ""`. The delivered navigation
assumes that root. Moving to a repository subpath requires auditing root-relative
links, not just changing `baseurl`.

## Publish

Set repository Settings → Pages → Source to **GitHub Actions**. The included
`.github/workflows/pages.yml` builds and deploys main-branch changes. The workflow
retains the current action major versions used in the original repository.

Create posts in `_posts/`; the landing page, feed and sitemap update automatically.
Use `featured: true` on only one article. See AGENTS.md for front matter and voice.

## First migration

Read [MIGRATION.md](MIGRATION.md) before replacing files. In particular, remove the
old `index.md` because `index.html` now owns the home route. Do not delete `.git`
or unrelated articles/assets. Check any existing Gemfile.lock against this Gemfile.

## Validation boundary

The delivery contains a separately generated `blog-static/` snapshot for instant
preview and optional deployment. It is **not** claimed to be a Jekyll build output.
Static routes, responsive layouts and interactions were checked in Chromium.
Ruby/Jekyll dependencies could not be installed in the delivery environment, so
run the real Jekyll production build locally or in Actions before publishing.
The complete package includes a static Pages workflow alternative that does not
require Ruby. Do not edit a snapshot and expect it to update the Markdown source.

The site uses system fonts, local SVGs and local JavaScript. There is no analytics
script, signup backend or live database connection. Browser demonstrations belong
to the separate main site and are clearly labelled illustrations.
