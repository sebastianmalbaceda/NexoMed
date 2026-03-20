# Software Project Documentation — Complete Reference (2026)

> **Audience:** Human developers and AI coding agents.
> **Purpose:** Canonical reference for structuring a modern software repository.
> **Version:** 2026-03

---

## Table of Contents

1. [Overview](#overview)
2. [Core Project Documentation](#1-core-project-documentation)
3. [Repository Governance Files](#2-repository-governance-files)
4. [AI Agent Context Files](#3-ai-agent-context-files)
5. [AI Agent Skills (Modular Capabilities)](#4-ai-agent-skills-modular-capabilities)
6. [Extended Technical Documentation](#5-extended-technical-documentation)
7. [AI Development Workflow](#6-ai-development-workflow)
8. [Full Conceptual Map](#7-full-conceptual-map)
9. [Complete Repository Structure](#8-complete-repository-structure)
10. [Checklist for Starting a New Project](#9-checklist-for-starting-a-new-project)
11. [Conclusion](#conclusion)

---

## Overview

Modern software repositories combine traditional software documentation
with AI-agent context, workflow definitions, and modular skill packages.

A well-structured project repository includes five major documentation layers:

1. **Core project documentation** — what is being built and why
2. **Repository governance files** — how the project is managed
3. **AI agent context** — how agents should behave in this project
4. **AI agent skills** — reusable, on-demand procedural knowledge for agents
5. **AI workflow definitions** — how models collaborate across the pipeline

This document covers both human developers and AI coding agents working
within the same repository.

---

## 1. Core Project Documentation

These documents describe the product itself and its design.

---

### `README.md`

Main entry point of the project. Written for human readers.

**Purpose:** Explain what the project is and how to use it. Keep it concise
and human-focused. Technical agent instructions belong in `AGENTS.md`.

**Typical contents:**

- Project overview and purpose
- Installation instructions
- Usage examples and quick start
- Links to extended documentation
- Badges (CI status, coverage, license)

---

### `SPEC.md` _(or `REQUIREMENTS.md`)_

Defines exactly what the system must do.

**Purpose:** Provide a clear definition of system behavior and features.
Serves as the canonical truth for both developers and AI agents.

**Typical contents:**

- Functional requirements
- API contracts and endpoints
- Data structures and schemas
- Business rules and constraints
- Out-of-scope items (what the system will **not** do)

---

### `ARCHITECTURE.md`

Describes how the system is built internally.

**Purpose:** Explain the internal design of the system so that developers
and AI agents can navigate and extend it without guessing.

**Typical contents:**

- System components and module responsibilities
- Data flow diagrams (or textual descriptions)
- Dependency relationships
- Key architecture decisions and their rationale (ADRs)
- Technology choices and justifications

---

### `ROADMAP.md`

Defines the long-term direction of the project.

**Typical contents:**

- Upcoming features and milestones
- Future releases and target dates
- Long-term vision and strategic goals

---

### `PLANNING.md` _(or `TASKS.md`)_

Tracks current implementation progress. Used heavily by AI agents
in agentic workflows to understand what to build next.

**Typical contents:**

- Active task list
- Completed features (checked off)
- Work in progress
- Upcoming implementation tasks
- Blockers and open questions

> **Note for AI agents:** In AI-assisted workflows, the PLANNER agent reads
> and updates this file at the start of each development cycle. Keep it
> accurate and unambiguous. Each task should be completable without requiring
> additional design decisions.

---

## 2. Repository Governance Files

These files define how the repository is managed and maintained.

---

### `CHANGELOG.md`

Records notable changes between releases.
Follows the [Keep a Changelog](https://keepachangelog.com) format by convention.

**Typical contents:**

- Version history (newest first)
- New features, bug fixes, breaking changes per release
- `[Unreleased]` section for work-in-progress changes

---

### `CONTRIBUTING.md`

Guidelines for contributors — human and automated.

**Typical contents:**

- How to submit pull requests
- Coding standards and conventions
- Testing requirements
- Review and approval workflow
- Branch naming conventions

---

### `LICENSE`

Defines the legal license of the project.
Common choices: MIT, Apache 2.0, GPL-3.0, proprietary.
Place this file at the repository root with no file extension.

---

### `CODE_OF_CONDUCT.md`

Community behavior guidelines.
Commonly based on the [Contributor Covenant](https://www.contributor-covenant.org) standard.

---

### `SECURITY.md`

Instructions for responsible disclosure of security vulnerabilities.

**Typical contents:**

- Supported versions receiving security updates
- How to report a vulnerability (contact, PGP key if needed)
- Response timeline commitment
- What to expect after reporting

---

### `.gitignore`

Specifies files Git should not track.

**Common exclusions:**

- Build artifacts and compiled output (`dist/`, `build/`, `.next/`)
- Environment files (`.env`, `.env.local`)
- Secrets and credentials
- IDE-specific folders (`.idea/`, `.vscode/` if not shared)
- OS files (`.DS_Store`, `Thumbs.db`)
- Dependency directories (`node_modules/`, `.venv/`)

---

## 3. AI Agent Context Files

These files provide instructions and context for AI coding agents
working within the repository. They are the primary mechanism for
telling agents how to behave in your specific project.

---

### `AGENTS.md` ← Primary Standard (Universal)

The universal instruction file for AI coding agents.
An open standard supported by all major AI coding tools as of 2026:
Codex, Claude Code, GitHub Copilot, Cursor, Windsurf, Kilo Code,
Aider, Continue.dev, OpenCode, Factory, Amp, Goose, and others.

Think of it as a `README.md` written specifically for agents, not humans.
**The filename must be uppercase (`AGENTS.md`) to be auto-detected.**

**Purpose:** Give AI coding agents the same tribal knowledge that senior
engineers carry in their heads, in a single predictable location.

**Typical contents:**

- Repository structure overview
- Build, test, lint, and run commands (exact and executable)
- Coding conventions, naming rules, file organization
- Tech stack with specific versions (e.g., `React 18, TypeScript 5.4`)
- Rules for modifying code (what to never touch, what to always do)
- Git workflow (branch naming, commit format, PR requirements)
- Security gotchas and important project warnings
- External services and environment variables used
- Explicit boundaries: "never commit secrets", "ask before adding deps"

**Advanced usage — monorepos:**
Place multiple `AGENTS.md` files at different directory levels.
The nearest file to the code being edited takes precedence.
Individual packages can define their own rules while inheriting
global defaults from the root.

Codex also supports `AGENTS.override.md` for temporary overrides
without modifying the shared base file.

**Best practices** (from analysis of 2,500+ real repositories):

- Cover six core areas: commands, testing, project structure, code style, git workflow, and explicit boundaries.
- Show code examples instead of abstract descriptions.
- Use a three-tier boundary model: `always do` / `ask first` / `never do`.
- Aim for under 150 lines. Long files slow agents and bury the signal.
- Be specific about your stack — not "React project" but "React 18 with TypeScript 5.4, Vite 5, and Tailwind CSS".

**Minimal `AGENTS.md` skeleton:**

```markdown
# Project Name

## Build & Test

- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`

## Stack

React 18, TypeScript 5.4, Vite 5, Tailwind CSS, Vitest

## Conventions

- Components in `src/components/`, one file per component
- Use zod for all request/response validation
- Prefer async/await over Promise chains

## Git Workflow

- Branch: `feature/<ticket>-short-description`
- Commits: conventional commits format (`feat:`, `fix:`, `chore:`)

## Boundaries

- Never commit `.env` files or secrets
- Never add production dependencies without asking first
- Never modify files in `src/legacy/` without explicit approval
```

---

### `PROMPTS.md`

Stores standardized, reusable prompts used across the project.

**Purpose:** Provide consistent instructions for recurring AI-assisted tasks
so the team uses the same phrasing and quality bar every time.

**Typical contents:**

- Code review prompt templates
- Documentation generation prompts
- PR description templates
- Test generation prompts
- Commit message prompts

---

### `.agentignore`

Equivalent of `.gitignore` but specifically for AI agents.

**Purpose:** Prevent agents from reading irrelevant, sensitive, or
distracting files that would waste context window tokens.

**Common exclusions:**

- Secrets, credentials, and API keys
- Large binary files or datasets
- Vendor and dependency directories (`node_modules/`, `.venv/`)
- Build output directories (`dist/`, `build/`, `.next/`)
- Temporary and generated files

---

### `CLAUDE.md` _(optional — Claude-specific)_

Context and instruction file specifically used by Claude-based tools
(Claude Code, Claude API agents). Recommended by Anthropic alongside
`AGENTS.md` for Claude-specific behavior tuning.

When both exist, `AGENTS.md` takes precedence for cross-tool rules,
and `CLAUDE.md` handles Claude-specific nuances or overrides.

Many teams consolidate everything into `AGENTS.md` to avoid duplication.

---

### `.cursor/rules` _(optional — Cursor IDE)_

Project-specific rules for the Cursor IDE AI assistant.

Cursor now recommends the `.cursor/rules/` directory structure over the
legacy `.cursorrules` file at root. Multiple rule files can coexist
inside `.cursor/rules/`, scoped by path or context.

Since Cursor also reads `AGENTS.md`, many teams put shared rules in
`AGENTS.md` and reserve `.cursor/rules/` for Cursor-only UI behaviors.

---

### `.windsurfrules` _(optional — Windsurf IDE)_

Rules used by the Windsurf IDE AI assistant (by Codeium).
Windsurf reads `AGENTS.md` by default; this file handles
Windsurf-specific behaviors beyond what `AGENTS.md` covers.

---

### `.github/copilot-instructions.md` _(optional — GitHub Copilot)_

Custom instructions for GitHub Copilot (chat and agent mode).
GitHub Copilot reads `AGENTS.md` from the repository root,
making this file useful for GitHub-specific behaviors only
(PR descriptions, issue triage, GitHub Actions integration).

---

### `.opencode` _(optional)_

Configuration file used by OpenCode-based agentic workflows.
OpenCode reads `AGENTS.md` by default; this file handles
runtime configuration (model selection, tool permissions, etc.)

---

### Consolidation recommendation

> Many teams consolidate all AI-agent rules into `AGENTS.md` to avoid
> duplication and drift across multiple IDE-specific files.
>
> Recommended strategy:
>
> - **`AGENTS.md`** — all shared rules (universal, cross-tool)
> - **IDE-specific files** — only behaviors unique to that tool

---

### MCP (Model Context Protocol) Configuration

MCP is an open protocol (originally from Anthropic, now widely adopted)
that standardizes how AI agents connect to external tools, data sources,
and services at runtime.

**Common MCP configuration files:**

- `mcp.json` or `.mcp.json` at project root
- `~/.claude/mcp.json` for user-level configuration (Claude Code)
- `.cursor/mcp.json` for Cursor-scoped MCP servers

**Typical MCP server categories:**

- File system access (read/write specific directories)
- Database connectors (Postgres, SQLite, etc.)
- Version control (GitHub, GitLab)
- Project management (Linear, Jira, Asana)
- Communication (Slack, email)
- Web and search (Brave Search, web fetch)
- Code execution sandboxes

> **Key distinction:** `AGENTS.md` tells the agent **how** to work.
> MCP servers give the agent **what** to access at runtime.
> Instructions and data access are intentionally separated.

---

## 4. AI Agent Skills (Modular Capabilities)

Agent Skills are an open standard for packaging procedural knowledge
into modular, reusable units that agents load on demand — rather than
embedding all instructions permanently into `AGENTS.md`.

**Supported by:** Claude Code, OpenAI Codex, GitHub Copilot, Cursor,
VS Code, Windsurf, Kilo Code, Aider, Amp, Roo Code, Manus, and others.

---

### Key Distinction: `AGENTS.md` vs `SKILL.md`

Understanding this difference is essential.

|              | `AGENTS.md`                                   | `SKILL.md`                                       |
| ------------ | --------------------------------------------- | ------------------------------------------------ |
| **Answers**  | How should this agent behave in this project? | How should the agent perform this specific task? |
| **Scope**    | Project-level rules and conventions           | Task-level procedural knowledge                  |
| **Loading**  | Once at session start                         | On demand, when task matches                     |
| **Coverage** | One file governs all tasks                    | Many skills coexist independently                |

**Analogy:**

- `AGENTS.md` = the employee handbook (applies to everything, always)
- `SKILL.md` = the technical manual for a specific procedure (pulled off the shelf only when needed)

**Another framing:**

- Agent **Tools** = _Can_ the agent do something? (execution capabilities)
- Agent **Skills** = _Does_ the agent know the right process? (procedural knowledge)

Tools solve execution. Skills solve process, context, and nuance.

---

### `SKILL.md` Format

A skill is a directory containing a `SKILL.md` file plus optional
supporting scripts and reference files.

**Minimal `SKILL.md` structure:**

```markdown
---
name: skill-name
description: |
  Explain exactly when this skill should trigger and when it should not.
  This description is what the agent reads to decide whether to activate.
  Be specific. Vague descriptions cause missed or incorrect triggers.
---

# Skill Instructions

Detailed, step-by-step procedural instructions go here.
Use executable commands. Show examples. Be concrete.
```

> **The `description` frontmatter is the most critical part.**
> If your skill does not trigger when expected, the problem is almost
> always the description, not the instructions inside the file.

---

### Progressive Disclosure (Context Efficiency)

Skills use a three-level loading system to manage context window tokens:

| Level                   | What loads                                     | Cost             |
| ----------------------- | ---------------------------------------------- | ---------------- |
| **1 — Always**          | Skill name and description only                | Near zero tokens |
| **2 — When relevant**   | Full `SKILL.md` instructions                   | Moderate tokens  |
| **3 — When referenced** | Supporting files (scripts, schemas, templates) | On demand        |

This means you can install dozens of skills without bloating the context
window. The agent only loads what the current task needs.

---

### Skill Locations

```
# Claude Code
.claude/skills/           ← project-level, shared via git
~/.claude/skills/         ← personal, applies to all projects

# OpenAI Codex
.codex/skills/            ← repo-level
~/.codex/skills/          ← user-level

# GitHub Copilot (VS Code)
.github/agents/           ← repository-level agent definitions
```

Skills can be invoked **explicitly** (e.g., `/skill-name` in Claude Code,
`$skill-name` in Codex) or **implicitly** when the task description matches.

---

### Skill Examples

**`generate-tests`**
Packages the team's testing standards, preferred frameworks, coverage
targets, and example test patterns. Includes executable scripts for
running the test suite. Triggered whenever a task involves writing tests.

**`create-api-endpoint`**
Contains the team's exact conventions for new endpoints: request
validation schema, error handling pattern, auth middleware usage,
and OpenAPI doc block format. Shows a complete working example.

**`code-review`**
A structured review checklist: security, performance, readability,
test coverage, naming, and compliance with `ARCHITECTURE.md`.
Agent runs through each category before writing any review comments.

**`generate-docs`**
Instructions for generating API docs and function references from
code comments. Includes `npm run docs:build`, markdownlint.
Rule: write to `docs/`, never modify `src/`.

**`create-docx` / `create-pptx` / `create-pdf`**
Pre-built skills for creating Word, PowerPoint, and PDF documents.
Include executable scripts and document templates.

**`sprint-planner` (MCP-powered)**
Connects to Linear or Jira via MCP to read the backlog, then applies
the team's sprint planning criteria to generate a prioritized task list.
Combines `SKILL.md` instructions with live data access through MCP.

---

### Skills Directory Structure

```
.claude/
└── skills/
    ├── generate-tests/
    │   ├── SKILL.md
    │   └── scripts/
    │       └── run-tests.sh
    ├── create-api-endpoint/
    │   ├── SKILL.md
    │   └── examples/
    │       └── endpoint-template.ts
    └── code-review/
        └── SKILL.md
```

---

## 5. Extended Technical Documentation

Extended technical documentation lives inside a `docs/` directory.
These documents provide deeper explanations beyond the core files at root.

---

### `docs/` Directory Structure

```
docs/
├── api.md              ← Full API reference (endpoints, params, responses)
├── build.md            ← Detailed build system documentation
├── testing.md          ← Testing strategy, frameworks, and conventions
├── deployment.md       ← Deployment process and environment configuration
├── architecture.md     ← Extended architecture documentation with diagrams
├── onboarding.md       ← Developer onboarding guide
└── adr/                ← Architecture Decision Records
    ├── 001-use-postgres.md
    └── 002-adopt-event-sourcing.md
```

---

### Architecture Decision Records (ADRs)

ADRs document significant technical decisions in a lightweight,
versioned, append-only format. Each ADR captures:

- **Context** — What situation prompted the decision?
- **Decision** — What was decided?
- **Consequences** — What are the trade-offs?
- **Status** — `Proposed` / `Accepted` / `Deprecated` / `Superseded`

> **Why ADRs matter for AI agents:** When an agent reads `docs/adr/`,
> it understands not just **what** the architecture is, but **why** it
> was built that way. This prevents agents from reversing deliberate
> architectural choices in an attempt to "improve" the codebase.

---

## 6. AI Development Workflow

Modern AI-assisted projects define a structured pipeline for collaboration
between different AI models, each assigned to the task it performs best.

---

### `AI_WORKFLOW.md`

Documents the AI development pipeline used by the project.

**Defines:**

- Which model handles which phase
- What each phase is responsible for producing
- How phases hand off to each other
- How `PLANNING.md` is updated throughout the cycle

---

### Workflow Structure

```
PLAN → BUILD → REVIEW → TEST → ITERATE
```

---

#### PLAN Phase

**Recommended model:** Claude Opus 4.6 or equivalent high-reasoning model.
Use the most capable model here — planning mistakes are expensive downstream.

**Responsibilities:**

- Analyze requirements from `SPEC.md`
- Design the implementation plan in detail
- Update `PLANNING.md` with specific, actionable tasks
- Validate the plan against `ARCHITECTURE.md`
- Identify ambiguities and flag them before coding begins
- Estimate task complexity and sequencing

**Output:** An updated `PLANNING.md` with clear, unambiguous tasks
that a builder agent can execute without needing to make design decisions.

---

#### BUILD Phase

**Recommended model:**
Claude Sonnet 4.6 is the standard choice for most teams — strong agentic
coding performance (77.8%+ on SWE-bench as of early 2026) at significantly
lower cost than Opus.

For teams with tighter cost constraints, **GLM-5** (by Z.AI, open weights,
MIT licensed, released February 2026) is an effective alternative. It
reaches comparable SWE-bench scores at roughly 20–25% of the cost of
Claude Sonnet. Other capable cost-efficient options include **Kimi K2.5**
and **Qwen-Max**, depending on infrastructure preferences.

A common cost-optimized pattern:

> Use Sonnet for complex files and core logic; GLM-5 (or similar) for
> routine, well-specified implementation tasks.

**Responsibilities:**

- Implement tasks listed in `PLANNING.md` one at a time
- Follow coding conventions from `AGENTS.md`
- Follow the design from `SPEC.md` and `ARCHITECTURE.md`
- Load relevant `SKILL.md` packages as needed
- Avoid making architectural decisions — escalate to planner
- Mark tasks complete in `PLANNING.md` after implementation

---

#### REVIEW Phase

**Recommended model:** Claude Opus 4.6 or equivalent high-reasoning model.
Use the same tier as the planner — review requires judgment, not just execution.

**Responsibilities:**

- Audit all new code produced in the build phase
- Detect bugs, edge cases, and logic errors
- Verify compliance with `ARCHITECTURE.md` and `SPEC.md`
- Check security: injection, secrets exposure, auth, input validation
- Suggest improvements with specific proposed changes
- Verify `PLANNING.md` accurately reflects what was built

A `code-review` skill (`SKILL.md`) with a structured checklist ensures
consistent, thorough reviews across every development cycle.

---

#### TEST Phase

**Model:** Any capable coding model (Sonnet-class or equivalent).

**Responsibilities:**

- Generate unit, integration, and edge-case tests
- Validate behavior described in `SPEC.md`
- Run existing test suite and report failures
- Identify untested code paths
- Document test coverage gaps

A `generate-tests` skill is especially useful here: it packages
the team's exact conventions so tests are consistent without
re-specifying the standards at each cycle.

---

#### ITERATE Phase

After review and testing:

- Fix all detected issues (build phase handles the fixes)
- Rerun tests to confirm issues are resolved
- Update `PLANNING.md` (mark completed, add new tasks found during review)
- Update `CHANGELOG.md` with notable changes
- Continue to the next development cycle

---

#### Human Oversight Checkpoints

In AI-assisted workflows, humans remain responsible for:

- Approving architectural changes before implementation
- Reviewing and merging pull requests
- Validating that shipped behavior matches user intent
- Updating `SPEC.md` when requirements change
- Auditing `PLANNING.md` periodically for drift

**Recommended integration points:**

- Planner output (`PLANNING.md` diff) reviewed before build starts
- Build output (pull request) reviewed before merge
- Security-sensitive changes always require human sign-off

---

## 7. Full Conceptual Map

The question each document answers in the overall system:

| Question                                      | Document            |
| --------------------------------------------- | ------------------- |
| **WHY** does the project exist?               | `README.md`         |
| **WHAT** must the system do?                  | `SPEC.md`           |
| **HOW** is the system built?                  | `ARCHITECTURE.md`   |
| **WHERE** is the project going?               | `ROADMAP.md`        |
| **WHAT** is being built right now?            | `PLANNING.md`       |
| **WHAT** changed between versions?            | `CHANGELOG.md`      |
| **HOW** should contributors work?             | `CONTRIBUTING.md`   |
| **HOW** should agents behave in this project? | `AGENTS.md`         |
| **HOW** should agents perform specific tasks? | `SKILL.md` packages |
| **WHAT** can agents access at runtime?        | MCP configuration   |
| **HOW** do agents use reusable prompts?       | `PROMPTS.md`        |
| **HOW** is AI development organized?          | `AI_WORKFLOW.md`    |
| **WHY** were architecture decisions made?     | `docs/adr/`         |

---

## 8. Complete Repository Structure

A well-structured modern repository combining all layers:

```
my-project/
│
├── README.md                     ← Human entry point
├── SPEC.md                       ← What the system must do
├── ARCHITECTURE.md               ← How the system is built
├── ROADMAP.md                    ← Long-term direction
├── PLANNING.md                   ← Current tasks (AI workflow)
│
├── CHANGELOG.md                  ← Version history
├── CONTRIBUTING.md               ← Contribution guidelines
├── LICENSE                       ← Legal license
├── CODE_OF_CONDUCT.md            ← Community standards
├── SECURITY.md                   ← Vulnerability reporting
│
├── AGENTS.md                     ← Universal AI agent instructions
├── PROMPTS.md                    ← Reusable AI prompt templates
├── AI_WORKFLOW.md                ← AI development pipeline
├── .agentignore                  ← Files hidden from agents
├── mcp.json                      ← MCP server configuration
│
├── CLAUDE.md                     ← Claude-specific overrides (optional)
├── .cursor/
│   ├── rules/                    ← Cursor-specific rules (optional)
│   └── mcp.json                  ← MCP servers for Cursor (optional)
├── .windsurfrules                ← Windsurf-specific rules (optional)
├── .github/
│   ├── copilot-instructions.md   ← GitHub Copilot instructions (optional)
│   └── workflows/                ← CI/CD pipelines
├── .opencode                     ← OpenCode config (optional)
│
├── .claude/
│   └── skills/                   ← Project-level AI skills
│       ├── generate-tests/
│       │   ├── SKILL.md
│       │   └── scripts/
│       ├── create-api-endpoint/
│       │   ├── SKILL.md
│       │   └── examples/
│       └── code-review/
│           └── SKILL.md
│
├── docs/
│   ├── api.md
│   ├── build.md
│   ├── testing.md
│   ├── deployment.md
│   ├── architecture.md
│   ├── onboarding.md
│   └── adr/
│       ├── 001-database-choice.md
│       └── 002-api-design.md
│
├── src/                          ← Application source code
├── tests/                        ← Test suite
├── .gitignore
└── .env.example                  ← Environment variable template (no real values)
```

---

## 9. Checklist for Starting a New Project

### Day One (Minimum Viable Repository)

- [ ] `README.md` — project overview and quick start
- [ ] `AGENTS.md` — build/test commands, stack, conventions, boundaries
- [ ] `LICENSE`
- [ ] `.gitignore`
- [ ] `.env.example`

### First Week

- [ ] `SPEC.md` or `REQUIREMENTS.md`
- [ ] `ARCHITECTURE.md` (even a simple one-pager is enough)
- [ ] `PLANNING.md` with initial task breakdown
- [ ] `CONTRIBUTING.md`
- [ ] `SECURITY.md`
- [ ] `CHANGELOG.md` (start with version `0.1.0`)

### AI Workflow Setup

- [ ] `AI_WORKFLOW.md` defining your PLAN/BUILD/REVIEW/TEST cycle
- [ ] At least one `SKILL.md` (start with `generate-tests`)
- [ ] `PROMPTS.md` with your most common AI task templates
- [ ] `.agentignore` to protect sensitive files
- [ ] `mcp.json` if connecting to external services

### As the Project Grows

- [ ] `docs/` directory with API reference and deployment docs
- [ ] `docs/adr/` for recording architecture decisions
- [ ] Additional `SKILL.md` packages for common workflows
- [ ] `ROADMAP.md` once the initial version ships
- [ ] `CODE_OF_CONDUCT.md` if the project is open source

---

## Conclusion

A well-structured modern repository (2026) contains five integrated layers
that serve both human developers and AI coding agents:

1. **Core project documentation** (`README`, `SPEC`, `ARCHITECTURE`, `ROADMAP`, `PLANNING`) — describing what is being built and why.
2. **Repository governance** (`CHANGELOG`, `CONTRIBUTING`, `LICENSE`, `SECURITY`) — defining how the project is managed.
3. **AI agent context** (`AGENTS.md`, `PROMPTS.md`, `.agentignore`, MCP) — telling agents how to behave within the project.
4. **AI agent skills** (`SKILL.md` packages) — giving agents reusable, on-demand procedural knowledge for specific tasks.
5. **AI workflow definitions** (`AI_WORKFLOW.md`) — coordinating multiple models across planning, building, reviewing, and testing phases.

This structure supports both traditional human-led development and fully
AI-assisted engineering workflows. The investment in documentation pays
compound returns: every new agent or developer who joins the project can
be effective from day one.

---

_Document version: 2026-03 — Last updated: March 2026_
