# Job-Ops vs Career-Ops — Evaluation & LangGraph Roadmap

## Backend Comparison

| Aspect | Job-Ops | Career-Ops |
|--------|---------|------------|
| **Server** | Express + TypeScript, 43 route files | No server — runs via external AI CLI |
| **Database** | SQLite / Drizzle ORM, 20+ tables | Flat files: `.md` tables, `.tsv`, `.yml` |
| **Auth** | JWT sessions, user/password | None |
| **Multi-tenancy** | Every table scoped by `tenant_id` | Single-user only |
| **LLM Layer** | 8 providers, retry/fallback, JSON schema output | 2 providers (Claude CLI, Gemini), unstructured |
| **Pipeline** | Coded orchestrator: discover → score → select → tailor → PDF | AI CLI reads markdown instructions |
| **Job Scraping** | 14 extractor plugins (TypeScript) | 1 scanner script (Greenhouse/Ashby/Lever) |
| **CV Tailoring** | Ghostwriter service, streaming SSE (Server Sent Events), threaded chat | Markdown prompt the AI follows |
| **Tests** | 103 files, ~25K lines (Vitest) | 1 script checking file integrity |
| **Deployment** | `docker compose up -d`, GHCR images | Local only, needs AI CLI per user |

---

## Job-Ops

### Pros

- **Deployable now** — Docker Compose with health checks, GHCR images, onboarding wizard. Team can be running in 10 minutes.
- **Multi-tenant** — every table scoped by `tenant_id`. Each BD member gets their own workspace with data isolation.
- **Pluggable extractors** — add a job board by dropping a directory under `extractors/`. Auto-discovered by the orchestrator.
- **LLM abstraction** — `LlmService` supports 8 providers with per-provider retry, mode selection, credential validation, and model listing. Swapping models is a settings change, not a code change.
- **Structured scoring** — JSON schema-constrained LLM calls, salary penalty logic, configurable prompt templates. Deterministic output parsing, not free-form text.
- **Real test suite** — 103 test files covering API contracts, tenant isolation, pipeline, scoring, tailoring, PDF, auth.
- **Full client** — React dashboard with job cards, pipeline progress, settings UI, per-job chat, analytics.

### Vulnerabilities

- **SQLite will bottleneck** — single-writer. Concurrent pipeline runs and bulk scoring from multiple BD members will cause write contention. We do plan to shift it to PostgreSQL in future, but for our initial prototype, SQLite is good enough.
- **In-memory pipeline state** — challenge pause/resume uses raw Promises in a `Map`. Server restart kills paused pipelines. No persistence.
- **No worker separation** — pipeline runs on the main Node process. Long scoring batches degrade API responsiveness.
- **Monolithic pipeline** — `orchestrator.ts` is 911 lines. Adding conditional branching or new steps means growing this function.
- **No rate limiting** — API routes have no throttling. Exposed servers are vulnerable to abuse.
- **Basic auth only** — JWT + password. No OAuth/SSO/MFA. Acceptable for internal use, not for public exposure.
- **No audit log** — pipeline runs are logged but job state transitions aren't queryable.
- **Hardcoded defaults** — `DEFAULT_CONFIG.sources` is a static array, should be DB-backed per tenant.

---

## Career-Ops

### Pros

- **Deep evaluation** — A-F block system (role summary, CV match, level strategy, comp research, personalization, interview prep) is far richer than a 0-100 score.
- **STAR+R story bank** — accumulates reusable interview stories across evaluations.
- **Ghost-job detection** — Block G checks posting freshness, description quality, layoff signals, reposting patterns.
- **Zero-cost scanner** — `scan.mjs` hits ATS APIs directly. No LLM tokens consumed.
- **Multi-language modes** — DE/FR/JA localized evaluations.
- **Data contract** — clean user-layer vs system-layer separation prevents update conflicts.

### Vulnerabilities

- **No backend** — depends on an external AI CLI ($20/mo per user for Claude Code). You don't control the runtime.
- **Flat-file storage** — markdown tables as "database". No ACID, no indexes, no concurrent safety. Batch workers can corrupt data.
- **No team deployment** — each person clones the repo, installs their own CLI, manages their own config. No shared state.
- **No auth** — filesystem access = full access.
- **Prompt-fragile** — evaluation quality depends on 200+ lines of markdown being interpreted consistently. Model updates or prompt drift silently degrade output.
- **No API** — the web dashboard is read-only. Nothing can be triggered programmatically.
- **Single-user** — profile, CV, portals are single-instance files. No workspaces.
- **No tests** — the test script checks file existence, not logic correctness.

---

## Verdict

**Use Job-Ops.** Port Career-Ops' best ideas (A-F evaluation, story bank, ghost-job detection, archetype classification) as new services inside Job-Ops. Don't merge codebases.

---

## LangGraph Integration Roadmap

### Why LangGraph

The current pipeline is a 911-line async function with hardcoded step ordering, in-memory pause/resume via raw Promises, and no state persistence across restarts. LangGraph replaces this with a directed graph where:

