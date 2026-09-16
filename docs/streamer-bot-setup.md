# Streamer.bot — налаштування Tarot Bot (C#)

Streamer.bot працює **локально на ПК** і шле POST на Render через **Execute C# Code**.

Бекенд: `https://testtaro.onrender.com`  
Overlay: `https://testtaro.onrender.com/overlay`

---

## Одноразово: reference для C#

У **Execute C# Code** → вкладка **References** → ПКМ → Add:

```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Net.Http.dll
```

Потім **Find Refs** → **Compile** → **Save and Compile**.

Без цієї DLL буде помилка `HttpClient could not be found`.

---

## C# код (основний) — POST на API

Використовуй у Action з HTTP-запитом.  
Питання береться з аргументу `question` (для чату) або дефолтне (для тесту).

```csharp
using System;
using System.Net.Http;
using System.Text;

public class CPHInline
{
    private static readonly HttpClient _httpClient = new HttpClient
    {
        Timeout = TimeSpan.FromSeconds(60)
    };

    public void Init()
    {
        _httpClient.DefaultRequestHeaders.Clear();
    }

    public bool Execute()
    {
        const string apiUrl = "https://testtaro.onrender.com/api/readings";
        const string apiSecret = "ТВІЙ_API_SECRET";

        CPH.TryGetArg("userName", out string userName);
        CPH.TryGetArg("user", out string user);
        string username = !string.IsNullOrWhiteSpace(userName) ? userName
            : !string.IsNullOrWhiteSpace(user) ? user : "TestUser";

        CPH.TryGetArg("question", out string question);
        if (string.IsNullOrWhiteSpace(question))
            question = "Тестове питання для таро";

        if (question.Length < 3)
        {
            CPH.SendMessage("@" + username + ", напиши питання довше (мін. 3 символи)");
            return false;
        }

        try
        {
            string json = "{\"username\":\"" + EscapeJson(username)
                + "\",\"question\":\"" + EscapeJson(question) + "\"}";

            var request = new HttpRequestMessage(HttpMethod.Post, apiUrl);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
            request.Headers.TryAddWithoutValidation("X-API-Key", apiSecret);

            var response = _httpClient.SendAsync(request).GetAwaiter().GetResult();
            string body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

            CPH.LogInfo("TAROT: HTTP " + (int)response.StatusCode + " " + body);

            if (!response.IsSuccessStatusCode)
            {
                CPH.SendMessage("@" + username + ", помилка таро (" + (int)response.StatusCode + ")");
                return false;
            }

            CPH.SendMessage("@" + username + ", карта обирається... 🔮");
            return true;
        }
        catch (Exception e)
        {
            CPH.LogError("TAROT ERROR: " + e.Message);
            CPH.SendMessage("@" + username + ", помилка таро. Спробуй ще раз.");
            return false;
        }
    }

    private static string EscapeJson(string value)
    {
        return value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", " ")
            .Replace("\r", "");
    }
}
```

> Заміни `ТВІЙ_API_SECRET` на значення з Render (`API_SECRET`).

---

## Сценарій 1 — тест командою `!tarotTest`

**Trigger:** Commands → `!tarotTest`  
**Sub-actions:** один **Execute C# Code** з кодом вище.

---

## Сценарій 2 — channel points + питання з чату

Детально: [streamer-bot-channel-points.md](./streamer-bot-channel-points.md)

**2 Actions:** редім → зберегти юзера → чат → C# POST.

---

## OBS

Browser Source: `https://testtaro.onrender.com/overlay` (1920×1080, звук через OBS ✅)

---

## Troubleshooting

| Проблема | Рішення |
|---|---|
| `HttpClient could not be found` | Додай `System.Net.Http.dll` у References |
| `Id is empty` | Compile → Save and Compile |
| 401 | `apiSecret` = `API_SECRET` на Render |
| `???` в overlay | POST через C# + UTF-8 |
| Чат не реагує | `%user%` == `~tarot.pendingUser~` |

---

## Twitch API

Не потрібна для цього сценарію.
