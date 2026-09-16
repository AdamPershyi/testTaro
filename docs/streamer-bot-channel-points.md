# Channel Points + питання з чату (один Action, C#)

У Streamer.bot **немає тригера** «чат тільки від того, хто редімив».
`Chat Message` завжди ловить увесь чат. Фільтр робимо **всередині Action**.

Рекомендація: **один Action** з двома тригерами.

---

## Action «Tarot»

### Triggers (обидва в одному Action)

1. `Twitch > Channel Reward > Reward Redemption` → Criteria: **Таро**
2. `Twitch > Chat > Chat Message`

### Sub-Actions (строго в цьому порядку)

1. **If / Else** — це редім?
   - Input: `%rewardName%`
   - Operator: `Equals`
   - Value: `Таро`
   - **True:**
     - Twitch Message: `@%userName%, напиши питання для таро протягом 60 сек ✨`
     - Set Global `tarot.pendingUser` = `%userName%` (Persisted ✅)
     - **Break** (зупинити Action, не слати POST)
   - **False:** нічого, йдемо далі

2. **If / Else** — чи є очікування редіму?
   - Input: `~tarot.pendingUser~`
   - Operator: `Is Null or Empty`
   - **True:** **Break**
   - **False:** далі

3. **If / Else** — це той самий юзер?
   - Input: `%userName%`
   - Operator: `Equals (Ignore Case)`
   - Value: `~tarot.pendingUser~`
   - **True:** далі
   - **False:** **Break**

4. **Execute C#** — взяти питання з чату (код нижче)

5. **Execute C#** — POST на API (робочий код з `!tarotTest`)

6. Set Global `tarot.pendingUser` = *(порожньо)*

---

## C# #1 — питання з чату

```csharp
using System;

public class CPHInline
{
    public bool Execute()
    {
        CPH.TryGetArg("messageStripped", out string message);
        if (string.IsNullOrWhiteSpace(message))
            CPH.TryGetArg("message", out message);

        if (string.IsNullOrWhiteSpace(message) || message.TrimStart().StartsWith("!"))
            return false;

        if (message.Length < 3)
            return false;

        CPH.SetArgument("question", message);
        return true;
    }
}
```

`return false` зупиняє наступні sub-actions (POST не полетить).

---

## Важливо

- Скрізь юзер = `%userName%` (login), не `%user%` (display name).
- Action `!tarotTest` залиш окремо для тестів.
- Старий Action «Таро Чат» можна вимкнути, щоб не дублювався.
