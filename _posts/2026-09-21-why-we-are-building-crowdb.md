---
title: "Why we’re building CROWDB"
subtitle: "Objects and tables, built on one storage core. The reasoning behind owning the path from an API to the bytes on disk."
date: 2026-09-21 10:30:00 +0800
last_modified_at: 2026-09-29 10:00:00 +0800
category: Product
tags: [Architecture, S3, Iceberg, Data path]
description: "Why CROWDB gives S3 and Iceberg native access to a shared storage core, and what that choice means for future Dataset and GPU paths."
excerpt: "Storage bottlenecks move. System boundaries tend to stay. CROWDB is an attempt to own enough of the data path to change both."
art: editorial
featured: true
---
For more than a decade, I have designed, built, and debugged storage systems as their bottlenecks moved from disks to CPUs, networks, and data movement. The most useful lessons came from the work in between: revisiting an assumption, tracing a slow request, and seeing what a real workload exposed that a clean diagram did not.

That experience is why I’m building CROWDB. I want the storage system to own enough of the data path that we can change it when the workload changes—not just tune the parts we happen to control.

## Storage has a new job

Consider a training job that reads data from an Iceberg table. The table engine resolves metadata, reads files, and hands data to a library that prepares batches for the GPU. Somewhere underneath, storage places and protects the bytes. Several components may cache, retry, or copy the same data along the way.

None of those steps is automatically wrong. Separate systems give us useful interfaces and independent ways to evolve. The difficult part is deciding who owns a problem that crosses those interfaces. A table engine cannot change how storage places a file. A storage service usually cannot see the batch the application is trying to assemble.

When I follow a slow request, those boundaries are often more interesting than the individual algorithms. Which component owns this buffer? Why is this metadata fetched again? What happens if the writer retries after only part of the operation became durable? A fast device does not answer those questions.

S3 remains a useful interface. I do not think every workload should be forced to use it as an intermediate representation, though. Tables have commits and snapshots. Datasets have samples and batches. These concepts deserve a place in the storage design, not just conventions layered over object names.

## What CROWDB is

CROWDB is a distributed storage platform. S3 and Iceberg have their own access models over a shared storage core. Dataset is a third model we are designing; it is not implemented yet.

An S3 client works with objects. An Iceberg client works with a catalog, tables, snapshots, and immutable files. The two models reuse the same underlying machinery for distributed state and protected chunks. Iceberg is not implemented by asking users to assemble a catalog on top of a separate S3 service.

This distinction is easy to lose in a diagram. “Shared storage” does **not** mean that uploading an S3 object registers an Iceberg table. The access models still have separate semantics. What they share is the infrastructure underneath.

The first useful question is therefore practical: can a table client talk to the catalog and store its data without another storage service to configure? The native Iceberg path is designed to make that possible. The answer still needs to be tested against each client workflow.

## Why build the whole path?

There are good storage engines, object stores, and table formats already. Reusing them is often the right decision. Building another core means taking responsibility for failures that someone else has already spent years finding.

I am accepting that cost because the boundaries are part of what I want to change. If a request crosses an independently owned metadata service, an object gateway, and a separate storage engine, a change to placement or buffer ownership can become a negotiation between systems. We want those contracts to be explicit within CROWDB.

Multi-Paxos, write-ahead logs, B+trees, and erasure coding are not the novelty. Putting them in one repository is not an advantage by itself. The work is making their contracts agree: when a write is durable, who may change its placement, how a buffer stays bounded, and what recovery must finish after a process dies.

Owning those decisions should give us room to improve the path. It does not prove that CROWDB is faster. That needs measurements with a stated workload, hardware, concurrency, and baseline. I would rather publish those results separately than borrow credibility from an architecture drawing.

> Own the path that determines the system’s limits.

## Three layers, one system

The architecture has three layers. Reading from the application downward helps explain their jobs, but this is a dependency map—not a claim that every byte travels through every box.

{% include diagrams/architecture.html %}

### Access models keep their meaning

The Access layer implements the interfaces applications use. S3 handles HTTP object operations. Iceberg supplies a native catalog and FileIO path. Both have working implementations in the current repository. Dataset remains in design, including the possibility of native access that does not pass through an HTTP server.

The Iceberg catalog and FileIO belong to one access model. General S3 object access is a separate model. Keeping those roles clear is more useful than calling every path “compatible.”

### Chunks own the storage work

The Chunk layer is responsible for placement, protection, streaming, and repair. Chunk Stream provides durable ordered append; Chunk-KV provides a range-partitioned structure. The underlying path continues through Chunk I/O, ChunkDB, DiskIO, and DiskDB.

These names will need their own articles. For this introduction, the important point is ownership: access models can reuse the same storage mechanisms rather than grow their own placement and recovery systems.

### Distributed state is a reusable foundation

Underneath, `crowdb-kv` supplies replicated state using parallel Multi-Paxos slots and write-ahead logging. It is a reusable distributed layer, not the product-level data model.

This separation matters to me. Owning the stack should not require turning it into a single inseparable component. The layers need narrow enough contracts that we can reason about them, test them, and use them independently where that makes sense.

## Built for the next data path

The GPU path is an example of why I want this control. Today, CROWDB uses ordinary CPU streaming. Dataset, topology-aware native access, and direct GPU delivery remain planned work.

RDMA or GPUDirect Storage would not become useful merely because we added another endpoint. We would need to reason about buffer ownership, placement, protection, and the lifetime of the data being transferred. Those decisions cross several layers of the system.

The aim is to leave room for that work without changing what an object or a table means. There is no direct-GPU benchmark to show here, and no such capability to enable in the preview. That boundary belongs next to the design, not in a footnote.

## Where the project stands

<div class="callout">
<strong>Development status · updated September 29, 2026</strong>
<p>S3 and native Iceberg have working implementations. Dataset and direct GPU delivery are still in design. Production use and on-disk upgrade compatibility are not supported.</p>
</div>

The repository includes code, tests, and design documents; the product site hosts the user manual. That is where I want this argument to be judged. A useful next step is to inspect the Iceberg guide and tell us which assumption breaks under your workload.

[Start with the Iceberg evaluation guide →](https://crowdb.dev/docs/quickstart/)

<div class="source-note">Technical references: <a href="https://github.com/buzzcrow/crowdb">project README and status</a>, <a href="https://github.com/buzzcrow/crowdb/tree/main/doc/design">design documents</a>, and <a href="https://crowdb.dev/docs/quickstart/">Iceberg quick start</a>. This article was first published on September 21 and revised on September 29, 2026 to reflect the current Iceberg implementation and development limits.</div>
