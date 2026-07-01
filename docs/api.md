# API специфікація — Siebel Review Webhook

## Endpoint

```
POST /api/webhook/jira
```

---

## Авторизація

Заголовок `Authorization` з Bearer токеном:

```
Authorization: Bearer <WEBHOOK_API_TOKEN>
```

`WEBHOOK_API_TOKEN` задається в `.env` на сервері.

---

## Тіло запиту (JSON)

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| `jiraIssueKey` | string | ✅ | Ключ тікету в Jira (напр. `SUN-893`) |
| `workspaceName` | string | ✅ | Назва воркспейсу Siebel |
| `user` | string | ✅ | Логін користувача в Jira (буде призначений assignee у Sub-task) |

**Приклад:**
```json
{
  "jiraIssueKey": "SUN-893",
  "workspaceName": "dev_orogov_ws2",
  "user": "Alexandr.Rogov"
}
```

---

## Відповіді

| Сценарій | HTTP | `errorCode` | `errorMessage` |
|----------|:----:|:-----------:|----------------|
| Є Business Service — взято в роботу | 200 | `1` | `Взято в роботу` |
| Немає Business Service у воркспейсі | 200 | `0` | `Відсутні об'єкти для аналізу` |
| Воркспейс не знайдено в Siebel | 200 | `1000` | `Воркспейс не знайдено` |
| Невалідний або відсутній токен | 401 | `401` | `Unauthorized` |
| Відсутні обов'язкові поля | 200 | `400` | `Відсутні обов'язкові поля: <перелік>` |
| Внутрішня помилка сервера | 500 | `500` | `Внутрішня помилка сервера` |

**Формат відповіді (всі сценарії):**
```json
{
  "errorCode": "1",
  "errorMessage": "Взято в роботу"
}
```

---

## Поведінка при `errorCode: 1`

Відповідь повертається **негайно**, не чекаючи завершення рев'ю.
Обробка відбувається асинхронно:

```
GET Siebel скрипти → Vertex AI рев'ю → Sub-task у Jira
```

Результат публікується як **Sub-Code Review** (дочірня задача) до `jiraIssueKey` з `assignee = user`.

---

## Налаштування в Jira Automation

**Тригер:** будь-яка подія (напр. перехід тікету у статус `In Review`)

**Дія:** `Send web request`
- URL: `http://<SERVER_IP>:<PORT>/api/webhook/jira`
- Method: `POST`
- Headers: `Authorization: Bearer <WEBHOOK_API_TOKEN>`
- Body type: `JSON`
- Body:
```json
{
  "jiraIssueKey": "{{issue.key}}",
  "workspaceName": "{{issue.customfield_XXXXX}}",
  "user": "{{issue.assignee.name}}"
}
```

> `customfield_XXXXX` — ID кастомного поля де зберігається назва воркспейсу Siebel.
