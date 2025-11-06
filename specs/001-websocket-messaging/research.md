# Research: Technology and Design Decisions

## Decision: Node.js + Socket.IO (backend and client)
- Rationale: Socket.IO даёт из коробки фоллбек на long-polling, простую интеграцию с Express и хорошо документирован на фронтенде. Для демо минимизирует сложность.
- Alternatives considered: WebSocket (ws) + вручной фоллбек (сложнее реализация); SockJS+STOMP (доп. прослойка протокола без явной выгоды для демо).

## Decision: Очереди в памяти процесса (per-user, FIFO, limit=1000)
- Rationale: Демо-скоп, простота, соответствует требованию лимита и вытеснения старых сообщений.
- Alternatives considered: Redis Lists (лишняя внешняя зависимость); файловое хранилище (медленно и избыточно).

## Decision: Сервис-воркер как единственная точка соединения
- Rationale: Требование: единый SW на пользователя, устойчивость при навигации. Рассылка в страницы через BroadcastChannel.
- Alternatives considered: Подключение со страниц — теряет сообщения при навигации; SharedWorker — хуже поддержка.

## Decision: CLI через HTTP API (host-executed shell)
- Rationale: Простая оболочка `send.sh` дергает REST endpoint бэкенда, что изолирует детали доставки/очередей.
- Alternatives considered: `docker exec` в контейнер — сложнее для хоста и CI.

## Decision: Тестирование — jest (unit/integration) + Playwright (e2e)
- Rationale: Широко используемые инструменты, легко запускать в docker compose, понятные отчеты.
- Alternatives considered: Mocha/Chai (сравнимо); Cypress (UI-ориентирован, но Playwright проще в compose headless).

## Decision: Конфигурация из `.env` (HOST, BACKEND_PORT, FRONTEND_PORT)
- Rationale: Соответствие конституции; удобство для compose; порты ≥ 9000; не-локалхост хост.
- Alternatives considered: жёстко зашитые значения — нарушает конституцию.

## Decision: Рестарт соединения — экспоненциальная задержка 5s→10s→20s→30s max
- Rationale: Прямое требование из спецификации; поддерживается на клиенте (реализация в SW поверх Socket.IO).
- Alternatives considered: линейная задержка — не соответствует требованию.

## Open Questions — resolved
- Формат идентификатора: GUID — хранится в cookie; генерируется на фронтенде при первом визите → подтверждено.
- Максимальная длина сообщения: не ограничена → хранение/передача как строки, UI корректно переносит.
- Очередь при оффлайне: сохраняем сообщения в очереди до подключения → доставляем по порядку.

Status: All clarifications resolved; ready for Phase 1.

