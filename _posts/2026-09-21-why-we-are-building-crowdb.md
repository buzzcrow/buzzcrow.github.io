---
title: Introducing CROWDB
subtitle:
  A distributed storage platform for S3 objects, Iceberg tables, and AI
  datasets, built to own the path from metadata to disk and GPU memory.
date: 2026-09-21 10:30:00 +0800
category: Product
description:
  Meet CROWDB, a distributed storage platform that gives S3, Iceberg, and AI
  datasets one direct path through metadata, chunks, disks, networks, and GPUs.
excerpt:
  Storage became the data path for analytics and AI. CROWDB removes the layers
  that keep that path slow, indirect, and hard to control.
---

For more than a decade, I have designed, built, and debugged storage systems as
their bottlenecks moved from disks to CPUs, networks, and data movement. The
most valuable lessons came from the hard parts in between: revisiting
assumptions, tracing bottlenecks, and watching real workloads expose what clean
diagrams and successful demos leave out.

Over the same period, 10 Gb Ethernet gave way to 400 and 800 Gb RDMA. Workloads
that once waited on hard disks became CPU-bound. GPUs grew faster than the paths
feeding them. Storage became the foundation for data lakes, analytics, AI
training, and inference.

The hardware advanced by orders of magnitude. Storage architecture mostly added
layers.

CROWDB is the system we are building from those lessons.

## Storage has a new job

Today's data may begin as an object, become part of an Iceberg table, and finish
as a batch in GPU memory. The usual path crosses an object API, table metadata,
a dataset library, one or more caches, and several network and memory buffers.
Every layer is reasonable on its own. Together they create too many owners for
the same data.

Each owner adds metadata, retries, caching rules, recovery logic, and another
place to copy bytes. The application sees a clean abstraction. The operator sees
several systems that must agree during a failure. The hardware sees a path that
cannot keep it busy.

S3 is still essential for compatibility, but its role has changed. In many data
platforms it is no longer the final application interface. It is an intermediate
transfer layer beneath table engines and AI runtimes. Forcing every workload
through object semantics makes the familiar path the only path, even when it is
not the right one.

Faster devices make the cost visible. RDMA cannot remove software hops it does
not control. GPUDirect cannot help if data must first bounce through an HTTP
server and client CPU. When the network and GPU are faster than the protocol
between them, the architecture is the bottleneck.

## What CROWDB is

CROWDB is a distributed storage platform for objects, tables, and AI datasets.
It gives S3, Iceberg, and Dataset their own native semantics over one shared
storage core.

The product idea is straightforward: keep the access models users need, remove
avoidable translations underneath them, and control the data path far enough to
optimize it as hardware changes.

That shared path handles durability, placement, protection, repair, streaming,
and reclamation. S3 does not pretend to be a table format. Iceberg does not
become a naming convention inside a bucket. Dataset does not have to turn every
sample or tensor into an object request. They share infrastructure without
losing their meaning.

CROWDB is for teams whose storage path has become part of compute performance:
data platforms, table engines, training systems, inference services, and the
infrastructure behind them. It is open source because these teams should be able
to inspect the recovery model, question the trade-offs, and change the path when
their workload demands it.

## Why build the whole path?

The industry already has good storage engines, object stores, and table formats.
But once they are assembled into separate layers, no single system controls the
complete data path. That is the problem CROWDB is built to solve.

A stack assembled from independent systems is quick to start and difficult to
optimize deeply. An upper layer cannot change physical placement. A storage
service cannot see the final consumer. A transfer layer cannot remove metadata
work owned somewhere else. Performance problems collect at the boundaries, then
more services are added to work around them.

The individual techniques in CROWDB are not secret: Multi-Paxos, write-ahead
logs, B+trees, erasure coding, RDMA, and immutable table formats are well known.
Putting them in one repository is not the advantage. The advantage comes from
making their contracts agree: one durability decision, one placement model,
bounded buffer ownership, explicit authority, and recovery that crosses the same
boundaries as the write.

