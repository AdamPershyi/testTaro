# Streamer.bot — налаштування Tarot Bot

Streamer.bot працює **локально на твоєму ПК** і з’єднує Twitch з бекендом на Render.

## Передумови

- Streamer.bot підключений до Twitch
- Channel Point Reward створена (наприклад **"🔮 Таро-розклад"**)
- Бекенд задеплоєний, знаєш `API_SECRET` і URL (наприклад `https://tarot-bot.onrender.com`)

---

## Сценарій 1: Редім → питання в чаті → API

### Крок 1 — Channel Point Redemption Trigger

1. Streamer.bot → **Triggers** → **Twitch** → **Channel Point Reward Redemption**
2. Обери свою нагороду **"Таро"**
3. Назва sub-action group: `Tarot / Start`

### Крок 2 — Повідомлення в чат

Додай **Send Message to Channel**:
```
@{user}, напиши своє питання для таро протягом 60 секунд ✨
```

### Крок 3 — Зберегти користувача в змінну

Додай **Set Global Variable**:
- Name: `tarot.pendingUser`
- Value: `%user%`

Таймер 60 сек (опційно через **Start Timer** sub-action).

### Крок 4 — Trigger на повідомлення в чаті

1. **Triggers** → **Twitch** → **Chat Message**
2. Умова: `%user%` equals `%tarot.pendingUser%`
3. Умова: `%message%` length > 5

### Крок 5 — HTTP Request до бекенду

Sub-action: **Core** → **Http Request**

| Поле | Значення |
|---|---|
| Method | POST |
| URL | `https://YOUR-APP.onrender.com/api/readings` |
| Content Type | application/json |
| Headers | `X-API-Key: YOUR_API_SECRET` |
| Body | див. нижче |

Body (JSON):
```json
{
  "username": "{user}",
  "question": "{message}"
}
```

У Streamer.bot змінні зазвичай `%user%` та `%message%` — підстав відповідно до твоєї версії.

### Крок 6 — Очистити pending user

Після успішного запиту:
- `tarot.pendingUser` = `` (порожньо)

### Крок 7 — Підтвердження в чат

```
@{user}, карта обирається... 🔮
```

---

## Сценарій 2: Простий тест без чату

Trigger: **Manual** або **Command** `!tarotTest`

HTTP POST:
```json
{
  "username": "TestUser",
  "question": "Тестове питання для таро"
}
```

Перевір OBS overlay — має з’явитись анімація.

---

## OBS

1. Browser Source → `https://YOUR-APP.onrender.com/overlay`
2. 1920×1080
3. Переконайся що overlay **видимий** під час розкладу

---

## Troubleshooting

| Проблема | Рішення |
|---|---|
| 401 Unauthorized | перевір `X-API-Key` = `API_SECRET` на Render |
| Overlay не реагує | перевір WebSocket (F12 у browser source → dev tools якщо доступно) |
| Довга затримка | Render free cold start — прогрій `/api/health` перед стрімом |
| Немає звуку | OBS → Browser Source → не muted; Control audio via OBS |
| OpenAI помилка | перевір ключ і баланс; fallback текст все одно має з’явитись |

---

## Twitch API — коли потрібна?

**Не потрібна** для базового сценарію через Streamer.bot.

Потрібна лише якщо захочеш:
- власного Twitch-бота без Streamer.bot
- автоматичне повернення channel points
- EventSub напряму в Node

Для старту — **Streamer.bot достатньо**.
