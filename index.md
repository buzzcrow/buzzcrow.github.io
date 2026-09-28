---
layout: default
title: CROWDB Journal
description:
  Engineering notes on CROWDB, a distributed storage platform built for objects,
  tables, and AI datasets.
body_class: home
---

<section class="hero">
  <div class="hero-kicker"><span></span> CROWDB / ENGINEERING JOURNAL</div>
  <h1>Storage, without<br><em>borrowed assumptions.</em></h1>
  <div class="hero-bottom">
    <p class="hero-intro">
      We are building one distributed data path for S3 objects, Iceberg tables,
      and AI datasets. This is where we explain the decisions, mistakes, and
      machinery behind it.
    </p>
    <div class="hero-actions">
      <a class="button button-primary" href="{% post_url 2026-09-21-why-we-are-building-crowdb %}">Read the opening note <span>→</span></a>
      <a class="button button-quiet" href="https://github.com/buzzcrow/crowdb">Browse the source <span>↗</span></a>
    </div>
  </div>
  <div class="hero-index" aria-hidden="true">001</div>
</section>

<section class="signal-strip" aria-label="Project status">
  <div><span class="signal-dot active"></span><strong>S3</strong><small>basic implementation</small></div>
  <div><span class="signal-dot live"></span><strong>Iceberg</strong><small>implemented</small></div>
  <div><span class="signal-dot planned"></span><strong>Dataset</strong><small>in design</small></div>
  <div class="signal-repo"><span>OPEN SOURCE</span><a href="https://github.com/buzzcrow/crowdb">buzzcrow/crowdb ↗</a></div>
</section>

<section class="writing-section" id="writing">
  <header class="section-heading">
    <p>01 / WRITING</p>
    <h2>From the workbench</h2>
  </header>

  <div class="post-list">
    {% for post in site.posts %}
    <a class="post-card" href="{{ post.url | relative_url }}">
      <div class="post-number">{{ forloop.index | prepend: '0' | slice: -2, 2 }}</div>
      <div class="post-card-main">
        <div class="post-card-meta">
          <span>{{ post.category | default: "Field note" }}</span>
          <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%d %b %Y" | upcase }}</time>
        </div>
        <h3>{{ post.title }}</h3>
        <p>{{ post.excerpt | strip_html | normalize_whitespace }}</p>
      </div>
      <span class="post-arrow">↗</span>
    </a>
    {% endfor %}
  </div>
</section>

<section class="architecture-section" id="architecture">
  <header class="section-heading inverse">
    <p>02 / THE SYSTEM</p>
    <h2>Three layers.<br>One data path.</h2>
  </header>

  <div class="layer-stack">
    <article class="layer layer-access">
      <span class="layer-number">03</span>
      <div>
        <p class="layer-label">ACCESS</p>
        <h3>S3 · Iceberg · Dataset</h3>
        <p>Three first-class models. Shared storage, separate semantics.</p>
      </div>
      <span class="layer-state">USER SURFACE</span>
    </article>
    <article class="layer layer-chunk">
      <span class="layer-number">02</span>
      <div>
        <p class="layer-label">CHUNK</p>
        <h3>Chunk Stream · Chunk-KV</h3>
        <p>Placement, protection, streaming, repair, and reclamation.</p>
      </div>
      <span class="layer-state">DATA SHAPE</span>
    </article>
    <article class="layer layer-kv">
      <span class="layer-number">01</span>
      <div>
        <p class="layer-label">REUSABLE KV</p>
        <h3>Multi-Paxos · WAL · crowdb-tree</h3>
        <p>A parallel, durable metadata substrate that stands on its own.</p>
      </div>
      <span class="layer-state">FOUNDATION</span>
    </article>
  </div>

  <div class="architecture-note">
    <p>The goal is not another wrapper around object storage. CROWDB owns the path from protocol semantics to disk layout, with a route toward GPU memory that does not make the CPU a permanent toll booth.</p>
    <a class="text-link light" href="{% post_url 2026-09-21-why-we-are-building-crowdb %}#the-shape-of-the-system">Read the architecture argument →</a>
  </div>
</section>

<section class="manifesto">
  <p class="manifesto-label">A WORKING PREMISE</p>
  <blockquote>“Own the path that determines your limits.”</blockquote>
  <p>We publish the reasoning while the system is still taking shape. Finished stories are less useful than decisions you can inspect.</p>
</section>
