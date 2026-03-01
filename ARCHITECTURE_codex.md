# Ultraswarm Architecture (Codex Edition)

> 目标：把现有方案从“概念完整”推进到“可稳定上线、可持续演进”。
> 方法：保留两层架构（Brain/Hands），先补可靠性与安全红线，再扩展分布式与自动发现。

---

## 1. 评审结论（Executive Review）

### 1.1 总体判断

当前方案方向正确，核心设计（两层分工 + 事件驱动 AI 决策点）成立，具备很高的工程价值。

但要进入长期生产运行，必须先补三条硬约束：

1. 控制面容灾（避免 Dispatcher 单点）
2. 执行链路幂等 + 租约（避免重复执行与僵尸任务）
3. 安全边界与审计（避免高权限 agent 失控）

### 1.2 优先级结论

- `P0` 必须先做：容灾、租约、审计、最小权限、任务幂等
- `P1` 第二阶段：跨机调度、AI 评审分级、自动恢复策略
- `P2` 第三阶段：自动发现、语义去重、策略学习闭环

---

## 2. 设计目标与非目标

### 2.1 目标

- 支持多任务并行，自动从任务到 PR
- 让 Brain 只做“理解与决策”，让 Agent 只做“实现与修复”
- 任务全生命周期可追踪、可回放、可恢复
- 面向多机器扩展，但先保证单机稳定

### 2.2 非目标（当前版本）

- 不做 Kubernetes 化
- 不做复杂向量检索系统（先用关键词 + 结构化历史）
- 不做全自动无人工门控合并（保留 Wayne 最终裁决）

---

## 3. 核心原则

1. `Brain Thinks, Hands Code`：上下文严格分层
2. `AI at Decision Points`：AI 只在决策节点被调用
3. `Deterministic Control Plane`：状态机与调度必须可预测
4. `Idempotent by Default`：所有入口和执行命令都可重复安全执行
5. `Security Before Autonomy`：自动化优先级低于安全边界

---

## 4. 两层架构（保留）

## Tier 1: Brain（编排智能）

输入：
- 任务描述
- 业务上下文（客户、会议、历史决策）
- 仓库高层说明（CLAUDE.md）
- 历史 prompt 成败样本

输出：
- `refined_intent`
- `execution_prompt`
- `routing_plan`（agent/model/priority）
- `risk_level`（low/medium/high）

## Tier 2: Hands（执行智能）

输入：
- Brain 生成的精确 prompt
- 仓库上下文与相关文件
- 执行约束（测试、提交规范、PR 规范）

输出：
- 代码变更
- 测试结果
- PR 与元信息

关键边界：
- Agent 不直接读取业务私密上下文
- Brain 不直接做代码编辑

---

## 5. 系统拓扑（v2）

```text
Ingress (Telegram/CLI/Cron/Webhook)
  -> Dispatcher API
    -> Task Store (SQLite)
    -> Brain Engine (short LLM calls)
    -> Scheduler (routing + lease)
    -> Worker RPC (gRPC over Tailscale)
    -> Lifecycle Manager
    -> Notification Hub

Workers (Mini/Pro/EC2)
  -> Worktree Manager
  -> Agent Runtime (tmux + executor)
  -> Progress Reporter
```

控制面与数据面分离：
- 控制面：Dispatcher + DB + 生命周期
- 数据面：Worker 执行实例

---

## 6. 关键改造点（相对原方案）

### 6.1 控制面容灾（P0）

新增 `dispatcher_lease`：
- 任意时刻只允许一个 active dispatcher
- lease TTL（如 15s）+ 心跳续约
- standby 节点可抢占过期 lease

新增 `startup_recovery`：
- 启动时扫描 `running/assigned` 任务
- 与 worker 对账（session 存在/不存在）
- 自动转为 `retry_pending` 或 `failed_recoverable`

### 6.2 幂等与去重（P0）

入口统一计算 `idempotency_key`：
- Telegram: `chat_id + message_id + repo`
- Webhook: `event_id`
- Cron: `source + fingerprint + window`