- Each step is a **node** — composable, testable, replaceable
- **Conditional edges** route jobs through different paths based on score
- **Checkpoints** persist state to the database — pipelines survive restarts
- **`interrupt()`** provides native human-in-the-loop — no Promise hacks
- **Sub-graphs** enable parallel job evaluation and multi-agent workflows
- **LangSmith** traces every node execution for observability

This isn't just a refactor — it's the foundation for every feature you'll add going forward (deep evaluation, batch processing, company research agents, form filling, follow-up tracking).

---

Currently the system is usable and does work as intended, but to integrate LangGraph, we got this roadmap from Claude, although we feel that a few gimmicks can be made, but the things to cover are present here.

### Phase 0 — Foundation (Week 1)

**Goal:** Install LangGraph, define state, validate with a minimal graph.

```bash
npm --workspace orchestrator install @langchain/langgraph @langchain/core
```

Create the graph module structure:

```
orchestrator/src/server/pipeline/graph/
├── state.ts              # PipelineState annotation (Zod-typed)
├── checkpointer.ts       # SqliteSaver now, PostgresSaver later
├── nodes/
│   ├── load-profile.ts
│   ├── discover-jobs.ts
│   ├── import-jobs.ts
│   ├── score-jobs.ts
│   ├── route-by-score.ts  # conditional edge logic
│   ├── tailor-cv.ts
│   ├── generate-pdf.ts
│   └── human-review.ts
├── edges.ts              # Edge definitions
├── graph.ts              # Graph assembly + compilation
└── runner.ts             # Entry point, replaces current orchestrator
```

Tasks:
1. Define `PipelineState` annotation matching existing pipeline data flow
2. Set up `SqliteSaver` checkpointer using the existing SQLite connection
3. Wrap `loadProfileStep` and `discoverJobsStep` as nodes
4. Wire a two-node graph, invoke it, confirm checkpoint round-trip
5. Add integration test comparing graph output to current pipeline output

Design `state.ts` with every field you'll ever need in mind — adding state fields later requires migration. Include placeholders for deep evaluation results, story bank references, and review decisions now.

---

### Phase 1 — Pipeline Migration (Week 2–3)

**Goal:** Replace `orchestrator.ts` with a LangGraph graph, zero behavior change.

Tasks:
1. Wrap each remaining step function as a node (thin adapters calling the same code)
2. Wire linear edges: `loadProfile → discover → import → score → select → tailor → pdf`
3. Replace challenge pause/resume (`activeChallengeState` Promises) with `interrupt()` + checkpoint
4. Replace LLM-not-configured pause with a checkpoint interrupt
5. Delete `pipelineStateByTenant` Map — state lives in checkpoints now
6. Update API routes:
   - `POST /api/pipeline/start` → invoke the graph
   - `POST /api/pipeline/cancel` → cancel graph execution
   - `POST /api/pipeline/solve-challenge` → resume from interrupt
   - `POST /api/pipeline/resume-scoring` → resume from interrupt
7. Update SSE progress to read from graph state / node events
8. Run the full test suite — every existing test must still pass

Keep the old `orchestrator.ts` behind a feature flag (`PIPELINE_ENGINE=legacy|langgraph`) during this phase. Remove after validation.

---

### Phase 2 — Smart Routing & Deep Evaluation (Week 4–5)

**Goal:** Add conditional edges and port Career-Ops evaluation depth.

**Routing:**
- Score ≥ 80 → `deepEvaluate` node (full A-F block analysis)
- Score 50–79 → `basicTailor` node (current summary + skills)
- Score < 50 → `archive` node (mark as skipped)
- Thresholds configurable per tenant via settings

**Deep evaluation node** — structured LLM calls implementing:

| Block | Function | Output |
|-------|----------|--------|
| A | Role summary + archetype detection | Archetype, domain, seniority, remote policy |
| B | CV match with gap analysis | Requirement-to-evidence mapping, gap mitigations |
| C | Level strategy | JD level vs candidate level, positioning plan |
| D | Compensation research | Salary ranges, demand signals (tool-augmented web search) |
| E | Personalization plan | Top 5 CV changes, top 5 LinkedIn changes |
| F | Interview prep | 6–10 STAR+R stories mapped to JD requirements |
| G | Posting legitimacy | Ghost-job signals, freshness, description quality |

**New tables:**
- `job_evaluations` — stores structured evaluation blocks per job
- `interview_stories` — story bank accumulating STAR+R stories across evaluations
- `job_archetypes` — archetype classification per job

**New services:**
- `deep-evaluation.ts` — orchestrates A-G block generation via structured LLM calls
- `archetype-detector.ts` — classifies job postings into role archetypes
- `story-bank.ts` — manages STAR+R story accumulation and retrieval

---

### Phase 3 — PostgreSQL Migration (Week 6–7)

**Goal:** Replace SQLite with Postgres for concurrent multi-user access.

