# 🔮 Tarot Twitch Bot

Бекенд для Twitch-розкладів таро: **Streamer.bot** → **Node API** → **OpenAI (текст + TTS)** → **OBS overlay**.

## Що вже зроблено

- REST API для створення розкладів
- Черга розкладів (по одному за раз)
- 78 карт таро з українськими значеннями
- OpenAI інтерпретація + TTS (`tts-1`, українська)
- OBS Browser Source overlay (анімація, карта, текст, аудіо)
- WebSocket для live-оновлень overlay
- Готовність до деплою на **Render**

## Що потрібно від тебе

| Що | Навіщо |
|---|---|
| **OpenAI API key** | інтерпретація + TTS |
| **API_SECRET** | захист API від сторонніх запитів |
| **Streamer.bot** (локально) | channel points + чат → HTTP на бекенд |
| **OBS** | Browser Source на `/overlay` |
| **Render акаунт** | хостинг бекенду (або локально для тестів) |

**Twitch API напряму не потрібна**, якщо використовуєш Streamer.bot — він уже вміє Twitch.

---

## Локальний запуск

```bash
npm install
cp .env.example .env
# заповни OPENAI_API_KEY та API_SECRET
npm run dev
```

Відкрий:
- Overlay: http://localhost:3000/overlay
- Health: http://localhost:3000/api/health

### Тестовий запит (PowerShell)

```powershell
$headers = @{ "Content-Type" = "application/json"; "X-API-Key" = "твій-api-secret" }
$body = @{ username = "TestUser"; question = "Чи варто міняти роботу?" } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/readings" -Headers $headers -Body $body
```

---

## Деплой на Render

1. Залий проєкт на GitHub
2. Render → **New Web Service** → підключи репо
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Env variables:
   - `OPENAI_API_KEY`
   - `API_SECRET` (довгий рандом)
   - `PUBLIC_BASE_URL=https://your-app.onrender.com`

Або використай `render.yaml` (Blueprint).

### ⚠️ Важливо про Render Free

- **Cold start** 30–60 сек — погано для live-стрімів
- Рекомендація: **Starter plan** або ping health кожні 5 хв перед стрімом
- Аудіо зберігається в RAM (30 хв), після рестарту зникає — для стріму ок

---

## OBS налаштування

1. Джерело → **Browser**
2. URL: `https://your-app.onrender.com/overlay`
3. Width: **1920**, Height: **1080**
4. ✅ Custom CSS не потрібен
5. ✅ Увімкни **Control audio via OBS** якщо хочеш керувати гучністю
6. Аудіо з overlay має лунати через Browser Source (переконайся, що не muted)

---

## API

### `POST /api/readings` (захищено)

Headers: `X-API-Key: YOUR_SECRET`

```json
{
  "username": "viewer123",
  "question": "Що мене чекає цього місяця?"
}
```

Response `202`:
```json
{
  "id": "uuid",
  "status": "queued",
  "queuePosition": 1
}
```

### `GET /api/readings/:id` (захищено)

Статус розкладу.

### `GET /api/readings/:id/audio`

MP3 для overlay (публічний URL, без ключа — потрібен для Browser Source).

### `GET /api/health`

Health check для Render.

---

## Streamer.bot

Детальна інструкція: [docs/streamer-bot-setup.md](docs/streamer-bot-setup.md)

Коротко:
1. Channel Point Reward **"Таро"**
2. Після редіму — чекати повідомлення в чат (60 сек)
3. HTTP POST на `/api/readings`

---

## Вартість OpenAI (орієнтовно)

На 1 розклад:
- **gpt-4o-mini**: ~$0.001–0.003
- **tts-1**: ~$0.005–0.015 (залежить від довжини тексту)

20–50 розкладів за стрім ≈ **$0.20–1.00**

---

## Структура проєкту

```
src/           — бекенд (Express + WebSocket)
data/          — колода таро (78 карт)
public/overlay — OBS overlay
docs/          — Streamer.bot інструкція
```

---

## Наступні кроки (опційно)

- [ ] Картинки карт у `public/cards/`
- [ ] Дублювання відповіді в Twitch-чат через Streamer.bot
- [ ] 3-картковий розклад
- [ ] Cooldown на користувача
