---
title: 'Raft + RocksDB to CrowDB: A Journal–Tree Recovery Contract'
subtitle: How a shared journal position connects ordered history, durable tree state, snapshots, and recovery.
date: 2026-10-08 12:00:00 +0800
category: Technical Internal
tags:
- Raft
- RocksDB
- WAL
- Recovery
description: How CrowDB connects an external journal to durable tree state through a shared position and contiguous
  recovery frontier.
excerpt: The journal preserves recent ordered history; the tree materializes a durable contiguous prefix.
image: /assets/og-editorial.png
author: Gian Crow
published: true
series: Rethinking Distributed Storage
series_order: 1
source_revision: 0366ef3402ab6bc3e3bb52c48a741967c101a3a5
---

## Start with the common layout

A common distributed KV store puts a replicated consensus layer in front of a local storage engine. A write follows roughly this path:

![Common distributed KV write path from consensus journal to local engine and snapshot](/assets/distributed-kv-write-path.png)

*Consensus orders a mutation; the local engine materializes it.*

The consensus journal establishes the order that replicas must agree on. The local engine WAL protects an applied command while its data is still in memory or waiting for a flush. They protect different durability boundaries, but they can record the same mutation twice.

This layout appears in established systems such as [TiKV](https://tikv.org/docs/7.1/reference/architecture/overview/) and [YugabyteDB](https://docs.yugabyte.com/stable/architecture/docdb/). Their production experience deserves respect; we use them here only as architectural context. Their implementations differ, but the boundary is familiar: a replicated journal drives a local LSM-based engine.

For a general-purpose distributed KV store, Raft plus RocksDB is a sensible baseline. Raft supplies replication and recovery order; RocksDB supplies compaction, indexing, and local persistence. The difficult part is the boundary between them: when is a command applied, when is its state durable, and when can the journal record be reclaimed?

## The hidden recovery boundary

This is the double-journal problem. RocksDB can disable its WAL when the outer consensus journal is authoritative. The benefit is less duplicate logging. The cost is that the system must connect two kinds of progress:

- the journal knows which operations have been ordered and committed;
- the storage engine knows which materialized state has reached durable storage.

If those progress markers diverge, recovery can skip a mutation that the tree still needs. YugabyteDB provides a useful documented example: DocDB disables the RocksDB WAL and tracks how much Raft history has reached durable SST files. That boundary determines which Raft records can be replayed and which can be reclaimed. ([RocksDB WAL documentation](https://github.com/facebook/rocksdb/wiki/Write-Ahead-Log-%28WAL%29), [YugabyteDB’s design](https://docs.yugabyte.com/stable/architecture/docdb/performance/))

The important idea is larger than `disableWAL`. The journal preserves recent ordered history; the tree materializes a durable prefix. The recovery boundary between them must be explicit.

## The slot is the journal position contract

CrowDB makes that boundary a storage-engine contract. Its lower KV layer is a Multi-Paxos KV store. Each replica’s Paxos WAL records values accepted for slots. When the upper layer applies a selected slot, it passes that slot position to the tree, which materializes the mutation. `crowdb-tree` does not add a separate mutation redo WAL.

![CrowDB journal position contract from Paxos journal through L0 and L1 to a persistent snapshot](/assets/journal-position-contract.png)

*The journal position connects ordered history to the durable tree frontier.*

The journal does not need to tell the tree who the leader was, which ballot was used, or how the quorum was formed. The tree needs a mutation and its ordered position:

```text
mutation(key, value_or_tombstone, slot)
```

It can then report the frontier through which its materialized state is durable. The journal and the tree are two parts of one recovery system: the journal keeps recent history, and the tree keeps the durable materialized prefix.

The slot is also the replacement boundary. A different journal can feed the same tree as long as it preserves the position protocol: it must identify mutations by position, allow positions to form a contiguous prefix, replay records after the durable frontier, and reclaim old records only after the tree has published that prefix. `slot` is the name used by the current Paxos implementation; the contract is more general than Paxos.

The tree stores the position in the value cell rather than appending it to the sorted key:

```text
key -> (resolved_slot, value_or_tombstone)
```

CrowDB keeps one current version per key. If `account/status` already contains slot 104, a delayed application of slot 101 cannot replace it. A tombstone carries its slot as well, so an older put cannot resurrect a key that a newer deletion still protects. The tree does not need to understand leaders, ballots, or network messages.

## Execution can be out of order; durability cannot

CrowDB’s Paxos group admits multiple in-flight slots within a configured window. The L0 MemTable can accept non-contiguous slots, so a missing slot does not stop later applications from making progress in memory.

For example, slots 101, 103, and 104 may already be applied while 102 is missing:

![Out-of-order L0 execution and contiguous L1 durability frontier](/assets/out-of-order-contiguous-frontier.png)

*L0 accepts a window of non-contiguous slots; L1 publishes only the contiguous prefix.*

Only the flush from L0 into the L1 tree publishes that contiguous prefix. Publishing 104 while 102 is missing would let recovery discard a journal record that the tree still needs. This keeps the Paxos group concurrent while keeping the durable recovery frontier simple. We will discuss the reasons for choosing Paxos separately.

The tree code implements this boundary directly. It tracks received slots, computes the contiguous slot frontier, and leaves L0 entries above the flush frontier for a later flush. A highest observed slot is not the same thing as a safe durable slot.

## Recovery, snapshots, and journal reclamation

Consider a crash where the consensus layer has committed through slot 100, the state machine has applied through slot 100 in memory, and the durable tree covers only slot 90.

![Recovery frontier after a crash: committed log, applied state, durable checkpoint, and required replay](/assets/raft-recovery-frontier.png)

*The tree checkpoint at 90 is durable; slots 91–100 remain in the journal for replay.*

Removing the state-machine WAL is safe only while the journal preserves that missing suffix. If an integration stores data and `applied_index` independently, it can flush the marker first, crash, and later read “100” from state that only contains 90. The error is in the integration contract, not in RocksDB.

A snapshot therefore records more than a root identifier. It also records the frontier it covers. Recovery loads the tree at that frontier and replays journal records after it. The same frontier tells journal maintenance which older records are safe to reclaim. Flush is not merely “write a larger SST”; it publishes a contiguous part of the journal as durable tree state.

RocksDB provides mechanisms such as `atomic_flush` to coordinate flushes across column families. The enclosing system must still define which flush boundary corresponds to which journal position, which snapshot is recoverable, and which records remain necessary. ([Atomic flush](https://github.com/facebook/rocksdb/wiki/Atomic-flush))

## The same contract can serve another journal

CrowDB’s upper Chunk-KV layer has its own partition sequencer and `PartitionJournal`. That journal stores records through ChunkStream, while the tree uses a chunk-backed page store. It does not reuse the lower Paxos journal implementation or treat a stream byte offset as a Paxos slot.

It does reuse the tree’s progress-aware materialization interface. The adapter passes `mutation_seq` into tree apply operations, and a condition-failed record advances the corresponding no-op progress. The tree can therefore serve different ordering and journal implementations as long as they provide the same position and frontier semantics.

CrowDB owns this flow across journal, apply, tree, snapshot, and reclamation. That makes it possible to change one part while keeping the recovery protocol visible and testable.

**In CrowDB, the journal and the tree are not two independent persistence layers. The journal preserves recent ordered history; the tree materializes a durable contiguous prefix. A shared slot frontier connects them into one recovery system.**