This is a prerequisite for the BD team to use the tool at scale. SQLite's single-writer model will break under concurrent pipeline runs.

Tasks:

1. **Add dependencies:**
   ```bash
   npm --workspace orchestrator install postgres drizzle-orm/postgres-js
   ```

2. **Create Postgres schema:** Map SQLite types → Postgres:
   - `integer("x", { mode: "boolean" })` → `boolean("x")`
   - `text("x", { mode: "json" })` → `jsonb("x")`
   - `real("x")` → `doublePrecision("x")` or `numeric("x")`
   - Keep the same table structure, indexes, and constraints

3. **Add Postgres to `docker-compose.yml`:**
   ```yaml
   services:
     postgres:
       image: postgres:17-alpine
       environment:
         POSTGRES_DB: jobops
         POSTGRES_USER: jobops
         POSTGRES_PASSWORD: ${DB_PASSWORD}
       volumes:
         - pgdata:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-ONLY", "pg_isready", "-U", "jobops"]
         interval: 10s
         timeout: 5s
         retries: 5

     job-ops:
       depends_on:
         postgres:
           condition: service_healthy
       environment:
         - DATABASE_URL=postgres://jobops:${DB_PASSWORD}@postgres:5432/jobops
   ```

4. **Data migration script:** One-time SQLite → Postgres transfer for existing installations

5. **Switch LangGraph checkpointer:** `SqliteSaver` → `PostgresSaver`

6. **Connection pooling:** `pg-pool` with `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`

7. **Dual-mode:** `DB_BACKEND=sqlite|postgres` env flag. SQLite for dev, Postgres for production.

8. **CI:** Add a test job that runs the full suite against Postgres

Don't remove SQLite support. Keep it for local dev and single-user setups. Postgres becomes the default for Docker/production.

---

### Phase 4 — Human-in-the-Loop & Team Features (Week 8–9)

**Goal:** Add review checkpoints and team collaboration.

**HITL:**
1. Add `interrupt()` after PDF generation — pipeline pauses, UI shows review prompt
2. User can: approve (→ tracking), reject (→ skip), or edit (→ re-enter tailoring)
3. Add `POST /api/pipeline/review` endpoint for approve/reject/edit
4. SSE pushes checkpoint state to the client
5. Store review decisions with reviewer identity for audit trail

**Team features:**
1. Per-tenant pipeline config (sources, score thresholds, LLM model per step)
2. Shared job board — team members see discovered/evaluated jobs
3. Job assignment — assign jobs to specific BD members
4. Activity feed — who evaluated what, when
5. Role-based access — admin vs member

---

### Phase 5 — Advanced Agents & Sub-Graphs (Week 10–13)

| Agent | What It Does | Implementation |
|-------|-------------|----------------|
| **Company Research** | Funding, reviews, layoffs, tech stack | Sub-graph with web search tool, feeds deep eval |
| **Batch Evaluator** | Process N jobs in parallel | `Send()` API for fan-out/fan-in |
| **Interview Prep** | STAR+R stories, JD mapping, story bank | Node after deep eval, writes to `interview_stories` |
| **Form Filler** | Pre-fill application forms from profile + CV | Tool-augmented agent with browser automation |
| **Follow-Up Tracker** | Timeline tracking, follow-up suggestions, outreach drafts | Scheduled sub-graph on cadence rules |
| **CRM Bridge** | Sync pipeline to internal CRM/tracker | Custom tool node with webhook/API |

Each agent is a sub-graph with its own state, invoked from the main pipeline. Agents use `ToolNode` for external access. Results stored in dedicated tables. Enable/disable per tenant via settings.

---

### Phase 6 — Production Hardening (Week 14–16)

1. **LangSmith tracing** — token usage, latency, errors per node per run
2. **Rate limiting** — per-tenant limits on pipeline runs and LLM calls
3. **OAuth/SSO** — replace basic auth for team onboarding
4. **Webhooks** — pipeline events pushed to Slack/Teams
5. **Scheduled pipelines** — cron-triggered daily job discovery per tenant
6. **Backup/restore** — Postgres backups with point-in-time recovery
7. **Worker separation** — extract pipeline execution to background workers (BullMQ + Redis or `pgboss`)

---

### Long-Term Extensions

| Feature | Approach |
|---------|----------|
| **Model-per-step** | Cheap model for scoring, expensive for tailoring. Each node configures its own LLM. |
| **Vector search** | `pgvector` extension. Embed JDs and CV sections. Similarity pre-filtering in scoring. |
| **Multi-resume** | Multiple resume variants per member. Tailoring picks best base per archetype. |
| **Caching** | Redis for LLM responses, extractor results, hot settings. |
| **External API** | Expose graph execution as REST/webhook for Slack bots, CRM. |
| **Analytics** | Team KPIs: evaluated, sent, interviews, conversion. Recharts already in client. |
| **Resume versioning** | Git-like CV diffs. Track which version went where. |
