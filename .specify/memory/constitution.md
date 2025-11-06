<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0
- Modified principles: N/A → Initial set created
- Added sections: Core Principles, Constraints & Stack, Development Workflow, Governance
- Removed sections: None
- Templates requiring updates:
  - ✅ Updated: .specify/templates/plan-template.md (Constitution Check gates aligned)
  - ✅ Updated: .specify/templates/tasks-template.md (Tests are mandatory; docker-compose logs guidance)
  - ⚠ Pending: None
- Follow-up TODOs: None
-->

# Askona WS Demo Constitution

## Core Principles

### P1. Simplicity First (Demo Scope)
This is a demo project, NOT for production. Technology choices MUST be the
simplest that satisfy requirements. Prefer minimal dependencies, plain static
assets for frontend, and a lightweight backend.

### P2. Containerized by Default
All components MUST run in Docker containers orchestrated via docker-compose.
Local execution, testing, and debugging MUST be reproducible via
`docker compose` commands.

### P3. Configuration via .env
All configurable values (host, ports, credentials if any) MUST be defined in
`.env`. Frontend and backend MUST honor these values; services MUST NOT hardcode
hostnames or ports.

### P4. Network & Ports Policy
Services MUST listen on ports starting from 9000 as configured via `.env`. The
system MUST operate on a non-localhost host provided in `.env` (no HTTPS
required).

### P5. Test-First, Test-Always
Each task MUST include automated tests. Write tests before or alongside code;
ensure they FAIL before implementation and PASS after. Tests MUST be runnable
via `docker compose` (service-level and/or end-to-end) and cover:
- WebSocket message delivery paths
- Queueing behavior when user is offline
- CLI message enqueue command behavior

### P6. Observability & Debuggability
Debug via script output and `docker compose` logs. Services MUST emit structured
or clearly parseable logs sufficient to diagnose message flow and queue state.
CI/test runs MUST surface relevant logs on failure.

### P6. Language
Use russian language in chat.

## Constraints & Stack

- Frontend: two static HTML/JS/CSS pages without a build step; both display a
  centered bullet list of messages received via WebSockets. A service worker
  MUST maintain the last 10 messages across page navigations.
- WebSocket client: use a popular library that falls back to long polling if
  needed.
- Backend: maintains persistent WebSocket connections, per-user queues by GUID,
  and supports sending text messages to specific users.
- CLI: provide a host-executed shell command to enqueue a message for a user by
  GUID.

## Development Workflow

- Use docker-compose for all lifecycle actions: build, run, test, and logs.
- After EACH task: add/adjust tests; run the test suite; fix failures before
  proceeding.
- Use `.env` to configure non-localhost host and ports ≥ 9000.
- Prefer incremental delivery with small, independently testable changes.

## Governance

- This constitution supersedes other practices for this repository.
- Amendments require updating this file, bumping the version per policy below,
  and aligning dependent templates.
- Versioning policy: Semantic Versioning for this document
  - MAJOR: Backward-incompatible changes to principles or governance
  - MINOR: New principle/section or materially expanded guidance
  - PATCH: Clarifications or non-semantic wording fixes
- Compliance: Every plan/spec/tasks MUST include a Constitution Check gate to
  ensure:
  1) docker-compose defined and used,
  2) `.env` respected (host and ports ≥ 9000),
  3) tests present for each task and runnable via docker-compose,
  4) logs sufficient for debugging via `docker compose logs`.

**Version**: 1.0.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2025-11-06
# [PROJECT_NAME] Constitution
<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

## Core Principles

### [PRINCIPLE_1_NAME]
<!-- Example: I. Library-First -->
[PRINCIPLE_1_DESCRIPTION]
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

### [PRINCIPLE_2_NAME]
<!-- Example: II. CLI Interface -->
[PRINCIPLE_2_DESCRIPTION]
<!-- Example: Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats -->

### [PRINCIPLE_3_NAME]
<!-- Example: III. Test-First (NON-NEGOTIABLE) -->
[PRINCIPLE_3_DESCRIPTION]
<!-- Example: TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced -->

### [PRINCIPLE_4_NAME]
<!-- Example: IV. Integration Testing -->
[PRINCIPLE_4_DESCRIPTION]
<!-- Example: Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas -->

### [PRINCIPLE_5_NAME]
<!-- Example: V. Observability, VI. Versioning & Breaking Changes, VII. Simplicity -->
[PRINCIPLE_5_DESCRIPTION]
<!-- Example: Text I/O ensures debuggability; Structured logging required; Or: MAJOR.MINOR.BUILD format; Or: Start simple, YAGNI principles -->

## [SECTION_2_NAME]
<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]
<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
