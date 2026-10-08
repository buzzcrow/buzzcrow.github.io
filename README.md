# CROWDB Blog

A Jekyll engineering blog for Gian Crow and CROWDB. Public copy is English;
editorial and design rules live in [AGENTS.md](AGENTS.md).

**Production URL:** https://buzzcrow.github.io  
**Product site:** https://crowdb.dev  
**Product repository:** https://github.com/buzzcrow/crowdb

## Local development

Use the checked-in Pixi environment. It installs Ruby 3.3 and keeps Bundler gems
under `.pixi/`, isolated from the system Ruby. From this directory:

```sh
pixi install
pixi run serve
# Open http://localhost:4000
```

Production build:

```sh
pixi run build
```

The first `pixi run` installs the Gemfile dependencies into `.pixi/bundle`.


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
The local Pixi task installs the Ruby/Jekyll dependencies into `.pixi/` and runs the
same production build used for validation. GitHub Actions continues to use Ruby and
Bundler through `ruby/setup-ruby`.
The complete package includes a static Pages workflow alternative that does not
require Ruby. Do not edit a snapshot and expect it to update the Markdown source.

The site uses system fonts, local SVGs and local JavaScript. There is no analytics
script, signup backend or live database connection. Browser demonstrations belong
to the separate main site and are clearly labelled illustrations.
