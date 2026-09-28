# CROWDB Journal — editorial and site rules

This is Gian Crow’s engineering journal at https://buzzcrow.github.io.
The product homepage, documentation and demos live at https://crowdb.dev.
Product source of truth: https://github.com/buzzcrow/crowdb.

## Voice and language

Publish all public UI and articles in English. Credit writing to **Gian Crow**.
Keep the perspective of an experienced storage engineer, not an anonymous
marketing team. Use `I` for personal experience and `we` for project decisions.
Do not invent experience, customer stories, benchmark results or testimonials.
The author is Chinese: write direct, natural English without forcing American
idioms, jokes or elaborate metaphors. Do not deliberately add grammatical errors.

Give a paragraph one job. Name the workload and boundary before introducing a
component. Use a concrete example when an abstraction is difficult to follow.
Vary paragraph length; do not turn every section into a three-item list or end
every section with a summary. A short conclusion is stronger than an adjective.
Preserve useful uncertainty and rejected assumptions in investigations.

Use **CROWDB** for the product; keep literal component identifiers in their
original spelling, such as `crowdb-kv`. Keep the product visible without inserting
a sales pitch between technical sections. One useful action near the end is enough.

Avoid canned scene-setting, unnecessary rhetorical questions, false dichotomies,
repetitive “not X, but Y” constructions and generic AI/marketing language. Do not
use “delve into”, “game-changer”, “revolutionary”, “seamless” or “ultimate” as a
substitute for explaining a mechanism.

## Evidence before promotion

Read the current project README, relevant design document and release guide before
publishing product claims. Put the limitation next to the capability it qualifies.
Implemented, being tested, planned and production-proven are different statements.
An architecture diagram is not a performance result; a Docker command is not
proof that a registry tag is published.

As checked on 2026-09-28: core S3 and native Iceberg have working implementations;
Dataset, topology-aware native access and direct GPU delivery remain planned.
The `0.1.0-dev` container is for disposable evaluation data, not production.
Recheck these facts for every release; this paragraph is not a permanent roadmap.
S3 uploads do not register Iceberg tables. Do not draw object payloads as passing
sequentially through the distributed KV foundation. Distinguish dependency maps
from actual data flow, and distinguish designed capability from container limits.

Measured claims need hardware, workload, dataset, concurrency, baseline and scope.
Compatibility requires a cited acceptance test, not the presence of a familiar API.
Do not imply complete Spark/Flink/Trino support without corresponding evidence.
Use repository links as technical references. Preserve publication dates and URLs;
add `last_modified_at` when an existing article changes materially.

## Editorial reference points

Use these as editing lenses, never as wording or visual templates:

- **Cloudflare:** a clear technical thesis and precise request paths.
- **NVIDIA:** workload bottlenecks, mechanisms, diagrams and measurement conditions.
- **ScyllaDB:** honest investigations, including useful false leads.
- **Cockroach Labs:** explain the constraints that justify owning a new component.
- **Dropbox Tech:** introduce the system once, then give subsystems their own articles.
- **Backblaze:** operational facts, plain language and reproducible processes.
- **Meta Engineering:** connect design decisions to explicit system constraints.
- **MinIO:** product-aware topics and discoverable titles; avoid feature inventories,
  inflated claims and repeated promotional interruptions.

An introduction should move from an observed problem to CROWDB’s mechanism and its
cost. A design article should trace one request or failure. A guide should state
prerequisites, checkpoints, expected results, limits and safe cleanup. These are
editing questions, not compulsory heading templates.

Before publishing: does the opening earn attention; does each paragraph add
something; are the boundaries accurate; is every measurement qualified; can a
reader act on the example; does the writing sound like an engineer with an opinion?

## Publishing an article

Create `_posts/YYYY-MM-DD-short-slug.md`. Keep one primary category from `Product`,
`Engineering`, `AI & Data`, or `Guides`. Use tags for narrower subjects.

```yaml
---
title: "A specific subject, mechanism or result"
subtitle: "One sentence that makes the scope clear."
date: 2026-10-01 10:00:00 +0800
category: Engineering
tags: [Consensus, Recovery]
description: "A factual search preview, not a string of keywords."
excerpt: "The short promise shown in the article listing."
art: editorial
image: /assets/og-editorial.png
---
```

`art` selects `/assets/<art>.svg`: use `editorial`, `iceberg` or create a new asset.
Optional `figure_title`, `figure_caption` and `image_alt` customize the banner.
Only one article should have `featured: true`; other cards are generated from
`site.posts`. The layout calculates reading time. Do not manually add post cards.
The original first article retains `/blog/why-we-are-building-crowdb/`.

## Source layout and visual system

- `index.html`: journal landing page. Do not recreate the old `index.md` alongside it.
- `_layouts/default.html` and `post.html`: shared shell and article layout.
- `_includes/diagrams/architecture.html`: responsive, semantic architecture figure.
- `assets/main.css`: shared product/journal tokens and responsive styles.
- `assets/site.js`: optional menu, filtering, copy, reading controls and TOC.
- `_config.yml`: author, canonical domain, permalink and SEO defaults.
- `feed.xml`, `sitemap.xml`, `robots.txt`: discovery, generated by Jekyll.

Use warm paper `#faf9f6`, ink `#242b28`, muted `#646b64`, terracotta `#b74324`
and pale sage surfaces. This supersedes the former neon-green palette.
Body text defaults to 16px, with a roughly 696px article column and generous line
height. Readers may choose 17 or 18px. The product hero is not the article scale.
Prioritize desktop and iPad portrait/landscape, while remaining usable at 320px.
Use solid shapes for implemented mechanisms and dashed shapes for planned paths.
Do not add decorative photography or external fonts to fill empty space.

Keep visible keyboard focus, accessible control labels, reduced-motion behavior,
code scrolling within its block and useful content without JavaScript. Avoid
third-party JavaScript, tracking, dependencies and UI that has no working behavior.
Shared asset changes also belong in the product site; see the parent package’s
`tools/sync_assets.py`. SVG sources and share-card generation belong in the package.

## Build and deployment

```sh
bundle install
bundle exec jekyll serve
JEKYLL_ENV=production bundle exec jekyll build
```

The main-branch Pages workflow is `.github/workflows/pages.yml`. Review generated
pages before publishing. Never commit `_site/`, `.jekyll-cache/`, `vendor/`, local
secrets or Bundler output. If using the alternative static workflow, replace the
Jekyll workflow rather than running two deployments to the same Pages environment.
See `MIGRATION.md` for the first migration and `README.md` for maintenance.
