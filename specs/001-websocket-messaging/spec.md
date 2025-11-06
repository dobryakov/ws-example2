# Feature Specification: WebSocket Real-Time Messaging System

**Feature Branch**: `001-websocket-messaging`  
**Created**: 2024-11-06  
**Status**: Draft  
**Input**: User description: "Демо-проект для демонстрации работы технологии websockets для доставки сообщений из бэкэнда во фронтенд веб-сайта.

Состоит из двух докер-контейнеров (фронтенд и бэкэнд).

Фронтенд:
- две простых страницы на статическом hmtl/js/css без сборки (например index1.html и index2.html).
- предусмотрена простая навигация для перехода между ними.
- обе страницы содержат один список по центру (bullet list), в который будут добавляться строки пришедшие по вебсокетам с бэкэнда.
- предполагается имитация, что страницу открывает конкретный пользователь, для этого у него есть идентификатор в формате GUID (записывается в постоянные cookie).
- идентификатор пользователя также выводится на странице визуально.
- на фронтенде применена какая-либо популярная библиотека для соединения с бэкэндом по веб-сокетам, которая в том числе умеет делать fallback на лонг-поллинг.
- на фронтенде предусмотрен сервис-воркер, который сохраняет 10 последних сообщений, в том числе при переходе между страницами.
- подключение к вебсокетам выполняется из сервис-воркера, чтобы приём сообщений работал даже в моменте перехода между страницами или даже когда пользователя нет на страницах.

Бэкэнд:
- держит постоянное подключение по вебсокетам с фронтенда.
- имеет систему очередей, чтобы можно было помещать сообщения для каждого пользователя в отдельную очередь (по идентификатор пользователя).
- позволяет посылать текстовые строки как сообщения на фронтенд по вебсокетному соединению.
- для отправки нужно предусмотреть шелл-команду, которая выполняется с хост-машины (принимает параметры - идентификатор пользователя и текст сообщения).
- эта шелл-команда помещает сообщение для конкретного пользователя в конкретную очередь, откуда оно уже доставляется во фронтенд по вебсокет-каналу.

Пример использования:
- пользователи с идентификаторами 1 (Вася) и 2 (Петя) открывают страницу фронтенда каждый в своём браузере.
- с бэкэнда команда send.sh 1 "Привет Вася" отправляет сообщение в очередь для пользователя 1 и далее в браузер Васи, 
а команда send.sh 2 "Привет Петя" отправляет сообщение в очередь для пользователя 2 и далее в браузер Пети.
- если пользователь в данный момент не находится во фронтенде, сообщение лежит в очереди и доставляется когда он откроет фронтенд.

Технологии:
- докер-контейнеры и docker compose.
- все переменные выноси в .env
- учти что фронтенд и бэкэнд будут работать не на локалхосте, а на заданном в .env хосте (без https).
- используй порты начиная с 9000.
- технологии выбирай сам.
- предусмотри автотесты на всю перечисленную функциональность."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Real-Time Messages (Priority: P1)

A user opens the frontend website in their browser. The system automatically assigns them a unique identifier (GUID) stored in a persistent cookie. When a message is sent to their identifier from the backend, it appears in real-time in a bullet list on the page. The user can see their identifier displayed on the page.

**Why this priority**: This is the core value proposition - delivering messages in real-time to users. Without this, the system has no purpose.

**Independent Test**: Can be fully tested by opening the frontend page, noting the displayed user identifier, sending a message to that identifier via the shell command, and verifying the message appears in the bullet list within seconds.

**Acceptance Scenarios**:

1. **Given** a user opens the frontend website for the first time, **When** the page loads, **Then** a unique GUID is generated, stored in a persistent cookie, and displayed on the page
2. **Given** a user has an open frontend page with their identifier displayed, **When** a message is sent to their identifier via the shell command, **Then** the message appears in the bullet list on the page within 2 seconds
3. **Given** a user has previously visited the frontend, **When** they return to the frontend, **Then** their existing GUID from the cookie is used and displayed (no new GUID is generated)

---

### User Story 2 - Navigate Between Pages While Receiving Messages (Priority: P2)

A user navigates between two frontend pages using simple navigation. Messages continue to be received and displayed on whichever page is currently active. The background process maintains the connection and message history across page transitions.

**Why this priority**: This demonstrates the robustness of the background connection implementation and ensures users don't miss messages during navigation.