This is where experience matters. A design can look elegant and still fail under
retries, partial writes, stale topology, or a full disk. We have made those
mistakes before. CROWDB carries those lessons into the architecture instead of
hiding them behind a new API.

> Own the path that determines the system's limits.

## Three layers, one system

CROWDB has three layers. Each has a narrow job. Together they cover the route
from an access model to physical storage.

<figure class="architecture-diagram" aria-labelledby="architecture-caption">
  <figcaption id="architecture-caption">
    <span>CROWDB DATA PATH</span>
    <strong>Three layers. One controlled path.</strong>
  </figcaption>

  <div class="architecture-clients" aria-label="Applications">
    <span>S3 tools</span>
    <span>Table engines</span>
    <span>AI runtimes</span>
  </div>

  <div class="architecture-flow"><span>HTTP + native access</span></div>

  <section class="architecture-layer architecture-access">
    <div class="architecture-layer-title"><span>03</span><strong>ACCESS</strong></div>
    <div class="architecture-nodes">
      <div><strong>S3</strong><small>objects</small></div>
      <div><strong>Iceberg</strong><small>tables</small></div>
      <div><strong>Dataset</strong><small>AI data</small></div>
    </div>
  </section>

  <div class="architecture-flow"><span>shared semantics</span></div>

  <section class="architecture-layer architecture-chunk">
    <div class="architecture-layer-title"><span>02</span><strong>CHUNK</strong></div>
    <div class="architecture-nodes">
      <div><strong>Chunk Stream</strong><small>ordered append</small></div>
      <div><strong>Chunk-KV</strong><small>range data</small></div>
      <div><strong>Chunk I/O</strong><small>data movement</small></div>
    </div>
    <p>ChunkDB → DiskIO → DiskDB</p>
  </section>

  <div class="architecture-flow"><span>durable metadata</span></div>

  <section class="architecture-layer architecture-kv">
    <div class="architecture-layer-title"><span>01</span><strong>REUSABLE KV</strong></div>
    <div class="architecture-nodes architecture-kv-nodes">
      <div><strong>Multi-Paxos</strong></div>
      <div><strong>WAL</strong></div>
      <div><strong>Group 0</strong></div>
      <div><strong>crowdb-tree</strong></div>
    </div>
  </section>

  <div class="architecture-flow architecture-flow-out"><span>one physical path</span></div>

  <div class="architecture-hardware" aria-label="Hardware targets">
    <span>NVMe / disks</span>
    <span>RDMA fabric</span>
    <span>GPU memory</span>
  </div>
</figure>

### Native access, shared storage

S3, Iceberg, and Dataset remain distinct access models. They share one metadata,
chunk, and I/O foundation instead of translating through one another. The S3
path is basic today, native Iceberg is complete on its delivery branch and
awaiting merge, and Dataset remains in design.

### One storage core

The Chunk layer handles placement, protection, streaming, and repair. Under it,
`crowdb-kv` provides replicated metadata and durable state with parallel
Multi-Paxos slots. Upper layers reuse this core rather than building another
storage system for each protocol.

We will cover the consensus, storage engine, chunk layout, and recovery model in
separate posts. They deserve more space than an introduction can give them.

## Built for the next data path

CROWDB uses ordinary CPU streaming now, but the architecture does not make that
the permanent route. It leaves room for topology-aware access, RDMA, GPUDirect,
and delivery into GPU memory without changing the logical storage model.

We cannot predict every new device. We can keep enough control to use it.

## Where the project stands

<div class="status-note">
  <strong>Project status · September 2026</strong>
  <p>The distributed KV, storage engine, chunk services, operations console, and a basic S3 path are working. Native Iceberg is awaiting merge. Dataset and direct GPU delivery remain in design.</p>
</div>

CROWDB is working software, not a production-proven product. Its code, tests,
backlog, and design documents are open at
[`buzzcrow/crowdb`](https://github.com/buzzcrow/crowdb).

This is our proposal for a more direct storage system: fewer translations, fewer
layers claiming authority over the same data, and more control over the path
that determines performance. We are building it in the open.
