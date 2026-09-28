# Migration from the existing journal

The delivered source targets the existing `buzzcrow/buzzcrow.github.io` user-site.
Do this on a new branch and review the diff before merging. No remote repository
has been changed by preparing this package.

1. Back up the existing repository, or ensure the working tree is clean and all
   work is committed. Create a branch, for example `site-redesign`.
2. Copy the **contents** of this `blog-source/` directory into the repository root,
   including `.github/` and `.gitignore`. Merge with existing files. Do not run an
   unreviewed `rsync --delete`, delete `.git`, or copy the whole two-site package.
3. Remove the old root `index.md`. The new `index.html` is the homepage; both must
   not generate `/index.html`. Keep unrelated posts, assets and repository history.
4. Replace the first post at its existing filename. The `/blog/why-we-are-building-crowdb/`
   route and first publication date are unchanged; the revision date is explicit.
   Review the new Iceberg guide and its date before publishing it.
5. Review existing layouts/includes and CSS. New templates use `/assets/main.css`
   and `/assets/site.js`; old `assets/css/main.css` is no longer referenced. Keep
   old assets temporarily if older articles link to them.
6. Run `bundle install`. If the previous Gemfile.lock conflicts, regenerate/update
   it with Bundler after reviewing the Gemfile change, then commit the resulting
   lockfile. No lockfile is supplied because this environment could not resolve
   the gems. Do not hand-edit a generated lockfile.
7. Run `JEKYLL_ENV=production bundle exec jekyll build`. Inspect `_site/`, including
   an article, feed.xml, a code block and the SVG hero images. Do not commit `_site/`.
8. Set Pages Source to GitHub Actions. Retain **one** Pages deployment workflow.
   Verify the Actions job, canonical URL, home page and original article URL after
   merging. This package does not set a blog CNAME to crowdb.dev.

## Alternative: publish the supplied static snapshot

The parent package contains `blog-static/` and `deploy/pages-static.yml.example`.
This is a reviewed snapshot, not an ongoing Markdown build. Use it only as an
explicit alternative to the Jekyll workflow.

Copy `blog-static/` contents into a `public/` directory in the blog repository.
Replace `.github/workflows/pages.yml` with `deploy/pages-static.yml.example` from
the package, naming it `.github/workflows/pages.yml`. The example uploads `public/`
directly and preserves the same Pages URL. Do not keep the Jekyll deploy job active
alongside it. Future article changes must also regenerate/rebuild `public/` or
switch back to the Jekyll workflow; Markdown edits alone do not change a snapshot.

## Domain separation

The product site belongs at `https://crowdb.dev/`, while articles remain at
`https://buzzcrow.github.io/blog/.../`. The product footer and journal header link
between these domains. Deploy the product site before announcing its docs links.
If product DNS still redirects to GitHub, remove that redirect only when your
Nginx/TLS setup is ready. Changing providers, DNS or certificate settings is not
part of this source-file replacement.