数据库强约束：
- `UNIQUE(idempotency_key)`
- 重复请求直接返回已有任务 ID

### 6.3 任务租约（P0）

新增 `task_leases`：
- dispatcher 分配任务时写 lease
- worker 必须定期续约
- lease 过期后任务可回收重派

避免：
- worker 崩溃导致任务永久卡死
- 网络抖动导致双重执行

### 6.4 安全基线（P0）

- Worker 按 repo 配置权限 profile：`read-only` / `dev-write` / `dangerous`
- 默认禁用危险模式；仅对 allowlist 仓库开启
- 所有外部命令记录 `command_audit`（who/when/task/command/exit_code）
- 日志脱敏（token, key, cookie）

### 6.5 执行完成判定（P1）

不再只依赖 tmux 文本匹配，改为多信号：
- 进程退出码
- git 工作区状态
- PR API 回执
- CI API 状态

状态机只接受“可信事件”驱动迁移。

### 6.6 评审流水线分级（P1）

按 `risk_level` 触发 reviewer：
- `low`: 1 reviewer（codex 或 claude）
- `medium`: 2 reviewers
- `high`: 2 reviewers + 必须人工确认

目的：降低时延和成本，不牺牲高风险任务质量。

---

## 7. 数据模型（v2）

```sql
CREATE TABLE tasks (
  id                 TEXT PRIMARY KEY,
  idempotency_key    TEXT NOT NULL UNIQUE,
  source             TEXT NOT NULL,
  repo               TEXT NOT NULL,
  description        TEXT NOT NULL,
  refined_intent     TEXT,
  prompt             TEXT,
  priority           INTEGER DEFAULT 0,
  risk_level         TEXT DEFAULT 'medium',
  status             TEXT NOT NULL DEFAULT 'queued',
  retry_count        INTEGER DEFAULT 0,
  max_retries        INTEGER DEFAULT 3,
  assigned_worker    TEXT,
  worktree_path      TEXT,
  branch             TEXT,
  pr_number          INTEGER,
  pr_url             TEXT,
  ci_status          TEXT,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_attempts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id            TEXT NOT NULL,
  attempt_no         INTEGER NOT NULL,
  agent_type         TEXT NOT NULL,
  model              TEXT NOT NULL,
  prompt             TEXT NOT NULL,
  started_at         DATETIME,
  ended_at           DATETIME,
  outcome            TEXT,
  error_summary      TEXT,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE task_events (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id            TEXT NOT NULL,
  event_type         TEXT NOT NULL,
  payload_json       TEXT,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE task_leases (
  task_id            TEXT PRIMARY KEY,
  worker_id          TEXT NOT NULL,
  lease_expires_at   DATETIME NOT NULL,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE brain_calls (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id            TEXT,
  call_type          TEXT NOT NULL,
  model_used         TEXT NOT NULL,
  tokens_in          INTEGER,
  tokens_out         INTEGER,
  latency_ms         INTEGER,
  input_digest       TEXT,
  output_json        TEXT NOT NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE command_audit (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id            TEXT,
  worker_id          TEXT,
  command            TEXT NOT NULL,
  exit_code          INTEGER,
  started_at         DATETIME,
  ended_at           DATETIME
);
```

---

## 8. 状态机（v2）

```text
queued
  -> brain_intake
  -> ready_to_schedule
  -> leased
  -> running
  -> pr_opened
  -> ci_running
  -> review_running
  -> ready_for_human
  -> done

失败/恢复分支：
running -> retry_pending -> brain_retry -> ready_to_schedule
running -> failed_recoverable
running -> failed_terminal
```

终态必须显式：
- `done`
- `failed_terminal`
- `cancelled`

状态迁移原则：
- 仅生命周期管理器可写状态
- 其他模块只能发事件

---

## 9. Brain 决策点（v2）

保留 5 个决策点，但增加“可验证输出”：