**Independent Test**: Can be fully tested by opening the first page, sending a message, navigating to the second page, sending another message, and verifying both messages appear on the second page.

**Acceptance Scenarios**:

1. **Given** a user is on the first page and has received messages, **When** they navigate to the second page, **Then** all previously received messages are displayed on the second page
2. **Given** a user is navigating from the first page to the second page, **When** a message arrives during the transition, **Then** the message is received and displayed on the second page after navigation completes
3. **Given** a user navigates between pages, **When** messages are sent, **Then** messages appear on the currently active page without requiring reconnection

---

### User Story 3 - Receive Queued Messages When Offline (Priority: P3)

A user closes their browser or navigates away from the frontend. Messages sent to their identifier are queued in the backend. When the user returns and opens the frontend, all queued messages are delivered and displayed.

**Why this priority**: This ensures message delivery reliability and demonstrates the queue system's ability to handle offline users.

**Independent Test**: Can be fully tested by opening the frontend, noting the user identifier, closing the browser, sending multiple messages to that identifier, reopening the frontend, and verifying all queued messages are delivered and displayed.

**Acceptance Scenarios**:

1. **Given** a user has closed their browser, **When** messages are sent to their identifier, **Then** messages are queued in the backend for that user
2. **Given** messages are queued for a user who is offline, **When** the user opens the frontend and connects, **Then** all queued messages are delivered and displayed in order
3. **Given** a user receives queued messages after reconnecting, **When** they view the message list, **Then** messages appear in the order they were sent

---

### User Story 4 - Message Persistence Across Sessions (Priority: P3)

The client-side background process maintains the 10 most recent messages in local storage. When a user navigates between pages or returns to the frontend after closing the browser, the last 10 messages are preserved and displayed.

**Why this priority**: This provides continuity of experience and allows users to see recent message history even after page refreshes or browser restarts.

**Independent Test**: Can be fully tested by receiving 15 messages, closing the browser, reopening the frontend, and verifying the 10 most recent messages are displayed.

**Acceptance Scenarios**:

1. **Given** a user has received more than 10 messages, **When** they navigate to a new page, **Then** only the 10 most recent messages are displayed
2. **Given** a user has received messages and closes their browser, **When** they reopen the frontend, **Then** the 10 most recent messages from the previous session are displayed
3. **Given** a user has 10 messages stored, **When** they receive a new message, **Then** the oldest message is removed and the new message is added (maintaining exactly 10 messages)

---

### Edge Cases

- What happens when a message is sent to a user identifier that has never been used? (Message should be queued and delivered when that user first connects)
- How does the system handle very long message text? (Messages of any length are accepted and displayed without length restrictions)
- What happens when the real-time connection is lost? (System automatically reconnects using exponential backoff: 5s, 10s, 20s, then 30s maximum interval between attempts, with automatic fallback to alternative transport methods)
- How does the system handle multiple browser tabs/windows for the same user? (All tabs/windows share a single service worker with one WebSocket connection; messages are synchronized between all tabs using BroadcastChannel or similar mechanism, ensuring all tabs display the same messages)
- What happens when the backend queue becomes full? (System implements a queue limit of 1000 messages per user; when the limit is reached, the oldest messages are automatically discarded to make room for new messages)
- How does the system handle invalid user identifiers in the send command? (Command should validate identifier format and provide clear error messages)
- What happens when the frontend cannot establish a primary connection? (System should fall back to alternative transport methods automatically)
- How does the system handle rapid message delivery? (Messages should be delivered in order without loss or corruption)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a unique GUID identifier for each new user and store it in a persistent cookie
- **FR-002**: System MUST display the user's identifier visibly on each frontend page
- **FR-003**: System MUST provide two frontend pages with simple navigation between them
- **FR-004**: System MUST display received messages in a bullet list centered on each page
- **FR-005**: System MUST establish real-time connections from a background process (not from page scripts)
- **FR-006**: System MUST use a connection mechanism that supports automatic fallback to alternative transport methods when primary connection is unavailable
- **FR-007**: System MUST maintain real-time connection during page transitions
- **FR-008**: System MUST maintain real-time connection even when no pages are active (via background process)
- **FR-009**: System MUST persist the 10 most recent messages in client-side storage
- **FR-010**: System MUST display persisted messages when users navigate between pages
- **FR-011**: System MUST display persisted messages when users return after closing the browser
- **FR-012**: System MUST maintain separate message queues for each user identifier in the backend
- **FR-013**: System MUST deliver queued messages to users when they connect
- **FR-014**: System MUST provide a shell command (send.sh) that accepts user identifier and message text as parameters
- **FR-015**: System MUST allow the shell command to be executed from the host machine
- **FR-016**: System MUST queue messages for offline users and deliver them upon reconnection
- **FR-017**: System MUST deliver messages in the order they were sent
- **FR-018**: System MUST support multiple concurrent users, each with their own identifier and queue
- **FR-019**: System MUST be deployable as containerized services
- **FR-020**: System MUST use external configuration for deployment settings
- **FR-021**: System MUST support configurable hostnames (not limited to localhost)
- **FR-022**: System MUST use configurable network ports
- **FR-023**: System MUST include automated tests covering all functional requirements
- **FR-024**: System MUST enforce a maximum queue size of 1000 messages per user; when the limit is reached, the oldest messages MUST be automatically discarded to make room for new messages
- **FR-025**: System MUST accept messages of any length without restrictions; very long messages MUST be displayed correctly in the bullet list
- **FR-026**: System MUST automatically reconnect when the real-time connection is lost, using exponential backoff strategy: initial delay of 5 seconds, doubling on each retry (10s, 20s), with a maximum delay of 30 seconds between reconnection attempts
- **FR-027**: System MUST use a single shared service worker for all browser tabs/windows of the same user, maintaining one WebSocket connection per user; messages received by the service worker MUST be synchronized and displayed in all open tabs/windows using BroadcastChannel or similar inter-tab communication mechanism

