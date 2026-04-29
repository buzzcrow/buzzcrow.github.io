---
title: 多版本并发控制 (MVCC)
layout: page
nav_order: 3
date: 2026-04-29
---

# 多版本并发控制 (MVCC)：从理论到工程实现

> 本文档系统性地介绍 MVCC（Multi-Version Concurrency
> Control）的设计哲学、核心接口抽象，以及 InnoDB、PostgreSQL、CockroachDB 等不同数据库引擎中的具体实现细节，涵盖 Undo
> Log、Heap Page、Sequence Number、全局时间戳等关键技术。

## 目录

1. [MVCC 定义与核心目标](#mvcc-定义与核心目标)
2. [抽象接口设计 (Interface Design)](#抽象接口设计-interface-design)
3. [实现方式一：基于 Undo Log (InnoDB 模式)](#实现方式一基于-undo-log-innodb-模式)
4. [实现方式二：基于 Heap Tuple (PostgreSQL 模式)](#实现方式二基于-heap-tuple-postgresql-模式)
5. [实现方式三：基于时间戳排序 (NewSQL 模式)](#实现方式三基于时间戳排序-newsql-模式)
6. [实现方式四：追加式存储 (Append-Only)](#实现方式四追加式存储-append-only)
7. [逻辑时钟与分布式 MVCC](#逻辑时钟与分布式-mvcc)
   - [Vector Clock (向量时钟)](#vector-clock-向量时钟)
   - [Hybrid Logical Clock (混合逻辑时钟)](#hybrid-logical-clock-混合逻辑时钟)
8. [总结与对比](#总结与对比)

---

## MVCC 定义与核心目标

### 定义

**多版本并发控制 (MVCC)** 是一种数据库并发控制协议，其核心思想是：

> **为数据库中的每一条数据维护多个历史版本，使得读操作可以访问旧版本数据，而写操作创建新版本，从而实现“读写互不阻塞”。**

### 核心目标

1.  **读写分离**：读不阻塞写，写不阻塞读。
2.  **一致性读 (Consistent Read)**：事务启动时看到的是一个一致性的数据快照。
3.  **高并发**：相比传统的两阶段锁 (2PL)，显著提升系统吞吐量。

---

## 抽象接口设计 (Interface Design)

为了屏蔽底层实现的差异（Undo Log 还是 Heap
Page），所有 MVCC 系统对外暴露的逻辑通常遵循一套相似的接口。

```
java
// MVCC 引擎的抽象接口
public interface MvccEngine {
/**
 * 事务开始时调用，获取一个 Read View (快照)
 * @param txId 当前事务ID
 * @return ReadView 对象，包含所有可见性判断规则
 */
ReadView beginTransaction(long txId);

/**
 * 读取数据
 * @param key 数据主键
 * @param readView 事务的快照
 * @return 可见的数据版本
 */
DataVersion read(Key key, ReadView readView);

/**
 * 写入数据（创建新版本）
 * @param key 数据主键
 * @param newValue 新值
 * @param txId 当前事务ID
 */
void write(Key key, Value newValue, long txId);

/**
 * 提交事务
 * @param txId 事务ID
 */
void commit(long txId);

/**
 * 回滚事务
 * @param txId 事务ID
 */
void rollback(long txId);
}
```

---

## 实现方式一：基于 Undo Log (InnoDB 模式)

这是最经典的 MVCC 实现，以 **MySQL InnoDB** 为代表。

### 核心组件

1.  **B+Tree 聚簇索引**：存储数据的**最新版本**。
2.  **Undo Log (回滚段)**：存储数据的**历史版本**。
3.  **Roll Pointer (回滚指针)**：存在于 B+Tree 的叶子节点中，指向 Undo Log。

### 数据结构示意

```
// InnoDB 行记录结构简化版
struct Row {
long trx_id; // 最后一次修改该行的事务ID
RollPointer roll_ptr; // 指向 Undo Log 的指针
Data data; // 当前数据
};
// Undo Log 结构
struct UndoLog {
long prev_trx_id; // 上一个版本的事务ID
Data old_data; // 旧版本数据
UndoLog* prev_log; // 指向上一个 Undo Log 的指针 (形成链表)
};
```

### 工作流程

1.  **UPDATE**：
    - 将当前行复制到 Undo Log 中（旧版本）。
    - 修改 B+Tree 中的数据（新版本）。
    - 将新行的 `roll_ptr` 指向刚创建的 Undo Log。
2.  **SELECT (快照读)**：
    - 从 B+Tree 取到最新行。
    - 根据 `ReadView` 判断最新行是否可见。
    - 若不可见（如未提交），顺着 `roll_ptr` 遍历 Undo
      Log 链表，直到找到第一个可见的版本。

---

## 实现方式二：基于 Heap Tuple (PostgreSQL 模式)

**PostgreSQL** 采用了另一种思路：直接将多版本数据（Tuple）存储在 Heap 表中。

### 核心组件

1.  **Heap Table**：无序的堆表，存放所有版本的 Tuple。
2.  **Tuple Header**：每个数据行头部包含版本信息 (`xmin`, `xmax`)。
3.  **Index (B-Tree)**：索引指向 Heap 中的行指针 (CTID)。

### 数据结构示意

```
// PostgreSQL Tuple 头
struct TupleHeader {
long xmin; // 插入该元组的事务ID
long xmax; // 删除/更新该元组的事务ID (0 表示未删除)
// ...
};
// 简化的可见性判断逻辑
bool isVisible(Tuple tuple, ReadView view) {
if (tuple.xmin == view.currentTxId) return true; // 自己改的可见
if (tuple.xmin < view.minActiveTxId && tuple.xmax == 0) return true; // 已提交且无删除
// ... 更复杂的活跃事务列表判断
return false;
}
```

### 特点

- **优势**：索引结构简单，更新速度快（只需插入新 Tuple，更新索引指针）。
- **劣势**：会产生大量垃圾版本（Dead Tuples），需要 `VACUUM` 进程定期清理。

---

## 实现方式三：基于时间戳排序 (NewSQL 模式)

在分布式系统中，无法使用单机的内存指针（Undo Log），因此采用 **时间戳**
作为版本号。

代表系统：**TiDB, CockroachDB**。

### 核心组件

1.  **全局授时服务 (TSO)**：生成单调递增的时间戳。
2.  **Key-Value 存储**：存储 `(Key, Timestamp) -> Value`。

### 写入与读取逻辑

```
class TimestampMvccEngine implements MvccEngine {

private long getTimestamp() {
    return globalTso.get(); // 从全局时钟获取
}

@Override
public void write(Key key, Value value, long txId) {
    long commitTs = getTimestamp();
    kvStore.put(key, commitTs, value); // 写入新版本
}

@Override
public DataVersion read(Key key, ReadView readView) {
    // 读取所有 ts <= readView.readTs 的版本
    List<Version> versions = kvStore.scan(key, readView.readTs);
    return versions.last(); // 返回最新的可见版本
}
}
```

### 特点

- **强一致性**：利用全局时间戳严格定义快照。
- **无锁读**：完全不需要 Undo Log 链表回溯。

---

## 实现方式四：追加式存储 (Append-Only)

代表系统：**CouchDB, RocksDB (LevelDB)**。

### 核心思想

- 永不原地修改数据。
- 所有的 `PUT` / `DELETE` 操作都是顺序写入新的 SST 文件。
- 旧版本通过 SST 文件的层级结构自然保留。

### 数据结构

```
SST File Level 0:
| Key=A, Seq=100, Value=X |
| Key=B, Seq=101, Value=Y |
| Key=A, Seq=105, Value=Z | <-- 最新的 A
SST File Level 1:
| Key=A, Seq=90, Value=OldX | <-- 旧版本
```

### 特点

- **写入极快**（顺序 IO）。
- **读取较慢**（需要合并多层 SST 文件）。
- 依赖 **Sequence Number** 来判断版本新旧。

---

## 逻辑时钟与分布式 MVCC

在分布式环境下，由于没有全局物理时钟，需要使用逻辑时钟来定序。

### Vector Clock (向量时钟)

用于捕获事件因果关系 (Causality)，常见于 Riak、Cassandra 等 AP 系统。

#### 数据结构

```
class VectorClock {
Map<String, Long> clock; // Key: NodeId, Value: Logical Time
}
```

#### 核心规则

1.  **本地事件**：递增自己的时钟分量。
2.  **发送消息**：携带当前的 Vector Clock。
3.  **接收消息**：`myClock[node] = max(myClock[node], receivedClock[node])`。

#### 优缺点

- ✅ 精准判断因果关系。
- ❌ 元数据随节点数线性增长 (O(N))，不适合大规模集群。

### Hybrid Logical Clock (混合逻辑时钟)

结合了物理时钟和逻辑时钟，是 CockroachDB 等现代分布式数据库的基石。

- **组成**：`(WallTime, LogicTime)`。
- **原理**：优先使用 NTP 物理时间，发生冲突时用逻辑计数器兜底。
- **优势**：在保证因果序的前提下，将元数据开销降至 **O(1)**。

---

## 总结与对比

| 实现方式       | 代表系统     | 版本存储位置     | 核心依赖               | 优势                   | 劣势                    |
| :------------- | :----------- | :--------------- | :--------------------- | :--------------------- | :---------------------- |
| **Undo Log**   | MySQL InnoDB | 独立 Undo 表空间 | Undo Log, Roll Pointer | 索引稳定，主数据页干净 | Undo 膨胀，回滚慢       |
| **Heap Tuple** | PostgreSQL   | 主 Heap 表中     | xmin/xmax 规则         | 更新开销小             | 需要 VACUUM，索引膨胀   |
| **时间戳排序** | TiDB, CRDB   | KV 层多版本      | 全局 TSO               | 分布式友好，强一致     | 依赖 TSO，存储放大      |
| **追加式**     | RocksDB      | SST 文件         | Sequence Number        | 写入性能极佳           | 读放大，Compaction 复杂 |

### 关键术语对照

- **Undo Log**：回滚日志，用于存储旧版本。
- **Heap Page**：堆页，数据库主数据文件。
- **Sequence Number (SeqNo)**：序列号，单机存储引擎的版本号。
- **Global Timestamp**：全局时间戳，分布式系统的逻辑时钟。
- **Vector Clock**：向量时钟，用于去中心化的因果判断。

---

**文档总结**：  
MVCC 并非单一技术，而是一套围绕“**如何存储多版本**”和“**如何判断可见性**”的解决方案集合。选择哪种实现，本质上是**在读写性能、存储成本、分布式复杂度之间做权衡**。