1. `intake`: 任务澄清 + 风险分级 + 初始执行计划
2. `retry_analysis`: 失败归因（代码/提示/环境）+ 新策略
3. `discovery`: 信号转任务 + 去噪 + 去重建议
4. `review_triage`: 评论分级 + 是否自动修复
5. `daily_debrief`: 模式总结（仅建议，不自动改系统提示词）

所有输出必须 JSON Schema 校验：
- 校验失败最多重试 1 次
- 继续失败走确定性 fallback

---

## 10. Worker 与执行协议

### 10.1 Worker RPC

```protobuf
service WorkerService {
  rpc SpawnAgent(SpawnRequest) returns (SpawnResponse);
  rpc CheckAgent(CheckRequest) returns (AgentStatus);
  rpc KillAgent(KillRequest) returns (KillResponse);
  rpc SendInput(SendInputRequest) returns (SendInputResponse);
  rpc RenewLease(RenewLeaseRequest) returns (RenewLeaseResponse);
  rpc Heartbeat(HeartbeatRequest) returns (HeartbeatResponse);
}
```

### 10.2 Spawn 原子流程

1. 预检仓库与分支基线
2. 创建 worktree
3. 生成 attempt 记录
4. 启动 agent runtime
5. 成功后写入 lease + 状态迁移

任一步失败都必须回滚并写事件。

---

## 11. 通知策略

仅推送“需要人动作”的事件：

- `PR ready for human review`
- `task failed terminal`
- `task stuck and needs intervention`
- `daily summary`

额外要求：
- 每条告警带 `task_id`、`attempt_no`、`recommended action`
- 支持一键操作：`retry` / `kill` / `open_pr`

---

## 12. 配置规范

`configs/repos.yaml`
- repo 路径
- install/test 命令
- 安全 profile
- review policy

`configs/workers.yaml`
- worker 地址
- capability
- max concurrency
- drain 模式（维护时不接新任务）

`configs/brain.yaml`
- 主模型/回退模型
- token 预算
- schema 校验策略
- fallback 策略

---

## 13. 分阶段落地计划（重排）

### Phase A（P0，先上线）

- Task Store + Event Log + Idempotency
- Brain Intake + Retry（最小可用）
- 单机 Worker 执行闭环
- Lease + Recovery + Audit

退出标准：
- 单机连续运行 7 天，无僵尸任务
- 重复提交不产生重复执行
- 任意进程重启后 2 分钟内恢复调度

### Phase B（P1，扩展能力）

- gRPC 跨机 worker
- 分级评审策略
- 多信号完成判定
- Telegram 全量命令

退出标准：
- 3 台机器稳定分发
- 中断恢复成功率 > 99%

### Phase C（P2，自动发现）

- Sentry/GitHub/Cron ingress
- 语义去重
- 日报与策略建议闭环

退出标准：
- 自动发现任务误报率可控（< 20%）

---

## 14. 运行与质量指标（SLO）

- `task_success_rate`（24h）
- `median_time_to_pr`
- `stuck_task_count`
- `retry_rate`
- `brain_schema_error_rate`
- `human_intervention_rate`
- `cost_per_merged_pr`

阈值建议：
- schema 错误率 < 1%
- stuck 任务 < 2%
- 人工干预率随版本逐步下降

---

## 15. 安全与合规

- Token 只存系统密钥管理，不落库明文
- 审计日志保留 90 天
- Telegram 命令强制 allowlist
- 高风险命令二次确认（例如 `kill` + `merge`）

---

## 16. 仍待决策的问题

1. Dispatcher standby 节点部署在 Pro 还是 EC2？
2. 高风险任务是否必须人工批准 Brain prompt？
3. 是否引入“多仓任务编排”还是继续单仓任务模型？
4. 是否保留 ai-collab 模式作为 `high-risk` 执行策略？

---

## 17. 最终建议

先把 Ultraswarm 做成“稳定调度系统”，再做“全自动发现与优化系统”。

顺序不要反：
- 先把 P0 做硬
- 再把 P1 做快
- 最后把 P2 做聪明

这是从可演示到可运营的最短路径。
