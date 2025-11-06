# Data Model

## Entities

### User
- id: GUID (string)
- connectionStatus: enum("online","offline") — вычисляемое состояние
- queueRef: ссылка на очередь сообщений пользователя

### Message
- id: string (uuid на бэкенде) — опционально, для трассировки
- userId: GUID
- text: string (неограниченной длины)
- timestamp: number (ms since epoch) — для порядка и логов

### MessageQueue (per-user)
- userId: GUID
- items: ordered list<Message>
- capacity: 1000 (fixed)
- policy: FIFO eviction (удаляем старейшие при переполнении)

## Relationships
- User 1 — N Message (логическое соответствие)
- User 1 — 1 MessageQueue

## Validation Rules
- userId формат GUID
- при enqueue: text — любая строка (включая очень длинные)
- при переполнении очереди: удалить самый старый элемент (FIFO)

## State Transitions
- offline → online: при установке сокет-соединения; все накопленные items доставляются по порядку
- online → offline: при разрыве соединения; новые сообщения продолжают накапливаться в очереди

