---
title: "Why we’re building CROWDB"
subtitle: "Why we put object and Iceberg table storage in one system."
date: 2026-09-21 10:30:00 +0800
last_modified_at: 2026-10-02 10:00:00 +0800
category: Product
tags: [Architecture, S3, Iceberg, Data path]
description: "Why CROWDB builds S3 object and Iceberg table access on one storage core, and what you can try today."
excerpt: "Why CROWDB owns the path from an Iceberg table to stored data—and what you can test today."
art: editorial
featured: true
---
When an application reads an Iceberg table, it asks a catalog which files belong to a snapshot, then reads those files. If the catalog, file service, and storage engine are separate systems, even a small change to this path can cross several owners. I’m building CROWDB to make those storage decisions in one system.

## The problem I want to solve

Take a writer that uploads a new table file, then loses its connection before it learns whether the table commit succeeded. Which part knows whether a retry is safe? The catalog knows the snapshot; the file service knows the upload; storage knows where the bytes went. A useful answer needs all three.

S3 is still useful for objects. An Iceberg table has different rules: files belong to snapshots, and a commit changes which snapshot readers see. I want those rules to be part of CROWDB's Iceberg path, with the storage work underneath shared where it makes sense.

## What CROWDB is

CROWDB is a distributed storage platform with separate S3 object and Iceberg table interfaces over a shared storage core.

An S3 client works with objects. An Iceberg client works with a catalog, tables, snapshots, and files. CROWDB provides the Iceberg catalog and file service together; users do not have to assemble a separate catalog and S3 service for the [container example](https://buzzcrow.github.io/blog/run-iceberg-in-one-container/).

Uploading an S3 object does not register an Iceberg table. The two interfaces share storage machinery, but keep their own rules.

## Why build the whole path?

Building a storage core is expensive. CROWDB takes on that work because table commits, file writes, placement, and recovery need clear agreements. For example, after a process dies during a write, the catalog and storage layer must agree on what became durable before a client retries.

Paxos, write-ahead logs, trees, and erasure coding are established tools. The hard part is making them agree on durability and recovery for the request the client actually made. This design does not prove CROWDB is faster; that needs measurements with a stated workload, hardware, concurrency, and baseline.

## Three layers, one system

The diagram shows which parts depend on others. It does not show every byte passing through every box.

{% include diagrams/architecture.html %}

### Access models keep their meaning

The Access layer serves S3 object requests and Iceberg catalog and file requests. Each interface keeps its own rules for what a write means.

### Chunks own the storage work

The Chunk layer places and protects stored data. Both access models can use it without each building separate placement and recovery code.

### Distributed state is a reusable foundation

Underneath, `crowdb-kv` replicates the small pieces of state those layers need to agree on. It is a reusable part of the system, not the model an Iceberg or S3 client sees.

## Where the project stands

<div class="callout">
<strong>Development status · updated October 2, 2026</strong>
<p>S3 and native Iceberg have working implementations. Dataset and direct GPU delivery are still in design. The single-node container is for disposable data: it has no host fault tolerance, production support, or supported on-disk upgrade path.</p>
</div>

To check the current Iceberg path yourself, start the disposable container on a Linux amd64 host with Docker and a free local port 80:

```sh
docker run -d --name crowdb-iceberg -p 127.0.0.1:80:80 crowdb/crowdb-iceberg:latest
docker exec crowdb-iceberg crowdb-monitor readiness && echo ready
```

Rerun the readiness command until it prints `ready`, then start at step 2 of the [six-order walkthrough](https://buzzcrow.github.io/blog/run-iceberg-in-one-container/) to write a table and read it back in pandas. The example's five paid orders produce city totals of 150, 140, and 50 USD. The guide includes the complete script, expected output, and cleanup.

<div class="source-note">Technical references: <a href="https://github.com/buzzcrow/crowdb">project README and status</a>, <a href="https://github.com/buzzcrow/crowdb/tree/main/doc/design">design documents</a>, and the <a href="https://crowdb.dev/docs/quickstart/">Iceberg quick start</a>. First published September 21, 2026; updated October 2, 2026.</div>
