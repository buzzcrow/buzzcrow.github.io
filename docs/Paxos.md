---
title: Paxos 分布式共识全指南
layout: page
nav_order: 4
---

# 分布式共识：Paxos → Multi-Paxos → 高并发 KV 选型全指南

> 本文系统讲解从经典 Paxos 到 Multi-Paxos 的原理、工程挑战与优化方案，对比 Paxos 与 Raft 的适用场景，并给出高并发 KV 存储的架构选型决策。

## 🔖 导读

- **适合人群**：分布式系统开发者、架构师、数据库内核工程师、对共识协议感兴趣的技术人员
- **阅读建议**：
  - 入门：重点阅读第1-4章，理解基础原理和核心改进
  - 工程实践：重点阅读第3、5、8章，了解工程挑战和落地路径
  - 架构选型：重点阅读第6、7、10章，对比方案差异和适用场景
- **核心价值**：避开Paxos工程落地的90%常见坑，掌握高并发KV存储的共识层选型方法论

## 目录

1. [经典 Paxos 基础定义与原理](#1-经典-paxos-基础定义与原理)
2. [经典 Paxos 两阶段流程 + 实例演示](#2-经典-paxos-两阶段流程--实例演示)
3. [经典 Paxos 工程挑战、坑与基础优化](#3-经典-paxos-工程挑战坑与基础优化)
4. [Multi-Paxos 原理、Slot 机制详解](#4-multi-paxos-原理slot-机制详解)
5. [Multi-Paxos 工程挑战、坑与常规优化](#5-multi-paxos-工程挑战坑与常规优化)
6. [Paxos vs Raft 完整对比](#6-paxos-vs-raft-完整对比)
7. [Multi-Paxos Group vs Multi-Raft Group 架构](#7-multi-paxos-group-vs-multi-raft-group-架构)
8. [多 Group 方案实现难点、Scope、开发计划](#8-多-group-方案实现难点scope开发计划)
9. [工业级产品 & 论文支撑](#9-工业级产品--论文支撑)
10. [高并发 KV 最终选型决策](#10-高并发-kv-最终选型决策)
11. [工程实践精华附录](#11-工程实践精华附录)
12. [学习资源与参考文献](#12-学习资源与参考文献)

---

# 1 经典 Paxos 基础定义与原理

## 1.1 定义

Paxos 是 Leslie
Lamport 提出的**分布式共识协议**，在节点宕机、网络延时、分区场景下，让集群多数节点对**同一个值**达成不可变更的一致。

> **通俗理解**：相当于一群人在不可靠的网络下投票，只要超过一半的人同意，结果就最终确定，任何人无法篡改，即使部分人掉线或网络延迟，最终结果也能保持一致。

## 1.2 三大核心角色

| 角色            | 职责                                     | 核心属性           |
| --------------- | ---------------------------------------- | ------------------ |
| Proposer 提议者 | 发起提案，生成提案编号，推动共识         | 无状态，可多个     |
| Acceptor 投票者 | 决定是否承诺/接受提案，**协议安全核心**  | 有状态，必须持久化 |
| Learner 学习者  | 同步已决议的值，不参与投票，落地业务状态 | 有状态，可多个     |

> **角色合并**：实际工程实现中，通常每个节点同时承担三种角色，简化部署架构。

## 1.3 核心安全约束

1. 只有被**多数 Acceptor** 接受的值才会被选定；
2. 一旦值被选定，永远无法被篡改；
3. 同一轮共识只会选定**唯一一个值**。

> ❗ 常见误区：多数派不是简单的"超过一半节点"，而是"超过一半的Acceptor节点"，因为Learner不参与投票决策。

---

# 2 经典 Paxos 两阶段流程 + 实例演示

## 2.1 标准两阶段

### 阶段1：Prepare 准备

1. Proposer 生成**全局唯一、单调递增**提案编号 `N`；
2. 向**多数派 Acceptor** 发送 `Prepare(N)`；
3. Acceptor 规则：
   - 若 `N` 大于本地已承诺最大编号：承诺拒绝所有小于 `N`
     的提案，并返回自己**已接受过的最大提案编号+值**；
   - 否则直接拒绝。

### 阶段2：Accept 接受

1. Proposer 收到多数响应：
   - 若有返回已接受的值，**必须沿用该值**；
   - 无则自己指定值；
2. 向多数 Acceptor 发送 `Accept(N, Value)`；
3. Acceptor 若未承诺更大编号，则接受该提案。

### 阶段3：Learner 学习

提案被多数接受后，Learner 同步该值，作为最终决议。

## 2.2 极简举例

3 节点 A/B/C，A 作为 Proposer 要写入 `v1`：

1. A 发 Prepare(1) 给 B/C；
2. B/C 无历史提案，回复承诺；
3. A 发 Accept(1, v1)；
4. B/C 接受，多数达成；
5. 所有 Learner 学习 `v1`，全局一致。

## 2.3 冲突场景示例（理解协议安全性的关键）

**场景**：两个Proposer同时发起提案，网络延迟导致消息乱序。

1. Proposer1 发 Prepare(1) 到 A、B，获得多数承诺
2. 网络延迟，Proposer1的Accept消息还未发出
3. Proposer2 发 Prepare(2) 到 B、C，B已经承诺了Proposer1的编号1 <
   2，所以更新承诺为2，C无历史也承诺2
4. Proposer2 收到多数承诺，没有已接受的值，发起 Accept(2, v2)
5. B、C接受v2，达成多数，v2被选定
6. 延迟的Proposer1的Accept(1, v1)到达B，B已经承诺了更大的编号2，直接拒绝
7. Proposer1重试，发 Prepare(3)，会收到B返回的已接受值v2，必须沿用v2，最终写入v2

> ✅ 安全保证：即使有多个Proposer竞争，最终也只会选定一个值，不会出现脑裂。

---

# 3 经典 Paxos 工程挑战、坑与基础优化

## 3.1 原生经典 Paxos 核心坑

### 3.1.1 活锁问题（最致命）

无Leader设计导致多Proposer同时提案时会陷入互相驳回的死循环：

1. Proposer1发起编号1的提案，刚拿到多数承诺
2. Proposer2发起编号2的提案，拿到多数承诺，导致Proposer1的Accept被拒绝
3. Proposer1重试，发起编号3的提案，导致Proposer2的Accept被拒绝
4. 无限循环，永远无法达成共识

### 3.1.2 其他工程缺陷

1. **每次共识都要两轮 RPC**，延迟高、吞吐低；
2. 提案编号难设计，重复/乱序会破坏一致性；
3. 无日志序号概念，只能单轮决议，无法做连续日志；
4. Acceptor 无持久化，宕机重启失忆，破坏安全；
5. 网络延迟旧消息回灌，篡改已决议值。

## 3.2 经典 Paxos 基础优化

1. 引入**唯一 Leader**，只允许 Leader 发提案，消灭活锁；
2. 提案编号采用 `节点ID+时间+自增` 全局唯一；
3. Acceptor 落地盘存储：max_promise / max_accept_id / accept_value；
4. 增加消息任期校验，过滤老旧延迟请求。

---

# 4 Multi-Paxos 原理、Slot 机制详解

## 4.1 Multi-Paxos 核心改进

在经典 Paxos 之上做工程化优化：

1. 永久选一个稳定 Leader，**稳定期省略 Prepare 阶段**，只走 Accept；
2. 引入 **Slot** 日志槽位，每一个 Slot 对应**独立一轮 Paxos 实例**；
3. 支持连续日志、多实例并行共识，适配分布式日志/KV；
4. 所有节点默认 **Proposer+Acceptor+Learner 三合一**。

## 4.2 Slot 核心定义

1. 每一个 **Multi-Paxos Group（分片）**
   拥有**独立自增 Slot 序列**，Group 之间 Slot 完全隔离；
2. **一条 KV 写请求 独占一个 Slot**，Slot 永不复用、只递增；
3. 采用**滑动窗口 Active
   Slot**：窗口内所有 Slot 可**并行发起共识**，无需串行排队；
4. 允许**乱序决议、有序应用**：Learner 缓存乱序 Slot，按序号顺序落地 KV 状态机。

## 4.3 Slot 滑动窗口示例

窗口大小=8：

```
[101 102 103 104 105 106 107 108] 活跃可并行 Slot
```

前面 Slot 提交完成后，窗口整体后移：

```
[105 106 107 108 109 110 111 112]
```

## 4.4 和 Raft 本质区别

| 维度         | Multi-Paxos                           | Raft                                 |
| ------------ | ------------------------------------- | ------------------------------------ |
| 日志提交模型 | 窗口内多Slot并行提交，乱序完成        | 严格串行，前一条未提交后一条不能发起 |
| 共识延迟     | 稳定期1轮RPC                          | 稳定期1轮RPC（相同）                 |
| 单分片吞吐   | 高，窗口大小=8时理论吞吐是Raft的4-6倍 | 低，串行天花板                       |
| 实现复杂度   | 高，需要处理乱序和空洞                | 低，有序日志处理简单                 |

> 📊 性能对比（同硬件单分片）：
>
> - Raft：~1-2万 QPS
> - Multi-Paxos（窗口=8）：~8-10万 QPS
> - 差异核心：并行共识能力

---

# 5 Multi-Paxos 工程挑战、坑与常规优化

## 5.1 核心挑战与坑

### 5.1.1 日志空洞处理

并行Slot共识必然导致日志乱序，产生空洞：

- 现象：Slot 101、103已完成，Slot 102还在共识中
- 后果：状态机无法按顺序应用日志，导致数据不一致
- 解决方案：Learner维护一个有序缓存队列，只有前面的Slot都完成后才批量应用到状态机

### 5.1.2 新Leader日志恢复流程

Leader宕机后，新Leader需要补全所有未确定的Slot：

1. 新Leader上任后，先从本地Learner获取最新已提交的Slot号 `max_committed`
2. 向所有Acceptor查询 `[max_committed+1, max_committed+窗口大小]`
   范围内的Slot投票记录
3. 对于有多数Acceptor接受的Slot，直接标记为已提交
4. 对于未完成的Slot，发起新的Paxos实例补全
5. 所有空洞补全后，才对外提供服务

### 5.1.3 其他工程坑

1. **Slot 必须按 Group+Slot 独立落盘**，不能只存最后一条决议，否则故障恢复丢数据；
2. 无官方选举规范，需要自研/复用选举；
3. 老旧消息跨 Slot 干扰，需要 Term 任期隔离；
4. 无标准快照协议，日志无限膨胀需自研快照与日志裁剪；
5. Learner 容易读到未提交中间值，需做脏读隔离。

## 5.2 业界常规优化

1. **选举直接复用 Raft 任期+心跳竞选**，不自己造 Paxos 选主；
2. 稳定 Leader 省略 Prepare，切主后恢复两阶段；
3. 固定滑动窗口控制单分片最大并发度；
4. Acceptor 按 Slot 独立持久化，隔离互不干扰；
5. Leader 异步批量推送日志给 Follower Learner，不阻塞客户端返回；
6. 客户端**多数 Acceptor 应答即返回成功**，不等全量 Learner 同步；
7. 实现最简定时快照，裁剪旧 Slot 日志。

## 5.3 可直接砍掉的多余特性

- 砍掉原生 Paxos 选主；
- 砍掉多 Proposer 竞争冲突处理；
- 砍掉通用任意 Value 兼容，只适配 KV 操作日志；
- 砍掉主 Learner 转发单点架构；
- 砍掉运行时动态节点扩缩容（初期静态集群）。

---

# 6 Paxos vs Raft 完整对比

## 6.1 核心对比

| 维度       | Multi-Paxos               | Raft                     |
| ---------- | ------------------------- | ------------------------ |
| 日志模型   | 多Slot 并行决议，乱序提交 | 单日志流 严格串行        |
| 选举       | 可复用Raft选举，灵活      | 协议内置标准选举         |
| 组内吞吐   | 高，支持并行              | 有串行天花板             |
| 故障恢复   | 可并行补全空洞            | 必须顺序推进             |
| 实现自由度 | 高，可定制KV架构          | 协议约束强，改动空间小   |
| 工程坑     | 多，需要自研大量周边逻辑  | 少，标准化程度高         |
| 适合场景   | 高并发分片KV、数据库分片  | 通用配置中心、中等并发KV |

---

# 7 Multi-Paxos Group vs Multi-Raft Group 架构

## 7.1 多 Group 架构原理

- 按 Key 哈希做**分片**，每个分片 = 独立 Paxos/Raft Group；
- Group 之间完全隔离、并行读写，横向无限扩容；
- Multi-Paxos Group：**分片间并发 + 分片内Slot并行**；
- Multi-Raft Group：仅分片间并发，分片内依旧串行。

## 7.2 架构拓扑

```
         KV Client
            │
            ▼
路由层（Key Hash → 分配 Group）
            │
            ▼
┌──────┐ ┌──────┐ ┌──────┐
Group0   Group1   Group2 ...

每 Group 独立 Leader、独立 Slot/Log、独立存储
```

---

# 8 多 Group 方案实现难点、Scope、开发计划

## 8.1 实现难点

1. 多 Group 资源隔离，单节点承载大量 Group 的负载均衡；
2. Slot 乱序+空洞管理，状态机顺序应用；
3. 新 Leader 日志兜底恢复（从 Acceptor 捞历史Slot）；
4. 快照与日志裁剪适配多 Group；
5. 客户端路由、Leader 重定向、请求幂等；
6. 网络分区后日志冲突修复。

## 8.2 最小实现 Scope（必做）

1. 分片路由 + Group 隔离管理；
2. 复用 Raft 选举做每 Group 选主；
3. Multi-Paxos 两阶段 + 稳定期省略 Prepare；
4. Slot 自增 + 滑动并发窗口；
5. Acceptor 按 Group+Slot 持久化；
6. Learner 乱序缓存、填空洞、顺序应用 KV；
7. 日志异步同步 + 故障补全；
8. 最简快照日志裁剪；
9. 客户端寻址、重试、幂等。

## 8.3 开发落地计划

1. 原型期：单 Group 跑通 Multi-Paxos + KV 状态机；
2. 架构期：多 Group 分片路由、隔离、Slot 窗口；
3. 容错期：选举、宕机恢复、日志补全、快照；
4. 优化期：批量提交、异步推送、流量控制；
5. 压测选型：同硬件对比 Multi-Paxos Group / Multi-Raft 吞吐延迟。

---

# 9 工业级产品 & 论文支撑

## 9.1 采用 Multi-Paxos Group 著名产品

1. Google Spanner：分片 Tablet 对应 Paxos Group，组内并行Slot；
2. Google Chubby：基于 Multi-Paxos 分布式锁；
3. 阿里云 PolarDB-X：X-Paxos 多组并行共识；
4. OceanBase：底层多Group Multi-Paxos 做事务共识。

## 9.2 采用 Multi-Raft 著名产品

1. TiKV/TiDB：Multi-Raft 分片；
2. etcd：单Raft组，不适合超高并发分片；
3. Sofa-Jraft：阿里开源 Multi-Raft。

## 9.3 性能相关论文

- 《Tuning Paxos for high-throughput with batching and pipelining》
- 《MultiPaxos Made Complete》2024
- 《PigPaxos: Devouring the Communication Bottlenecks》

---

# 10 高并发 KV 最终选型决策

## 10.1 选型决策树

```
开始
  |
  ▼
是否需要单分片10万+ QPS？
  ├─ 是 → 选择 Multi-Paxos Group 架构
  │    |
  │    ▼
  │  团队是否有10人以上的分布式研发团队？
  │    ├─ 是 → 全自研 Multi-Paxos
  │    └─ 否 → 基于开源Paxos库二次开发
  │
  └─ 否 → 优先选择 Multi-Raft
       |
       ▼
     业务场景是否通用？
       ├─ 是 → 直接使用etcd/raft等成熟实现
       └─ 否 → 基于Raft做定制化修改
```

## 10.2 具体场景选型建议

1. **追求单分片高并发、热点Key吞吐、组内并行**：选 **Multi-Paxos
   Group + 复用Raft选举**，性能上限远高于 Multi-Raft；
2. **团队人力有限、快速落地、追求稳定易维护**：直接选
   **Multi-Raft**，协议标准化、坑少、资料成熟；
3. 自研高并发 KV 中间件：**优先 Multi-Paxos 多Group 架构**，是业界主流范式。

## 10.3 折中方案推荐

对于大多数团队，最优折中方案是：

```
Raft 选举模块 + 精简版 Multi-Paxos 共识 + 多Group 分片
```

> 优势：既避免了自研Paxos选举的坑，又保留了Multi-Paxos的并行性能优势，研发成本降低60%。

---

# 11 工程实践精华附录

## 11.1 核心设计决策

1. **角色存储分离**
   - Acceptor：只存每Slot投票元数据（必须落盘、按Slot保留历史，不能只存最后一条）；
   - Learner：存已决议有序日志+KV业务数据，用于读、日志同步、故障补全；
   - 补全日志：优先从其他 Learner 拉取，全网无则**逐个Slot问询 Acceptor 兜底恢复**。

2. **客户端返回时机**
   Client 写请求只要 Leader 收到**多数 Acceptor 应答**、本地 Learner 落地，立刻返回成功；同步其他 Follower
   Learner 全程**异步后台做**，不阻塞、不卡死可用性。

3. **Leader 宕机数据安全**
   已被多数 Acceptor 接受的 Slot 日志，不会随 Leader 宕机丢失；新 Leader 上任自动遍历 Slot，从 Acceptor 还原历史决议。

4. **Slot 最终设计定论**
   - 每个 Group 独立一套无限递增 Slot；
   - 1条KV记录 = 1个Slot，不复用、不固定分组池子；
   - 滑动窗口控制并行度，窗口内并行共识、乱序决议、有序应用。

5. **坑与选型定论**
   - 原生 Paxos 坑极多，Multi-Paxos 抹平30%，仍有70%工程坑需自研；
   - 新项目普通业务可用 Raft；**高并发分片KV 必须上 Multi-Paxos 多Group**，组内并行是 Raft 无法替代的性能优势；
   - 最优折中架构：**Raft 选举 + 精简 Multi-Paxos 共识 + 多Group 分片**，避坑同时保留性能。

6. **实现极简约束**
   不做通用 Paxos，只做 KV 最小子集；砍掉所有冗余特性，只保留分片、选举、Slot 并行、持久化、故障补全、快照。

## 11.2 快速参考表

### 11.2.1 核心参数设计参考

| 参数               | 推荐值                                            | 说明                                           |
| ------------------ | ------------------------------------------------- | ---------------------------------------------- | --------- | ------------------ |
| 集群节点数         | 3或5                                              | 奇数节点，最多容忍1/2节点宕机                  |
| Slot滑动窗口大小   | 8-32                                              | 过大会导致空洞太多恢复慢，过小发挥不出并行优势 |
| 提案编号生成规则   | `(时间戳 << 32)                                   | 节点ID                                         | 自增序号` | 全局唯一，单调递增 |
| Acceptor持久化内容 | max_promise_id、max_accept_id、accept_value、term | 必须fsync落盘后再应答                          |
| 客户端超时时间     | 2-5倍RTT                                          | 避免不必要的重试导致活锁                       |

### 11.2.2 常见问题排查

| 现象         | 可能原因                         | 解决方案                           |
| ------------ | -------------------------------- | ---------------------------------- |
| 共识成功率低 | 网络分区、节点宕机、活锁         | 检查网络连通性，确保Leader稳定     |
| 吞吐上不去   | 窗口太小、批量太小、RPC延迟高    | 调大窗口，开启批量提交，优化RPC    |
| 数据不一致   | Acceptor未持久化、消息乱序未过滤 | 检查持久化逻辑，增加term和Slot校验 |
| 恢复时间长   | 日志太多、快照间隔太长           | 增加快照频率，优化恢复流程         |

---

# 12 学习资源与参考文献

## 12.1 经典论文

1. The Part-Time Parliament（Paxos 原始论文）
   https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf

2. **Paxos Made Simple**（必读入门）
   https://lamport.azurewebsites.net/pubs/paxos-simple.pdf

3. Raft 原始论文：In Search of an Understandable Consensus Algorithm
   https://raft.github.io/raft.pdf

4. MultiPaxos Made Complete (2024) https://arxiv.org/abs/2402.05173

5. Google Spanner 论文：https://research.google/pubs/pub39940/

## 12.2 学习资源

1. MIT 6.824 分布式系统课程：https://pdos.csail.mit.edu/6.824/
2. Raft 官方网站：https://raft.github.io/
3. Paxos 教程：https://the-paper-trail.org/post/2009-02-03-consensus-protocols-paxos/

## 12.3 工业实现参考

1. etcd-raft 源码：https://github.com/etcd-io/etcd/tree/main/raft
2. TiKV
   Multi-Raft 设计：https://tikv.github.io/deep-dive-tikv/scalability/multi-raft.html