### Key Entities *(include if feature involves data)*

- **User**: Represents a browser session with a unique GUID identifier. Attributes: identifier (GUID), connection status (online/offline), message queue
- **Message**: Represents a text string sent to a specific user. Attributes: user identifier (target), text content (unlimited length), timestamp (implicit ordering)
- **Message Queue**: Represents a per-user collection of pending messages. Attributes: user identifier, ordered list of messages (maximum 1000 messages), delivery status. When the queue reaches capacity, oldest messages are discarded (FIFO eviction)

## Clarifications

### Session 2025-11-06

- Q: What are the queue size limits and overflow handling behavior for user message queues? → A: Queue limit of 1000 messages per user with automatic eviction of oldest messages when limit is reached
- Q: What is the maximum message text length? → A: No length restrictions; messages of any length are accepted and displayed
- Q: What reconnection strategy should be used when the connection is lost? → A: Exponential backoff with delays of 5s, 10s, 20s, then 30s maximum between reconnection attempts
- Q: How should the system handle multiple browser tabs/windows for the same user? → A: All tabs share a single service worker with one WebSocket connection; messages are synchronized between all tabs using BroadcastChannel

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Messages are delivered to online users within 2 seconds of being sent via the shell command
- **SC-002**: System successfully delivers 100% of queued messages to users when they reconnect after being offline
- **SC-003**: System maintains real-time connection stability with less than 1% connection failures during normal operation
- **SC-004**: Users can navigate between pages without losing message delivery capability (100% message delivery during navigation)
- **SC-005**: System correctly persists and displays exactly 10 most recent messages across page navigations and browser restarts
- **SC-006**: System supports at least 50 concurrent users without message delivery degradation
- **SC-007**: All automated tests pass, covering frontend message display, backend queuing, shell command functionality, and client-side message persistence
- **SC-008**: Messages are delivered in the correct order (first-in-first-out) for each user queue
- **SC-009**: System automatically falls back to alternative transport methods when primary connections cannot be established, maintaining message delivery functionality

## Assumptions

- Frontend pages will be implemented as static HTML/JavaScript/CSS files (no build process required)
- Background process for maintaining connections will be implemented using service worker technology; all tabs/windows of the same user share one service worker instance with a single WebSocket connection, and messages are synchronized between tabs using BroadcastChannel
- Real-time connections will use websocket protocol with automatic fallback to long-polling
- Deployment will use containerization technology (Docker and docker-compose)
- Configuration will be managed via environment variables stored in a .env file
- Network ports will be configurable, starting from port 9000
- Frontend and backend will communicate over HTTP/WebSocket protocols (no HTTPS required)
