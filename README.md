# CROWDB Journal

The public engineering journal for [CROWDB](https://github.com/buzzcrow/crowdb),
a distributed storage platform for S3 objects, Iceberg tables, and AI datasets.

The site is published at [buzzcrow.github.io](https://buzzcrow.github.io). It is
the long-form technical companion to [crowdb.dev](https://crowdb.dev) and a
searchable entry point to the project.

## Local development

Requirements: Ruby 3.0+ and Bundler 2.0+.

```bash
bundle install
bundle exec jekyll serve
```

Open `http://localhost:4000`.

The existing Make targets are also available:

```bash
make build
make run
make test
```

## Publishing

Posts live in `_posts/` and use the `YYYY-MM-DD-short-slug.md` naming scheme.
See [AGENTS.md](AGENTS.md) for voice, metadata, formatting, and verification
rules.

Pushes to `main` deploy through GitHub Actions.
