# CROWDB Journal

This repository is the public engineering blog for
[CROWDB](https://github.com/buzzcrow/crowdb). It is a Jekyll site deployed to
GitHub Pages at `https://buzzcrow.github.io`. The future product site is
`https://crowdb.dev`; this repository remains the long-form blog and a
search-engine entry point for the project.

## Content rules

- Publish all public site copy and posts in English.
- Credit public writing to **Gian Crow**.
- Keep claims aligned with the current CROWDB repository. Distinguish clearly
  between implemented, in-progress, and designed work.
- Write from a first-person engineering perspective. Prefer concrete nouns,
  specific trade-offs, and varied sentence length.
- Avoid generic AI prose: canned scene-setting, inflated adjectives, false
  dichotomies, repetitive three-item lists, section-ending summaries, and
  phrases such as "in today's rapidly evolving landscape," "delve into,"
  "game-changer," or "it is worth noting."
- Do not smooth away uncertainty. A direct admission of unfinished work is
  better than promotional language.
- Use `CROWDB` for the product name and `crowdb-*` for component names.
- Link technical claims to `https://github.com/buzzcrow/crowdb` when useful.

## House voice

CROWDB writing is product-led technical editorial written from the perspective
of an experienced storage engineer.

### Voice

- Establish authority through concrete observations, constraints, and
  trade-offs, never through self-praise.
- Use `I` for personal experience and `we` for CROWDB decisions and direction.
- State opinions directly, then give the engineering evidence behind them.
- Keep CROWDB visible. Technical detail should explain why the product exists,
  how it differs, or what it enables.
- Be ambitious about direction and exact about current status.
- Prefer a useful, defensible point of view over neutral coverage of every side.

### Prose

- Give each paragraph one job and each section one argument.
- Prefer short declarative sentences for conclusions. Use longer sentences only
  to connect cause and effect.
- Vary sentence and paragraph length without falling into a repeated rhythm.
- Prefer concrete nouns and verbs such as `copy`, `route`, `flush`, `repair`,
  and `own`.
- Name actual hardware, protocols, workloads, and system boundaries.
- Remove any sentence that only announces, praises, or repeats the next one.
- Avoid unnecessary transitions, rhetorical questions, repeated contrast
  formulas, and a summary at the end of every section.
- Do not force every argument into a three-item list.

### Product positioning

- Begin with a real change in hardware, workload, cost, or system behavior.
- Describe its operational or architectural consequence before introducing the
  product response.
- Explain benefits through architecture, evidence, or a working example rather
  than adjectives.
- Name the intended reader or workload when it sharpens the argument.
- End with current status and a concrete invitation to inspect, test, or follow
  the project.
- Never describe designed work as implemented or implemented work as
  production-proven without evidence.
- Mention CROWDB early, then let the mechanism, evidence, or example carry the
  argument. Do not repeat the product name as a substitute for proof.
- Use one focused call to action near the end. Avoid promotional interruptions
  between technical sections.

### Evidence and technical depth

- Reveal detail in layers: conclusion first, architecture second, mechanism
  third, implementation detail only when the article needs it.
- Draw a diagram when the argument depends on a data path, ownership boundary,
  state transition, or failure path. A decorative diagram does not count.
- Quantify scale and performance claims. Include hardware, workload, dataset,
  concurrency, baseline, and measurement scope when those details affect the
  result.
- Do not publish an isolated speedup number. Explain what changed in the path
  and what trade-off paid for it.
- For investigations, preserve useful wrong assumptions and the measurement that
  disproved them. Do not rewrite debugging as an effortless success.
- Define project-specific terms before relying on them. Prefer a small concrete
  example before a general abstraction.
- State the limitation next to the capability it constrains, not in a disclaimer
  detached from the claim.
- Split a broad architecture into a series. An introduction should expose the
  system shape; later posts should own consensus, storage, recovery, and
  performance separately.

### Titles and openings

- Make the title promise one specific subject, mechanism, or result.
- Use `Introducing` only for a real product or capability introduction and `How`
  or `Why` only when the article answers that question directly.
- Do not call a post `definitive`, `complete`, or `ultimate` unless its scope
  justifies that claim.
- In the opening, move quickly through pressure, consequence, and CROWDB's
  response. Do not start with a general history of the industry.
- Put the strongest measured fact or experienced observation near the top, but
  do not strip its conditions for effect.

### Editing test

Before publishing, check:

1. Does the opening earn attention within three sentences?
2. Does every paragraph make a new claim?
3. Can an abstract statement be replaced by a concrete example?
4. Does each technical detail support the product argument?
5. Are limitations and project status accurate?
6. Can any paragraph be removed without losing meaning?
7. Does the article sound like an engineer with an opinion rather than a
   generated summary?

## Article structures

Treat these as editing checklists, not fixed heading templates.

For a product or introduction post:

1. Open with a personal observation or a measurable market or hardware change.
2. Show the resulting problem in a real data path.
3. Explain why existing boundaries or products do not fully solve it.
4. State what CROWDB is and who it serves.
5. Show how the architecture answers the problem.
6. State what works now, what comes later, and where to inspect the project.

For an architecture or design post:

1. Define the workload, engineering problem, and hard constraints.
2. Give the reader a system map before introducing internal names.
3. Show the rejected or conventional options only when they clarify the choice.
4. Trace one request, write, read, or failure through the selected design.
5. Name the cost, failure behavior, and operational consequence of the decision.
6. Connect the decision to a CROWDB capability without adding sales copy.

For a performance investigation:

1. State the expected and observed behavior with numbers.
2. Describe the test setup and the first evidence.
3. Preserve important false leads and show how measurements rejected them.
4. Explain the mechanism behind the bottleneck and the change.
5. Compare results under the same conditions and name any regression or cost.
6. End with what is proven, what is not, and what will be measured next.

For a guide:

1. State the exact result the reader will produce.
2. List prerequisites and scope before the first command.
3. Use complete, reproducible steps with expected output at checkpoints.
4. Explain only the architecture needed to operate or debug the example.
5. Finish with verification, limitations, cleanup, and the next useful path.

## Editorial reference points

Use these publications as references for specific editorial strengths. Do not
copy their wording, visual identity, article structure, or marketing claims.

- **Cloudflare Blog:** Put a strong technical thesis in the opening, introduce
  the product response early, explain the request path precisely, and discuss
  limitations without weakening the argument.
- **NVIDIA Technical Blog:** Start from a workload bottleneck, use diagrams to
  compare old and new data paths, explain the mechanism, and support performance
  claims with test conditions and measured results.
- **ScyllaDB Blog:** Treat performance work as an investigation. Show expected
  versus observed behavior, preserve useful false leads, and connect metrics to
  the mechanism that produced them.
- **Cockroach Labs Blog:** Explain why an existing component was not sufficient
  before presenting a replacement. Respect prior art and justify new ownership
  through product constraints, control, stability, or long-term evolution.
- **Dropbox Tech:** Use real scale and product requirements to justify custom
  infrastructure. Introduce the whole system once, then give individual
  subsystems their own articles.
- **Backblaze Blog:** Build trust with operational numbers, plain language, and
  concrete processes. Define internal terms before relying on them.
- **Meta Engineering:** Reduce a large system to a small set of explicit design
  challenges and connect every major decision to efficiency, isolation,
  reliability, or operations.
- **MinIO Blog:** Keep the product visible, connect topics to current data and
  AI workloads, and make titles discoverable. Avoid its weaker tendencies toward
  long feature inventories, repeated product mentions, broad superlatives, and
  promotional interruptions.

The target CROWDB style combines Cloudflare's direct point of view, NVIDIA's
mechanism-and-evidence discipline, ScyllaDB's honest investigation, Cockroach
Labs' justification for building foundational components, Dropbox's serialized
architecture storytelling, Backblaze's operational concreteness, and MinIO's
product awareness. CROWDB should remain more concise and restrained than a
conventional product-marketing blog.

## Editorial categories

Use one primary category per post. Keep the category list small:

- `Product` — introductions, releases, roadmap, capabilities, and use cases.
- `Engineering` — architecture, implementation, recovery, and performance
  trade-offs.
- `AI & Data` — Iceberg, Dataset, RDMA, GPU, training, and inference data paths.
- `Guides` — deployment, operations, integrations, examples, and measurements.

Use tags for components and narrower subjects. Do not create a new category for
one post. Every category should support CROWDB's product story; technical posts
build credibility through useful engineering detail rather than sales copy.

## Site structure

- `_posts/` contains dated articles.
- `_layouts/` contains the shared page and post templates.
- `assets/css/main.scss` contains the complete visual system.
- `index.md` is the editorial homepage and architecture overview.
- `_config.yml` owns metadata, canonical URL, author, and permalink settings.
- `feed.xml`, `sitemap.xml`, and `robots.txt` support discovery.

## Adding a post

1. Create `_posts/YYYY-MM-DD-short-slug.md`.
2. Include `title`, `subtitle`, `date`, `category`, `description`, and `excerpt`
   in front matter. The global author is inherited from `_config.yml`, and the
   post layout calculates reading time from the rendered word count.
3. Add the post only through the automatic `site.posts` listing unless it needs
   to be featured in the homepage hero.
4. If a hero link changes, update both references in `index.md`.
5. Format all Markdown before merging:

   ```bash
   prettier --write "*.md" "_posts/*.md" --prose-wrap always --tab-width 2
   ```

6. Verify the production build:

   ```bash
   bundle exec jekyll build
   ```

## Visual rules

- Preserve the editorial black, warm-white, and signal-green palette.
- Reuse the existing type scale, grid, border, button, and card patterns before
  introducing new ones.
- Keep layouts readable at 320px and above.
- Do not add JavaScript unless the feature cannot be expressed with HTML and
  CSS.
- Maintain visible keyboard focus and sufficient color contrast.

## Deployment

Pushes to `main` are built and deployed by `.github/workflows/pages.yml`. Never
commit `_site/`, Jekyll caches, or local Bundler output.
