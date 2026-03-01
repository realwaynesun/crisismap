# Ultraswarm: Distributed Agent Orchestration System

> A system where Wayne sends a Telegram message (or does nothing at all),
> multiple AI agents work in parallel across machines,
> and results arrive as merge-ready PRs.

---

## Table of Contents

1. [Origin & Motivation](#origin--motivation)
2. [Prior Art Analysis](#prior-art-analysis)
3. [The Two-Tier Architecture](#the-two-tier-architecture)
4. [Design Principles](#design-principles)
5. [System Architecture](#system-architecture)
6. [Core Modules](#core-modules)
7. [Data Model](#data-model)
8. [The Brain: AI Decision Points](#the-brain-ai-decision-points)
9. [Context Assembly Strategy](#context-assembly-strategy)
10. [Lifecycle State Machine](#lifecycle-state-machine)
11. [Cross-Machine Topology](#cross-machine-topology)
12. [Telegram Bot Interface](#telegram-bot-interface)
13. [Review Pipeline](#review-pipeline)
14. [Project Structure](#project-structure)
15. [Technology Decisions](#technology-decisions)
16. [Build Schedule](#build-schedule)
17. [Open Questions](#open-questions)

---

## Origin & Motivation

### The Problem

Current workflow (ai-collab) solves "two AIs collaborating on one task" but cannot:

- Run multiple tasks in parallel
- Dispatch work across machines
- Inject business context into agent prompts
- Discover tasks automatically (Sentry errors, GitHub issues)
- Notify completion without terminal babysitting

### The Inspiration

Elvis Sun's OpenClaw + Codex/Claude Code agent swarm (Feb 2026, 4.5M views):

- 94 commits/day, 7 PRs in 30 minutes
- One person, zero editor time
- OpenClaw as orchestration layer ("Zoe") with Obsidian vault as business context
- Cost: ~$190/month (Claude $100 + Codex $90)

Key insight from Elvis: **Context windows are zero-sum.** Fill with code, no room for
business context. Fill with business context, no room for code. Two-tier architecture
(orchestrator + agents) solves this by specializing each layer.

### What OpenClaw Actually Is

OpenClaw is a **messaging gateway** — a single Node.js process bridging chat apps
(Telegram/WhatsApp/Discord) to AI models with shell access. Elvis's "Zoe" is just
OpenClaw + a persona prompt + his Obsidian vault fed as context. The orchestration
"intelligence" is the LLM improvising within OpenClaw's prompt framework.

We don't need OpenClaw. We already have all the pieces:

| Elvis uses           | Wayne already has                          |
| -------------------- | ------------------------------------------ |
| OpenClaw Gateway     | Claude Code (shell + tools)                |
| Telegram channel     | @caxinfobot + other Telegram bots          |
| Obsidian vault       | knowledge-vault skill                      |
| coding-agent skill   | ai-collab / Claude Code Task tool          |
| cron monitoring      | cron on cax EC2                            |
| tmux + worktree      | tmux + git worktree (familiar)             |

---

## Prior Art Analysis

### claude-wrapper (github.com/KaKeimei/claude-wrapper)

~280 lines of Go. Telegram bot that calls `claude --print`.

**Worth borrowing:**

1. **macOS LaunchAgent integration** (`service/launchd.go`) — auto-generates plist,
   auto-detects `claude` binary, KeepAlive for crash restart. Better than tmux for
   daemon processes.
2. **Executor interface** — `Execute(ctx, prompt) (string, error)`. Clean abstraction
   for plugging in codex/claude/any agent.
3. **Markdown fallback** — send Markdown first, fall back to plain text on parse failure.
   Telegram's Markdown parser is strict; this avoids silent message drops.
4. **Rune-aware message splitting** — splits at whitespace boundaries on rune (not byte)
   boundaries. CJK safe.

**Not borrowing:**

- `--print` mode (no tools, no session state)
- In-memory history (lost on restart)
- Single fixed workdir (no per-task isolation)
- No task concept, no concurrency, no monitoring

### ai-collab (Wayne's existing system)

Dual-AI collaboration: CC drafts plan, Codex reviews, iterate, then Codex writes code,
CC executes. Integrated ticket tracking via `tk` CLI.

**Strengths to preserve:**

- Codex-writes-Claude-executes mutual review pattern
- Hook-based enforcement (pre-deploy check, enforce Codex writes)
- Session state persistence + resume capability
- Zero-user-intervention auto-loop design

**Gaps ultraswarm fills:**

| ai-collab                 | ultraswarm                             |
| ------------------------- | -------------------------------------- |
| Serial (one task)         | Parallel (N tasks across M machines)   |
| No business context       | AI brain with vault/Sentry/customer    |
| Manual trigger only       | Auto-discovery (cron, webhooks)        |
| Terminal-bound            | Telegram + CLI + webhook               |
| Fixed agent pair          | AI-driven agent routing                |
| Same prompt on retry      | AI failure analysis + prompt rewrite   |
| In-process monitoring     | Out-of-process lifecycle manager       |

---

## The Two-Tier Architecture

This is the fundamental design decision. Everything else follows from it.

### The Core Insight

> "Context windows are zero-sum. You have to choose what goes in."
> — Elvis Sun

A single AI cannot hold both business context AND codebase context. Trying to do
both produces mediocre results in both dimensions. The solution is specialization
through context separation:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   Tier 1: BRAIN (Orchestrator AI)                        │
│                                                          │
│   Context filled with:                                   │
│   - Business context (customer data, meeting notes)      │
│   - Historical decisions (what worked, what failed)      │
│   - Cross-project knowledge (vault, Sentry, GitHub)      │
│   - Past prompt patterns (what prompt style succeeded)   │
│                                                          │
│   Responsibility: Understand WHY                         │
│   - Why is this task needed?                             │
│   - What does the customer actually want?                │
│   - Which agent should handle it?                        │
│   - What prompt will produce the best result?            │
│   - Why did the last attempt fail?                       │
│                                                          │
│   Output: Precise, context-rich prompts                  │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │ prompts
                       ▼
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   Tier 2: HANDS (Coding Agents)                          │
│                                                          │
│   Context filled with:                                   │
│   - Codebase (CLAUDE.md, source files, types)            │
│   - The precise prompt from Tier 1                       │
│   - Test files, CI config                                │
│                                                          │
│   Responsibility: Understand HOW                         │
│   - How to implement the change in this codebase?        │
│   - How to write tests for this?                         │
│   - How to make CI pass?                                 │
│                                                          │
│   Output: Code changes, PRs, passing tests               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Why the Brain Must Be AI, Not Rules

An earlier version of this design used a deterministic rule engine for the orchestrator.
That was wrong. Here's why:

**What rules can do:**
- Route task to codex vs claude based on keyword matching
- Template-fill a prompt with repo CLAUDE.md + file paths
- Detect timeout and respawn with same/similar prompt
- Check CI status and trigger reviews

**What rules cannot do:**
- Understand "那个客户上次说的那个功能做一下" (ambiguous Telegram input)
- Analyze an error log and understand the root cause (not pattern match)
- Decide that a task should be split into 3 sub-tasks
- Write a prompt that accounts for "we tried this approach last month and it
  broke billing, so avoid touching the payment module"
- Identify that a Sentry error is actually caused by a config change, not a code bug

The orchestrator's job is inherently about understanding intent, analyzing failure,
and synthesizing context — all AI strengths, all rule-engine blind spots.

### How It Works in Practice

The Brain is NOT a long-running AI session. It's a Go process that makes **short,
event-driven AI calls** at specific decision points. State lives in SQLite, not in
any AI's context window.

```
Go process (always running, deterministic)
    │
    ├─ Event: new task from Telegram
    │   └─ AI call: "Given this business context + task description,
    │                 produce a precise coding prompt + choose agent type"
    │
    ├─ Event: agent failed (CI error)
    │   └─ AI call: "Given this error log + previous prompt + business context,
    │                 analyze the root cause and rewrite the prompt"
    │
    ├─ Event: cron scan found Sentry errors
    │   └─ AI call: "Given these 4 Sentry errors + repo context,
    │                 which ones need code fixes? Generate task descriptions"
    │
    ├─ Event: PR review has critical comments
    │   └─ AI call: "Given these review comments + the diff,
    │                 generate a focused fix prompt for the agent"
    │
    └─ Everything else: deterministic Go code
        - Task queue management
        - Worker health checks
        - tmux process monitoring
        - CI status polling
        - Telegram message sending
        - Worktree lifecycle
```

**Token cost estimate:** Each AI call is short (one-shot, ~2K-5K input tokens,
~500-1K output). At ~$0.01-0.03 per call, with ~20-50 calls per day, that's
$0.50-1.50/day for the brain. Negligible compared to the agent execution costs.

### The Separation Visualized

```
                    Wayne
                      │
                      │ "Fix the bug that customer X reported"
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  BRAIN (Orchestrator)                                        │
│                                                              │
│  Reads:                          Produces:                   │
│  - Customer X's meeting notes    - "In src/api/billing.ts,  │
│  - Customer X's config from DB     the calculateDiscount()   │
│  - Sentry error #4521              function returns NaN when │
│  - Last 3 successful billing       discount_pct is null.     │
│    bug-fix prompts                 Add null check. Customer   │
│  - Repo CLAUDE.md                  X has 15% discount tier.  │
│                                    Test with: pct=null,      │
│  Decides:                          pct=0, pct=0.15"          │
│  - Agent: codex                                              │
│  - Priority: urgent              - Routes to Mac Mini worker │
│  - This is a billing bug,                                    │
│    use the pattern that                                      │
│    worked for PR #298                                        │
└──────────────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│  HANDS (Codex Agent on Mac Mini)                             │
│                                                              │
│  Reads:                          Produces:                   │
│  - The precise prompt above      - Fix in billing.ts         │
│  - src/api/billing.ts            - Unit test for null case   │
│  - src/types/billing.d.ts        - PR #352                   │
│  - tests/billing.test.ts         - All tests pass            │
│                                                              │
│  Does NOT know/need:                                         │
│  - Who customer X is                                         │
│  - Meeting notes                                             │
│  - Business strategy                                         │
│  - That this is the 3rd billing bug this month               │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Principles

1. **Two tiers: Brain thinks, Hands code.**
   The orchestrator AI holds business context and produces precise prompts.
   Coding agents hold codebase context and produce code. Never mix the two.

2. **Go skeleton, AI at decision points.**
   The Go process handles all deterministic work (scheduling, process management,
   state transitions, notifications). AI is invoked only when understanding or
   judgment is required — not for mechanical tasks.

3. **Notify only when human attention is needed.**
   Don't push "agent spawned" or "CI running". Push "PR ready to merge" and
   "task failed after 3 retries".

4. **Every agent is disposable.**
   If an agent dies, the system respawns it. No precious state inside agents.
   All state lives in the dispatcher's SQLite.

5. **Cross-machine from day one.**
   Worker daemon runs on each machine. Dispatcher talks to workers over gRPC/Tailscale.
   Not an afterthought — the protocol is designed upfront.

6. **Single binary per role.**
   `dispatcher` binary for the control plane. `worker` binary for each machine.
   `swarmctl` binary for human CLI. All compiled from the same Go module.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ingress Layer                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Telegram  │  │ swarmctl │  │   Cron   │  │  Webhook    │ │
│  │ Bot      │  │   CLI    │  │  Scanner  │  │  GH/Sentry  │ │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│        └─────────────┴─────────────┴───────────────┘        │
│                           │                                  │
│                    gRPC / Unix Socket                        │
└───────────────────────────┼──────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                    Dispatcher (Mac Mini)                       │
│                    Go process + AI Brain                       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    AI Brain                             │  │
│  │  Short-lived LLM calls at decision points:              │  │
│  │  • Task intake → understand intent, generate prompt     │  │
│  │  • Agent selection → choose best agent + model          │  │
│  │  • Failure analysis → diagnose root cause, rewrite      │  │
│  │  • Task discovery → triage Sentry/Issues into tasks     │  │
│  │  • Review triage → assess review comments severity      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐ │
│  │  Task Queue   │  │ Context Store │  │ Prompt History     │ │
│  │  SQLite       │  │ vault/repo    │  │ what worked before │ │
│  └──────┬───────┘  └──────┬────────┘  └─────────┬──────────┘ │
│         │                 │                      │            │
│  ┌──────┴───────┐  ┌─────┴─────────┐  ┌────────┴──────────┐ │
│  │  State Store  │  │  Worker Pool  │  │ Lifecycle Manager │ │
│  │  SQLite       │  │  gRPC clients │  │ timeout/retry/gc  │ │
│  └──────────────┘  └───────────────┘  └────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Notification Hub                      │  │
│  │            Telegram push on actionable events           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬────────────────────────────────────┘
                           │ gRPC over Tailscale
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Worker: Mini │ │ Worker: Pro  │ │ Worker: EC2  │
│ capacity: 6  │ │ capacity: 3  │ │ capacity: 2  │
│              │ │              │ │              │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│ │ Agent    │ │ │ │ Agent    │ │ │ │ Agent    │ │
│ │ worktree │ │ │ │ worktree │ │ │ │ worktree │ │
│ │ tmux     │ │ │ │ tmux     │ │ │ │ tmux     │ │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │
│ ┌──────────┐ │ │              │ │              │
│ │ Agent    │ │ │              │ │              │
│ │ ...      │ │ │              │ │              │
│ └──────────┘ │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                      Review Pipeline                          │
│  PR → CI (lint/types/test/e2e) → Codex review → Claude review │
│  → All passed → Telegram: "PR #N ready to merge"              │
└───────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### Module 1: Task Store (SQLite)

Single source of truth for all task state. Not JSON files — SQLite gives concurrent
access, querying, and atomic writes.

Production-hardening additions (merged from Codex review):
- `idempotency_key` + unique index to prevent duplicate tasks from Telegram retries,
  webhook redelivery, and cron overlap.
- `task_attempts` replaces `prompt_history` so each retry keeps agent/model/timing metadata.
- `task_leases` ensures crashed workers don't leave tasks stuck forever.
- `command_audit` stores command execution traces for postmortem and security review.

```sql
CREATE TABLE tasks (
    id             TEXT PRIMARY KEY,  -- ULID (time-sortable)
    idempotency_key TEXT NOT NULL UNIQUE, -- dedupe key from ingress source
    source         TEXT NOT NULL,     -- telegram | cli | cron_sentry | cron_github | webhook
    repo           TEXT NOT NULL,     -- e.g. "cax", "medialyst"
    description    TEXT NOT NULL,     -- human-readable task description (possibly vague)
    refined_intent TEXT,              -- AI Brain's interpretation of the task
    prompt         TEXT,              -- final assembled prompt sent to agent
    agent_type     TEXT,              -- codex | claude
    model          TEXT,              -- gpt-5.3-codex | claude-opus-4-6
    routing_reason TEXT,              -- AI Brain's reasoning for agent choice
    priority       INTEGER DEFAULT 0, -- -1=low, 0=normal, 1=urgent
    risk_level     TEXT DEFAULT 'medium', -- low | medium | high
    status         TEXT DEFAULT 'queued',
    worker_node    TEXT,              -- mini | pro | ec2-cax
    worktree_path  TEXT,
    branch         TEXT,
    tmux_session   TEXT,
    pr_number      INTEGER,
    pr_url         TEXT,
    ci_status      TEXT,              -- null | pending | passed | failed
    review_status  TEXT,              -- null | pending | passed | needs_fix
    retry_count    INTEGER DEFAULT 0,
    max_retries    INTEGER DEFAULT 3,
    error_log      TEXT,
    brain_analysis TEXT,              -- AI Brain's failure analysis (on retry)
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at    DATETIME,
    started_at     DATETIME,
    completed_at   DATETIME
);

CREATE TABLE task_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id   TEXT NOT NULL REFERENCES tasks(id),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    event     TEXT NOT NULL,  -- queued | brain_analyzed | assigned | spawned | output |
                              -- error | brain_retry_analysis | retry | pr_created |
                              -- ci_passed | ci_failed | review_passed | review_failed |
                              -- completed | failed
    detail    TEXT
);

CREATE TABLE task_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    TEXT NOT NULL REFERENCES tasks(id),
    attempt    INTEGER NOT NULL,  -- 1, 2, 3...
    agent_type TEXT NOT NULL,     -- codex | claude
    model      TEXT NOT NULL,
    started_at DATETIME,
    ended_at   DATETIME,
    prompt     TEXT NOT NULL,
    outcome    TEXT,              -- success | failure
    error_msg  TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brain_calls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     TEXT REFERENCES tasks(id),  -- nullable for discovery calls
    call_type   TEXT NOT NULL,  -- intake | routing | retry_analysis | discovery | review_triage
    input_summary TEXT,         -- truncated input for debugging
    output      TEXT NOT NULL,  -- AI response
    model_used  TEXT,           -- which model was called
    tokens_in   INTEGER,
    tokens_out  INTEGER,
    latency_ms  INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_leases (
    task_id         TEXT PRIMARY KEY REFERENCES tasks(id),
    worker_node     TEXT NOT NULL,
    lease_expires_at DATETIME NOT NULL,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE command_audit (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    TEXT REFERENCES tasks(id),
    worker_node TEXT,
    command    TEXT NOT NULL,
    exit_code  INTEGER,
    started_at DATETIME,
    ended_at   DATETIME
);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE UNIQUE INDEX idx_tasks_idempotency ON tasks(idempotency_key);
CREATE INDEX idx_tasks_worker ON tasks(worker_node, status);
CREATE INDEX idx_tasks_repo ON tasks(repo, status);
CREATE INDEX idx_logs_task ON task_logs(task_id, timestamp);
CREATE INDEX idx_brain_calls_task ON brain_calls(task_id);
CREATE INDEX idx_brain_calls_type ON brain_calls(call_type, created_at);
CREATE INDEX idx_attempts_task ON task_attempts(task_id, attempt);
CREATE INDEX idx_leases_expiry ON task_leases(lease_expires_at);
CREATE INDEX idx_audit_task ON command_audit(task_id, started_at);
```

### Module 2: AI Brain

The orchestrator intelligence. Not a long-running session — a library of short,
structured AI calls invoked by the Go process at decision points.

Each call type has a defined input schema (what context to gather) and output schema
(what structured response to expect).

**Call types:**

| Call Type        | Trigger                          | Input                                           | Output                                          |
| ---------------- | -------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `intake`         | New task arrives                 | task description + vault context + repo info     | refined_intent + prompt + agent_type + priority  |
| `routing`        | Task needs agent assignment      | refined_intent + repo config + worker capacity   | agent_type + model + routing_reason              |
| `retry_analysis` | Agent failed                     | error_log + previous prompt + business context   | root cause analysis + rewritten prompt           |
| `discovery`      | Cron scan found signals          | Sentry errors / GitHub issues / git log          | list of task descriptions + priorities           |
| `review_triage`  | PR has review comments           | review comments + diff + task intent             | severity assessment + fix prompt (if needed)     |
| `task_split`     | Brain decides task is too large  | refined_intent + repo structure                  | list of sub-task descriptions                    |

**Brain model selection:**

The brain itself uses the best available model (currently `claude-opus-4-6` or
`gpt-5.3-codex`). Since brain calls are short and infrequent (~20-50/day), cost
is negligible — always use the strongest model for maximum reasoning quality.

**Structured output:**

Every brain call returns JSON with a defined schema. The Go process parses
the response and acts on it deterministically. If the AI returns malformed
output, retry once; if still malformed, fall back to a simpler deterministic
heuristic and log the failure.

```
Brain call: intake
Input: {
  "task_description": "Fix the bug that customer X reported last week",
  "customer_notes": "Customer X (Acme Corp) reported on 2026-02-25 that
                     discount calculations show NaN for their 15% tier...",
  "repo_info": { "name": "medialyst", "language": "typescript" },
  "recent_similar_tasks": [
    { "description": "Fix billing NaN for null discount", "prompt": "...", "outcome": "success" }
  ]
}

Output: {
  "refined_intent": "Fix NaN in calculateDiscount() when discount_pct is null.
                     Customer Acme Corp has 15% discount tier.",
  "prompt": "In src/api/billing.ts, the calculateDiscount() function returns NaN
             when discount_pct is null. Add null coalescing (default to 0).
             Test with: pct=null, pct=0, pct=0.15. Reference PR #298 for pattern.",
  "agent_type": "codex",
  "model": "gpt-5.3-codex",
  "priority": 1,
  "routing_reason": "Billing logic bug → Codex for backend debugging.
                     Similar to PR #298 which succeeded with Codex."
}
```

### Module 3: Context Store

Feeds the Brain with relevant context for each decision. This is the raw material
the Brain reasons over.

**Context sources:**

| Source                | Storage                  | Access method                     |
| --------------------- | ------------------------ | --------------------------------- |
| Repo CLAUDE.md        | Git repos on disk        | Read file                         |
| Repo source files     | Git repos on disk        | grep/glob by keywords             |
| Knowledge vault       | Obsidian vault on disk   | File search by topic              |
| Customer notes        | Obsidian vault           | Search by customer name           |
| Meeting notes         | Obsidian vault           | Recent files, date-filtered       |
| Sentry errors         | Sentry API               | API call, filtered by project     |
| GitHub issues         | GitHub API / gh CLI      | `gh issue list`                   |
| Past prompts          | SQLite task_attempts     | SQL query by repo + keywords      |
| Past brain decisions  | SQLite brain_calls       | SQL query by call_type            |

**Token budget for brain calls:**

Brain calls are short. Input is capped at ~10K tokens (enough for context summary
+ task description + a few examples). The Brain doesn't need to see entire files —
it gets summaries and references. The coding agents see the actual files.

### Module 4: Worker Pool

Each machine runs a `worker` binary that:

1. Registers with the dispatcher on startup (reports capacity, capabilities)
2. Accepts SpawnAgent / CheckAgent / KillAgent / SendInput RPCs
3. Manages local worktrees + tmux sessions
4. Reports completion/failure back to dispatcher
5. Sends heartbeat every 30 seconds

**Worker capacity planning:**

| Machine      | RAM  | Max Agents | Agent Types      | Notes                   |
| ------------ | ---- | ---------- | ---------------- | ----------------------- |
| Mac Mini     | 32GB | 6          | codex, claude    | Primary worker          |
| MacBook Pro  | ?GB  | 3          | codex, claude    | Secondary, when docked  |
| EC2 cax      | 3.7GB| 1          | codex only       | Limited RAM, light tasks|

Worker selection strategy: least-loaded node that supports the required agent type.

**Agent spawn sequence (inside worker):**

```
1. git worktree add ../{repo}-wt-{taskID} -b feat/{taskID} origin/main
2. cd ../{repo}-wt-{taskID}
3. [if node project] pnpm install --frozen-lockfile
4. tmux new-session -d -s "sw-{taskID}" \
     "{agent_binary} {flags} '{prompt}'"
5. Start output watcher goroutine (tail tmux pane)
6. Report "spawned" to dispatcher
```

**Agent completion detection (multi-signal, not tmux-only):**

The watcher uses multiple signals before state transition:
- tmux session exit + process exit code
- `gh pr create` output (PR URL captured) and PR API confirmation
- CI status API (`pending`/`passed`/`failed`)
- Known error patterns (compilation failure, test failure, rate limit)

No single log line is treated as final truth for lifecycle transitions.

### Module 5: Lifecycle Manager

Runs as a goroutine inside the dispatcher. Checks all running tasks every 2 minutes.

**State machine:**

```
                        ┌──────────────────────┐
                        │                      │
                        ▼                      │
queued ──► brain_intake ──► assigned ──► running ──► pr_created ──► ci_check
                                │                          │
                                │ (agent dies/timeout)     │ ci_failed
                                ▼                          ▼
                    failed_recoverable ◄── brain_retry ◄── retry (count < max)
                                │                          │
                                │                    ci_passed
                                │                          │
                                │                          ▼
                                │                   review_check
                                │                      │       │
                                │              review_passed  review_failed
                                │                      │       │
                                │                      ▼       ▼
                                │                    done   brain_retry
                                │                              │
                                ◄──────────────────────────────┘
                                                  (count >= max)
```

Note: `brain_intake` and `brain_retry` are states where the AI Brain is invoked.
These are the only states that consume LLM tokens. All other transitions are
deterministic.

**State write authority (hard rule):**
- Only `lifecycle manager` can mutate `tasks.status`.
- Other modules (ingress, brain, worker, notifier) only append events to `task_logs`.
- Lifecycle manager consumes events and performs validated transitions.

**Terminal status policy:**
- Explicit terminal statuses: `done`, `failed_terminal`, `cancelled`.
- `failed_recoverable` is non-terminal and can re-enter retry flow.

**Startup recovery (dispatcher reboot/crash):**
1. On startup, scan tasks in `assigned`/`running`/`ci_check`/`review_check`.
2. Reconcile each task against `task_leases` and worker heartbeat.
3. If lease expired or worker unreachable, mark `failed_recoverable` and enqueue retry.
4. If worker confirms active session, restore task to `running`.

**Timeout rules:**

| Condition                              | Action                             |
| -------------------------------------- | ---------------------------------- |
| Running > 30min, no output             | Send nudge via tmux send-keys      |
| Running > 60min, no PR                 | Kill → brain_retry (AI analyzes)   |
| Running > 120min                       | Kill + failed_terminal + notify    |
| CI failed                              | → brain_retry (AI diagnoses error) |
| CI failed 3x                           | failed_terminal + notify           |
| Review has critical comments           | → brain_retry (AI reads comments)  |

**Worktree cleanup:**

Daily at 04:00 UTC:
- Remove worktrees for tasks completed > 24 hours ago
- Remove worktrees for tasks failed > 48 hours ago (keep longer for debugging)
- Log cleanup actions

### Module 6: Notification Hub

**Notification rules — only push when human action is needed:**

| Event                    | Push? | Format                               |
| ------------------------ | ----- | ------------------------------------ |
| Task queued              | No    |                                      |
| Brain analyzed           | No    |                                      |
| Agent spawned            | No    |                                      |
| CI running               | No    |                                      |
| CI passed                | No    |                                      |
| PR ready (all checks)   | Yes   | PR #{n}: {desc} — ready to merge    |
| Task failed (final)     | Yes   | FAILED: {desc} — {brain analysis}   |
| Agent stuck (>30min)     | No    | (auto-nudge first)                   |
| Agent stuck (>60min)     | Yes   | STUCK: {desc} — needs attention      |
| Daily summary            | Yes   | stats + ready PRs + failures         |

Note: failure notifications now include the Brain's analysis of what went wrong,
not just raw error logs.

**Daily summary format (08:00 local):**

```
Ultraswarm Daily — Mar 1

Ready to merge:
  PR #341 cax: fix websocket reconnect logic
  PR #342 medialyst: add template system

Running (2):
  cax: optimize query performance (45min)
  medialyst: update billing flow (12min)

Failed (1):
  cax: migrate to new API schema (3/3 retries)
  Brain analysis: Agent kept modifying the old v1 endpoint
  instead of creating a new v2 endpoint. May need manual
  architecture guidance.

Brain stats: 23 calls today, ~$1.20 total
Agent stats: 7 completed, 1 failed, 87% success rate
```

---

## Data Model

### Task Status Flow

```
          ┌──────────────────────────────────────┐
          │                                      │
          ▼                                      │
queued ──► brain_intake ──► assigned ──► running ──► pr_created ──► ci_check
                              │                          │
                              │ (agent dies/timeout)     │ ci_failed
                              ▼                          ▼
                    failed_recoverable ◄──── brain_retry ◄── retry (count < max)
                              │                          │
                              │                    ci_passed
                              │                          │
                              │                          ▼
                              │                   review_check
                              │                      │       │
                              │              review_passed  review_failed
                              │                      │       │
                              │                      ▼       ▼
                              │                    done   brain_retry
                              │                              │
                              ◄──────────────────────────────┘
                                                (count >= max)
```

Terminal statuses are explicit: `done`, `failed_terminal`, `cancelled`.
If retry budget is exhausted, `failed_recoverable` transitions to `failed_terminal`.

### Idempotency and Deduplication

All ingress adapters generate an `idempotency_key`:
- Telegram: `chat_id + message_id + repo`
- Webhook: provider delivery/event id
- Cron discovery: `source + fingerprint + time_window`

`tasks.idempotency_key` is unique. Replays return the existing task instead of
creating duplicates.

### Config Files

**configs/repos.yaml:**

```yaml
repos:
  cax:
    path: ~/Documents/GitHub/cax
    language: python
    token_budget: 100000
    context_sources:
      - type: claude_md
      - type: directory_scan
        paths: [src/, tests/]
    review:
      codex: true
      claude: true

  medialyst:
    path: ~/Documents/GitHub/medialyst
    language: typescript
    token_budget: 120000
    install_cmd: "pnpm install --frozen-lockfile"
    context_sources:
      - type: claude_md
      - type: directory_scan
        paths: [src/, components/, api/]
    review:
      codex: true
      claude: true
      gemini: true
```

**configs/workers.yaml:**

```yaml
workers:
  mini:
    address: "100.x.x.x:9090"  # Tailscale IP
    max_agents: 6
    capabilities: [codex, claude]
    repos: [cax, medialyst]

  pro:
    address: "100.x.x.x:9090"
    max_agents: 3
    capabilities: [codex, claude]
    repos: [cax, medialyst]
    available_when: docked

  ec2-cax:
    address: "100.x.x.x:9090"
    max_agents: 1
    capabilities: [codex]
    repos: [cax]
```

**configs/brain.yaml:**

```yaml
brain:
  model: claude-opus-4-6          # best model for orchestration reasoning
  fallback_model: claude-sonnet-4-6  # if primary fails/rate-limited
  max_input_tokens: 10000
  max_output_tokens: 2000
  temperature: 0.3                # low temp for structured decisions

  context_sources:
    vault_path: ~/Documents/Obsidian
    vault_search_dirs:
      - meetings/
      - customers/
      - decisions/

  # Structured output schemas (validated by Go)
  retry_on_malformed: true
  max_retries_per_call: 2
  fallback_to_deterministic: true  # if AI call fails, use simple heuristics
```

---

## The Brain: AI Decision Points

### Decision Point 1: Task Intake

**When:** New task arrives from any ingress (Telegram, CLI, cron, webhook).

**Input assembled by Go:**
- Raw task description
- Repo config (from repos.yaml)
- Recent customer notes (if customer name detected)
- Recent meeting notes (last 7 days)
- Last 5 successful prompts for this repo
- Current worker capacity

**AI produces:**
```json
{
  "refined_intent": "Clear, specific description of what needs to happen",
  "should_split": false,
  "sub_tasks": [],
  "prompt": "The complete prompt to send to the coding agent",
  "agent_type": "codex",
  "model": "gpt-5.3-codex",
  "priority": 0,
  "risk_level": "low|medium|high",
  "routing_reason": "Why this agent/model was chosen",
  "estimated_complexity": "small|medium|large"
}
```

If `should_split` is true, the Go process creates multiple tasks from `sub_tasks`.

### Decision Point 2: Failure Analysis + Retry

**When:** An agent fails (CI error, timeout, crash).

**Input assembled by Go:**
- Previous prompt (from task_attempts)
- Error log (from tmux output)
- CI output (if applicable)
- The brain's original intake analysis
- Business context that might be relevant
- Number of retries so far

**AI produces:**
```json
{
  "root_cause": "What actually went wrong",
  "is_code_issue": true,
  "is_prompt_issue": false,
  "is_infra_issue": false,
  "rewritten_prompt": "New prompt addressing the root cause",
  "scope_change": "narrower|same|broader",
  "additional_context_needed": "Any files or info the agent should see",
  "should_switch_agent": false,
  "new_agent_type": null,
  "confidence": 0.8
}
```

If `confidence` is low (<0.5), the Brain recommends notifying Wayne instead of retrying.

### Decision Point 3: Task Discovery

**When:** Cron scan runs (every 30 minutes).

**Input assembled by Go:**
- New Sentry errors since last scan
- New/updated GitHub issues since last scan
- Recent git log (last 24h)
- Currently running/queued tasks (to avoid duplicates)

**AI produces:**
```json
{
  "new_tasks": [
    {
      "source": "sentry",
      "description": "Fix TypeError in payment webhook handler",
      "repo": "medialyst",
      "priority": 1,
      "reasoning": "Customer-facing payment error, 47 occurrences in last hour"
    }
  ],
  "ignored": [
    {
      "source": "github_issue",
      "title": "Add dark mode",
      "reason": "Feature request, not urgent, no customer impact"
    }
  ]
}
```

The Brain triages — not everything becomes a task. It filters noise.

### Decision Point 4: Review Triage

**When:** PR receives AI review comments.

**Input assembled by Go:**
- All review comments on the PR
- The diff
- The original task intent
- Repo's review standards

**AI produces:**
```json
{
  "has_critical_issues": false,
  "critical_issues": [],
  "should_auto_fix": true,
  "fix_prompt": "Address review comments: add null check on line 42,
                 rename variable per reviewer suggestion",
  "can_ignore": ["Consider adding TypeScript strict mode (nice-to-have)"],
  "ready_to_merge": false
}
```

### Decision Point 5: Daily Debrief

**When:** Daily at 20:00 local time.

**Input assembled by Go:**
- All tasks from today (completed, failed, running)
- All brain_calls from today
- Success/failure patterns
- Token costs

**AI produces:**
```json
{
  "summary": "Human-readable daily summary for Telegram",
  "patterns_noticed": [
    "Codex struggles with the new billing module — consider providing
     the full type definitions upfront",
    "Claude one-shots all Tailwind CSS tasks — keep routing frontend to Claude"
  ],
  "recommendations": [
    "Update cax CLAUDE.md with the new API endpoint patterns"
  ]
}
```

These patterns get stored and inform future brain decisions — the system learns.

---

## Context Assembly Strategy

Context assembly is now split between two consumers:

### Context for the Brain (Tier 1)

The Brain needs business context, not code details:

```
[System] You are the orchestrator for a multi-agent coding system. Your job is to
understand the task intent and produce a precise, actionable prompt for a coding agent.

[Business Context]
{customer notes, meeting notes, past decisions — from vault}

[Repo Overview]
{CLAUDE.md content — high-level architecture, not code}

[Historical Patterns]
{last 5 successful prompts for similar tasks in this repo}

[Task]
{raw task description from user}

[Instructions]
Produce a JSON response with: refined_intent, prompt, agent_type, model,
priority, routing_reason.
```

### Context for the Agents (Tier 2)

Agents need code context, not business context:

```
{Brain-generated prompt — precise, actionable, no ambiguity}

## Repository Context
{repo CLAUDE.md content}

## Relevant Files
{grep/glob results, selected by the Brain's prompt references}

## Constraints
- Create a feature branch and open a PR via `gh pr create --fill`
- Run tests before committing
- Include screenshots in PR description if UI changes
- Commit messages: conventional commits format

## Definition of Done
- PR created with descriptive title
- All tests pass
- No TypeScript/lint errors
- Changes are minimal and focused on the task
```

The critical difference: agents receive a **precise, pre-digested prompt** from the
Brain, not the raw vague task description. The Brain has already done the thinking.

### Prompt History + Learning

Every prompt + outcome is stored. The Brain retrieves similar past prompts to:
- Reuse prompt structures that worked
- Avoid approaches that failed
- Match the "voice" of successful prompts for each repo

This is simple keyword-based retrieval now, not embedding search. Upgrade path
exists but isn't needed at this scale.

---

## Lifecycle State Machine

### Timeout Configuration

```yaml
timeouts:
  brain_call: 30s     # max time for any brain AI call
  no_output: 30m      # nudge agent
  no_pr: 60m          # kill + brain_retry
  hard_limit: 120m    # kill + fail
  ci_wait: 15m        # how long to wait for CI
  review_wait: 10m    # how long to wait for AI reviews
```

### Retry Strategy (AI-Driven)

```
Attempt 1: Brain generates original prompt
           Agent executes

Attempt 2: Brain analyzes failure →
           "Root cause: agent modified the wrong file.
            Rewrite: specify exact file paths and line ranges."
           Agent executes with rewritten prompt

Attempt 3: Brain analyzes again →
           "Root cause: the approach itself is wrong.
            Rewrite: narrow scope to just the API layer,
            skip the UI changes for now."
           Agent executes with narrowed prompt

After 3: Brain produces final analysis for Wayne →
         "This task likely needs architectural guidance.
          The agent keeps trying to modify the legacy billing
          module but the new module should be used instead.
          Recommend: manual code review of src/billing/."
```

Compared to the old deterministic retry (which just appended error logs),
the Brain understands *why* things failed and adjusts *strategy*, not just context.

### Mid-Task Intervention

Via Telegram `/nudge {taskID} {message}` or via tmux:

```bash
tmux send-keys -t "sw-{taskID}" "{message}" Enter
```

Use cases:
- "Stop. Focus on the API layer first, not the UI."
- "The schema is in src/types/template.ts. Use that."
- "Customer wants X, not Y."

---

## Cross-Machine Topology

```
┌─────────────────────────────────────────────┐
│            Tailscale Network                 │
│                                              │
│  Mac Mini (100.x.x.1)                       │
│  ├─ dispatcher + brain (port 9080)           │
│  ├─ worker (port 9090)                       │
│  └─ SQLite DB (~/.ultraswarm/swarm.db)       │
│                                              │
│  MacBook Pro (100.x.x.2)                     │
│  └─ worker (port 9090)                       │
│                                              │
│  EC2 cax (100.x.x.3)                        │
│  └─ worker (port 9090)                       │
│                                              │
└─────────────────────────────────────────────┘
```

Dispatcher + Brain run on Mac Mini (always on). Workers run on all machines.
Mac Mini is both dispatcher AND worker.

gRPC protocol:

```protobuf
service WorkerService {
  rpc SpawnAgent(SpawnRequest) returns (SpawnResponse);
  rpc CheckAgent(CheckRequest) returns (AgentStatus);
  rpc KillAgent(KillRequest) returns (KillResponse);
  rpc SendInput(SendInputRequest) returns (SendInputResponse);
  rpc Heartbeat(HeartbeatRequest) returns (HeartbeatResponse);
}

service DispatcherService {
  rpc ReportCompletion(CompletionReport) returns (Ack);
  rpc ReportFailure(FailureReport) returns (Ack);
  rpc ReportProgress(ProgressReport) returns (Ack);
}
```

---

## Telegram Bot Interface

Bot: repurpose an existing bot or create `@ultraswarmbot`.

### Commands

```
Task Management:
  /task <description>                    Create new task (Brain refines it)
  /task <description> --repo cax         Create task for specific repo
  /task <description> --urgent           High priority
  /retry <taskID>                        Retry failed task (Brain re-analyzes)
  /kill <taskID>                         Force terminate

Monitoring:
  /status                                All active tasks overview
  /status <taskID>                       Single task detail + brain analysis
  /queue                                 Queued tasks waiting for workers
  /workers                               Worker node status + capacity
  /brain                                 Today's brain call stats + costs

Intervention:
  /nudge <taskID> <message>              Send message to running agent
  /reprompt <taskID> <new instructions>  Kill + Brain re-analyzes with new input

Reports:
  /today                                 Today's stats
  /week                                  Weekly summary
  /history <repo>                        Recent task history for repo
```

### Inline Buttons on PR Notifications

```
PR #341 ready to merge
cax: fix websocket reconnect logic
Duration: 23min | Agent: codex | Attempt: 1/3

[Merge] [View PR] [View Diff] [Reject + Retry]
```

Pressing [Merge] calls `gh pr merge 341 --squash` on the worker.
Pressing [Reject + Retry] triggers brain_retry with "Wayne rejected the PR" context.

---

## Review Pipeline

Every PR goes through:

```
1. CI Pipeline (mandatory)
   - Lint + type check
   - Unit tests
   - E2E tests (if UI changes)
   - Screenshot requirement (if UI changes)

2. AI Code Reviews (risk-level gated)
   - low risk: 1 reviewer (codex or claude)
   - medium risk: codex + claude
   - high risk: codex + claude (+ optional gemini), and always require manual merge approval

3. Brain Review Triage
   - Brain reads all review comments
   - Assesses severity (critical / medium / noise)
   - If critical → generates fix prompt → respawn agent
   - If only noise → mark "ready to merge"

4. Human Review (Wayne)
   - Telegram notification with PR link + screenshot
   - Brain's summary of what the agent did and why
   - 5-10 minute review
   - Merge via Telegram button or GitHub
```

---

## Project Structure

```
ultraswarm/
├── cmd/
│   ├── dispatcher/
│   │   └── main.go              -- Dispatcher + Brain entry point
│   ├── worker/
│   │   └── main.go              -- Worker daemon entry point
│   └── swarmctl/
│       └── main.go              -- CLI tool entry point
│
├── internal/
│   ├── task/
│   │   ├── model.go             -- Task struct, status constants
│   │   ├── store.go             -- SQLite CRUD operations
│   │   └── queue.go             -- Priority queue logic
│   │
│   ├── brain/
│   │   ├── brain.go             -- Brain interface + orchestration
│   │   ├── intake.go            -- Task intake decision
│   │   ├── routing.go           -- Agent selection decision
│   │   ├── retry.go             -- Failure analysis + prompt rewrite
│   │   ├── discovery.go         -- Task auto-discovery from signals
│   │   ├── review.go            -- Review comment triage
│   │   ├── debrief.go           -- Daily learning summary
│   │   └── llm.go               -- LLM client (Claude API / Codex API)
│   │
│   ├── context/
│   │   ├── store.go             -- Context store coordinator
│   │   ├── vault.go             -- Obsidian/knowledge vault reader
│   │   ├── repo.go              -- Repo file scanner (grep/glob)
│   │   └── history.go           -- Past prompt + brain call retrieval
│   │
│   ├── worker/
│   │   ├── server.go            -- gRPC server (runs on each machine)
│   │   ├── client.go            -- gRPC client (dispatcher side)
│   │   ├── pool.go              -- Worker connection pool + selection
│   │   └── health.go            -- Heartbeat + resource monitoring
│   │
│   ├── agent/
│   │   ├── spawner.go           -- worktree + tmux creation
│   │   ├── watcher.go           -- tmux output monitoring
│   │   └── executor.go          -- Executor interface + implementations
│   │
│   ├── lifecycle/
│   │   ├── manager.go           -- Main loop: check tasks, handle transitions
│   │   └── cleanup.go           -- Worktree + branch garbage collection
│   │
│   ├── notify/
│   │   ├── telegram.go          -- Telegram bot + message formatting
│   │   ├── buttons.go           -- Inline keyboard handlers
│   │   └── summary.go           -- Daily/weekly report generation
│   │
│   └── ingress/
│       ├── telegram.go          -- Telegram command parsing → task creation
│       ├── cli.go               -- CLI flag parsing → task creation
│       ├── cron.go              -- Sentry/GitHub/git log scanners
│       └── webhook.go           -- HTTP webhook handlers
│
├── proto/
│   └── worker.proto             -- gRPC service definitions
│
├── configs/
│   ├── repos.yaml               -- Per-repo configuration
│   ├── workers.yaml             -- Worker node definitions
│   └── brain.yaml               -- Brain model + context config
│
├── scripts/
│   ├── install-dispatcher.sh    -- LaunchAgent setup for dispatcher
│   └── install-worker.sh        -- LaunchAgent/systemd setup for worker
│
├── Makefile
├── go.mod
└── ARCHITECTURE.md              -- This file
```

Estimated: ~25 files, 200-400 lines each, ~6000 lines total Go code.
The brain/ package is the new addition (~1000 lines for 7 files).

---

## Technology Decisions

| Decision              | Choice                  | Rationale                                          |
| --------------------- | ----------------------- | -------------------------------------------------- |
| Language              | Go                      | Single binary, native concurrency, low memory      |
| Storage               | SQLite                  | Zero ops, concurrent safe, queryable, single file  |
| Brain AI              | Claude Opus 4.6 API     | Best reasoning for orchestration decisions         |
| Agent execution       | Codex CLI + Claude CLI  | Full tool access (Bash, Edit, etc.)                |
| Cross-machine comms   | gRPC over Tailscale     | Type-safe, bidirectional streaming, already have TS|
| Agent isolation       | git worktree + tmux     | Proven by Elvis, simple, debuggable                |
| Process management    | LaunchAgent / systemd   | Crash restart, boot start, no pm2/supervisor       |
| Notification          | Telegram bot API        | Already have bots, mobile-first                    |
| CLI                   | cobra (Go)              | Standard, good UX                                  |
| Config format         | YAML                    | Human-editable, good Go support                    |

### Why Not...

| Alternative              | Why rejected                                           |
| ------------------------ | ------------------------------------------------------ |
| Rules-only orchestrator  | Can't handle ambiguous input, can't reason about failure|
| Long-running AI session  | Context drift, crash = lose state, expensive            |
| OpenClaw                 | Gateway overkill, we need a scheduler not a chat bridge |
| Node.js/Python           | Runtime dependencies, higher memory, no single binary  |
| Redis/Postgres           | Operational overhead for what SQLite handles fine       |
| REST instead of gRPC     | No bidirectional streaming, less type safety            |
| Docker per agent         | Memory overhead per container, worktree is lighter      |
| Kubernetes               | Orbital cannon for a fly                               |
| JSON file registry       | Concurrent write corruption, no queries                |
| Embedding search         | Overkill for prompt history — keyword overlap works     |

---

## Build Schedule

Not MVP phases — each module is built to completion before moving on.

### Phase 1: Foundation (Week 1-2)

**Task store + data model + CLI entry point**

Deliverables:
- SQLite schema created and migrated (tasks, task_logs, task_attempts, brain_calls, task_leases, command_audit)
- Task CRUD operations with full status lifecycle
- Idempotency key generation in all ingress paths + dedupe behavior tests
- `swarmctl task create "description" --repo cax` works
- `swarmctl task list` / `swarmctl task get {id}` works
- `swarmctl task log {id}` shows event timeline
- Unit tests for store and queue logic

Exit criteria:
- can create, query, update, and log tasks from CLI
- duplicate ingress replay creates 0 duplicate tasks in test suite

### Phase 2: Brain Core (Week 3-4)

**AI Brain + context store + LLM client**

Deliverables:
- LLM client that calls Claude API with structured output
- Brain intake: raw description → refined intent + prompt + agent selection + risk_level
- Brain retry analysis: error log → root cause + rewritten prompt
- Context store: reads vault, repo CLAUDE.md, task_attempts
- brain_calls table logging all AI decisions
- Fallback to deterministic heuristics when AI call fails
- `swarmctl brain analyze "task description" --repo cax` for testing
- Unit tests with mocked LLM responses

Exit criteria:
- Brain can take a vague task and produce a precise, context-rich prompt
- structured output validation pass rate >= 99% in test harness

### Phase 3: Agent Execution (Week 5-6)

**Agent spawner + tmux watcher + local worker**

Deliverables:
- Worktree creation + cleanup
- tmux session spawn with codex/claude
- Output watcher detects completion, PR creation, errors (multi-signal)
- Worker runs locally (no gRPC yet, direct function calls)
- Full pipeline: `swarmctl task create` → brain intake → spawn agent → detect done
- Integration tests with real agent execution

Exit criteria:
- end-to-end: task in, PR out, fully automated on one machine
- 7-day soak test with no stuck tasks and successful startup recovery after process restart

### Phase 4: Lifecycle Automation (Week 7-8)

**Lifecycle manager + brain-driven retry + review pipeline**

Deliverables:
- 2-minute check loop for all running tasks
- Timeout detection + nudge/kill logic
- Brain-driven retry (failure analysis → rewritten prompt → respawn)
- Lease heartbeat + lease-expiry requeue logic
- CI status checking via `gh` CLI
- AI review triggering (codex review + claude review on PR)
- Brain review triage (assess severity, generate fix prompt)
- Daily debrief brain call (patterns + recommendations)

Exit criteria:
- full autonomous loop: spawn, monitor, brain-retry, review, done/fail
- interruption recovery success rate > 99% in chaos test runs

### Phase 5: Remote Interface (Week 9)

**Telegram bot + notification hub**

Deliverables:
- All `/task`, `/status`, `/nudge`, `/kill`, `/brain` commands
- Inline buttons on PR notifications (merge/view/reject)
- Daily summary at 08:00 (includes brain analysis)
- Failure alerts with brain's root cause analysis
- Message splitting + Markdown fallback
- User allowlist authentication

Exit criteria:
- can manage the entire system from Telegram on phone
- 95th percentile command round-trip < 3s (excluding long-running task actions)

### Phase 6: Distribution (Week 10)

**gRPC worker daemon + cross-machine dispatch**

Deliverables:
- proto definitions + code generation
- Worker daemon binary with heartbeat
- Dispatcher worker pool with least-loaded selection
- Cross-machine spawn/check/kill over Tailscale
- Worker health monitoring + capacity reporting
- `install-worker.sh` for each machine type

Exit criteria:
- tasks automatically dispatch to the least-loaded machine
- cross-machine dispatch success rate > 99% over 1,000 task simulation events

### Phase 7: Auto-Discovery (Week 11)

**Cron ingress + webhook handlers + brain discovery**

Deliverables:
- Sentry error scanner → brain discovery → filtered tasks
- GitHub issue scanner → brain discovery → filtered tasks
- Git log scanner → brain discovery → changelog/docs tasks
- GitHub webhook receiver (new issues, PR comments)
- Brain-powered deduplication (semantic, not just string match)

Exit criteria:
- system finds and fixes bugs before Wayne knows they exist
- discovery false-positive rate < 20% after two-week calibration

---

## Operating Metrics (SLO)

Track these metrics from day one:
- `task_success_rate_24h`
- `median_time_to_pr`
- `stuck_task_count`
- `retry_rate`
- `brain_schema_error_rate`
- `human_intervention_rate`
- `cost_per_merged_pr`

Suggested initial targets:
- `brain_schema_error_rate < 1%`
- `stuck_task_count / total_tasks < 2%`
- `interruption_recovery_success_rate > 99%`

---

## Open Questions

1. **Telegram bot identity** — Create a new `@ultraswarmbot` or repurpose an existing
   bot (e.g., `@caxinfobot`)?

2. **Dispatcher location** — Mac Mini is always-on, but if it sleeps/reboots, all
   orchestration stops. Need UPS / energy settings / EC2 fallback?

3. **Agent authentication** — codex and claude CLI both need auth tokens. How to
   manage tokens across machines? Environment variables in worker config?

4. **Brain model fallback** — If Claude API is down, fall back to Codex API for
   brain calls? Or queue tasks until API recovers?

5. **Cost tracking** — The brain_calls table tracks tokens. Should we add cost
   calculation and daily budget limits?

6. **Multi-repo PRs** — Some features span multiple repos. Support cross-repo
   orchestration or keep it single-repo per task?

7. **Gemini integration** — Elvis uses Gemini for UI design specs. Worth adding as
   a third agent type, or keep it two (codex + claude)?

8. **ai-collab integration** — Preserve the dual-AI mutual review for high-stakes
   tasks as a special "mode" within ultraswarm? Or fully replace?

9. **Security** — Workers have `--dangerously-skip-permissions` /
   `--dangerously-bypass-approvals-and-sandbox`. Acceptable risk for local machines
   on Tailscale? Additional sandboxing needed?

10. **Brain learning loop** — The daily debrief produces patterns. Should these
    auto-update the brain's system prompt, or require Wayne's approval first?
