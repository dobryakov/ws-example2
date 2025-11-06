# Tasks: WebSocket Real-Time Messaging System (Phase 2)

## Governance & Gates
- docker-compose для build/run/test — MUST
- Конфигурация из `.env` (HOST не localhost, порты ≥ 9000) — MUST
- Тесты на каждый таск, запуск через `docker compose` — MUST
- Логи читаемые через `docker compose logs` — MUST

## Environment
- `.env`:
  - HOST=example.local
  - BACKEND_PORT=9001
  - FRONTEND_PORT=9000

## Task 1: Базовая инфраструктура docker-compose и окружение
- Deliverables:
  - `compose/docker-compose.yml` (frontend, backend, tests)
  - `compose/backend.Dockerfile`, `compose/frontend.Dockerfile`
  - `.env` пример и чтение переменных сервисами
- Tests:
  - smoke: `docker compose config` успешен
  - сервисы поднимаются и слушают на заданных портах
- Logs: контейнеры выводят стартовые сообщения

## Task 2: Backend — Express + Socket.IO сервер
- Deliverables:
  - `backend/src/server.ts` (Express + Socket.IO)
  - `backend/src/sockets.ts` (аутентификация по cookie GUID, room per user)
  - `backend/src/queues.ts` (пер-пользовательские очереди FIFO, capacity=1000)
  - `backend/src/api.ts` (POST `/api/enqueue`)
  - `backend/package.json`, скрипты запуска/тестов
- Behavior:
  - При подключении клиента с GUID — доставка накопленных сообщений по порядку
  - При переполнении очереди — удаляется самый старый
- Tests (jest):
  - unit: очереди (FIFO, eviction), валидация GUID
  - integration: enqueue → доставка онлайн пользователю; оффлайн → очередь
- Logs: принятие/доставка/eviction событий

## Task 3: Frontend — статические страницы и сервис-воркер
- Deliverables:
  - `frontend/public/index1.html`, `index2.html`, `js/client.js`
  - `frontend/public/sw.js` (единственное соединение, BroadcastChannel)
- Behavior:
  - Генерация GUID при первом визите, cookie, отображение на обеих страницах
  - Хранение последних 10 сообщений в IndexedDB/Cache/LocalStorage (любой стабильный вариант)
  - Фоновая доставка сообщений во время навигации
- Tests:
  - e2e (Playwright): навигация между страницами, непрерывный приём
  - проверка сохранения 10 сообщений после рестарта браузера (контейнера)

## Task 4: CLI `send.sh` (host-executed)
- Deliverables:
  - `send.sh` — вызывает `POST /api/enqueue` (host → backend)
  - Проверка формата GUID, человекочитаемые ошибки
- Tests:
  - contract: вызов с корректными параметрами → 202
  - invalid GUID → 400 и понятное сообщение

## Task 5: Надёжность соединения и фоллбек
- Deliverables:
  - Клиент (SW) реализует экспоненциальный бэкофф: 5s, 10s, 20s, затем 30s max
  - Socket.IO обеспечивает фоллбек на long-polling
- Tests:
  - e2e: симулировать обрыв соединения; проверить ретраи и восстановление

## Task 6: Edge Cases и масштабирование до 50 пользователей
- Deliverables:
  - Стабильность доставки при длинных сообщениях
  - Поддержка 50 одновременных пользователей (легковесная эмуляция)
- Tests:
  - integration/e2e: параллельные клиенты с уникальными GUID; порядок доставки FIFO

## Success Criteria Mapping
- SC-001: e2e — доставка ≤ 2 сек при онлайн — PASS
- SC-002: e2e — 100% оффлайн очередь доставляется — PASS
- SC-003: стабильность соединения (<1% fail) — наблюдаем на e2e с логами
- SC-004: навигация без потерь — e2e — PASS
- SC-005: 10 последних сообщений — e2e — PASS
- SC-006: 50 concurrent users — load test e2e — PASS
- SC-007: все автотесты — PASS
- SC-008: FIFO порядок — unit/integration — PASS
- SC-009: фоллбек — подтверждён Socket.IO + тест обрыва — PASS

## Runbook (dev & CI)
- Build/Run:
  - `docker compose -f compose/docker-compose.yml up --build`
- Tests:
  - `docker compose -f tests/docker-compose.test.yml up --build --exit-code-from tests`
- Logs:
  - `docker compose logs -f backend`

## Notes
- Простота > сложность: никаких внешних брокеров в демо.
- Все порты и хост — только через `.env`.

