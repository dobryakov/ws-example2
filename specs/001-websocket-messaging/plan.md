# Implementation Plan: WebSocket Real-Time Messaging System

**Branch**: `001-websocket-messaging` | **Date**: 2025-11-06 | **Spec**: `/home/ubuntu/askona-ws-example2/specs/001-websocket-messaging/spec.md`
**Input**: Feature specification from `/specs/001-websocket-messaging/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Основная цель: реалтайм-доставка текстовых сообщений из бэкенда на фронтенд для отдельных пользователей (по GUID), с очередями на бэкенде и фоллбеком транспорта. Технический подход: контейнеризированное решение на Node.js + Socket.IO (фоллбек на long-polling), статический фронтенд из двух страниц с сервис-воркером, поддерживающим одно соединение и хранение 10 последних сообщений. Очереди на бэкенде в памяти (пер-пользователь с лимитом 1000, FIFO). CLI-команда с хоста отправляет сообщение через HTTP API на бэкенд, бэкенд кладет его в очередь и доставляет по сокетам. Тесты запускаются через docker compose.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Node.js 20 (LTS)  
**Primary Dependencies**: Backend: `socket.io`, `express`; Frontend: `socket.io-client`; SW: `BroadcastChannel`; Tooling: `docker`, `docker compose`  
**Storage**: N/A (очереди в памяти процесса, per-user FIFO, лимит 1000)  
**Testing**: `jest` для юнит/интеграции бэкенда; e2e: `playwright` сценарии через docker compose  
**Target Platform**: Linux (в контейнерах Docker)  
**Project Type**: web (frontend + backend, без сборки на фронте)  
**Performance Goals**: Доставка онлайн-сообщений ≤ 2 сек (SC-001); поддержка ≥ 50 concurrent users  
**Constraints**: Порты ≥ 9000, не-локалхост хост из `.env`; оффлайн-доставка из очереди; фоллбек транспорта  
**Scale/Scope**: Демо-объем: десятки пользователей, сообщения произвольной длины

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

- docker-compose present and used for build/run/test — OK (планирует `docker-compose.yml` и сценарии тестов)
- `.env` values consumed (host non-localhost, ports ≥ 9000) — OK (все сервисы читают HOST/PORT из `.env`)
- Tests defined for this task/feature and runnable via `docker compose` — OK (jest + playwright сценарии через compose)
- Logging sufficient for debugging via `docker compose logs` — OK (читаемые логи бэкенда, вывод CLI)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# Selected: Web application (frontend + backend)
backend/
├── src/
│   ├── server.ts            # express + socket.io сервер
│   ├── queues.ts            # per-user очереди, FIFO, лимит 1000
│   ├── sockets.ts           # аутентификация по cookie GUID, каналы доставки
│   └── api.ts               # HTTP endpoint для enqueue из CLI
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                 # orchestration helpers для playwright
└── package.json

frontend/
├── public/
│   ├── index1.html
│   ├── index2.html
│   ├── sw.js                # сервис-воркер: одно соединение, BroadcastChannel
│   └── js/
│       └── client.js        # инициализация UI, подписка на канал SW
└── package.json (только для тестов, если потребуется)

compose/
├── docker-compose.yml
├── backend.Dockerfile
└── frontend.Dockerfile

tests/
├── e2e/
│   └── playwright.spec.ts
└── docker-compose.test.yml
```

**Structure Decision**: Веб-приложение из двух контейнеров: `backend` (Node.js + Socket.IO) и `frontend` (статические файлы, сервис-воркер). Тесты запускаются через `docker compose`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
