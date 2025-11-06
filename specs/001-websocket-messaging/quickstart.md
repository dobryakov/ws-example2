# Quickstart

## Requirements
- Docker, Docker Compose
- `.env` c переменными: `HOST`, `BACKEND_PORT` (>=9001), `FRONTEND_PORT` (>=9000)

## Run
```bash
docker compose -f compose/docker-compose.yml up --build
```

## Open frontend
```
http://$HOST:$FRONTEND_PORT/index1.html
http://$HOST:$FRONTEND_PORT/index2.html
```

На первой загрузке генерируется GUID, сохраняется в cookie и показывается на странице.

## Send a message (from host)
```bash
./send.sh <USER_GUID> "Привет мир"
```
Сообщение будет поставлено в очередь и доставлено по сокету. Если пользователь оффлайн — доставится при следующем подключении.

## Tests
```bash
docker compose -f tests/docker-compose.test.yml up --build --exit-code-from tests
```

## Logs
```bash
docker compose logs -f backend
```

