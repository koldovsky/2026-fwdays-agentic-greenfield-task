## Автор

Ihor Hrynchyshyn

---

## Проєкт

Розроблено систему автоматичної транскрибації YouTube-відео та прямих трансляцій на Python. Для звичайних відео система спочатку використовує субтитри YouTube, а за їх відсутності переходить на Speech-to-Text через OpenAI API. Для live-трансляцій реалізовано окремий pipeline з транскрибацією аудіо у конфігурованому часовому вікні та нарізанням аудіо по паузах.

---

## Відео-демо (1–2 хв)

Video:

https://drive.google.com/file/d/1wgOmKpgOaWkiM8srezh_7J-WodUCUqoU/view?usp=sharing

---

## Які практики Agentic Engineering застосовано

### Spec-Driven Development

Перед написанням коду було створено повний набір специфікацій:

* VISION.md
* PRD.md
* ARCHITECTURE.md
* SDD.md
* ACCEPTANCE_CRITERIA.md
* CURSOR_RULES.md
* CHECKER_PROMPT.md

Розробка виконувалася відповідно до цих документів, а не через поступове уточнення вимог під час написання коду.

### Контекст-інженерія

Для AI-агента було сформовано статичний контекст у вигляді документації проєкту та правил роботи (`CURSOR_RULES.md`). Це дозволило забезпечити узгодженість реалізації між різними сесіями розробки.

### Maker ≠ Checker

Розробку виконував AI-агент у Cursor, після чого окремий Checker Agent перевіряв відповідність реалізації документації та acceptance criteria.

Після кожної перевірки виправлялися знайдені невідповідності до отримання позитивного результату.

### Loop Engineering

Замість великих одноразових промптів використовувався цикл:

1. сформувати специфікацію;
2. реалізувати функціональність;
3. перевірити реалізацію;
4. виправити зауваження;
5. повторити цикл.

Такий підхід дозволив поступово покращувати якість проєкту.

### Верифікація

Для перевірки використовувалися:

* автоматичні unit-тести;
* Checker Agent;
* реальне тестування на YouTube URL;
* перевірка вихідних TXT та JSON транскрипцій.

У фінальній версії всі автоматичні тести успішно проходять.

### Інструменти

* Cursor
* ChatGPT
* CodeRabbit (конфігурація для автоматичного AI Code Review)
* GitHub
* Python
* OpenAI Speech-to-Text API
* yt-dlp
* ffmpeg

### Розподіл відповідальності

Я визначав:

* архітектуру;
* вимоги до системи;
* логіку роботи pipeline;
* вибір технологій;
* пріоритети реалізації;
* аналізував результати роботи та приймав рішення щодо виправлень.

AI-агенти виконували:

* генерацію початкової реалізації;
* написання тестів;
* рефакторинг;
* автоматичну перевірку відповідності документації;
* пошук та виправлення помилок.

---

### Чекліст

* [x] Вказано справжнє імʼя
* [x] Додано посилання на відео-демо (1–2 хв)
* [x] Описано застосовані практики Agentic Engineering
* [x] Результат робочий і доведений до кінця


# YouTube Transcription System

A modular Python system for generating timestamped transcripts from YouTube videos and live streams.

## Features

- Accepts a YouTube URL and automatically detects live vs regular video
- Downloads existing subtitles for regular videos when available
- Falls back to external Speech-to-Text (STT) when subtitles are missing
- Transcribes live streams around a configurable time window (default: 3 minutes before/after)
- Splits audio into silence-aware chunks up to 60 seconds
- Uses OpenAI Whisper API for multilingual STT (no local model hosting)
- Saves output as `.txt` and `.json` with full metadata

## Requirements

- Python 3.11+
- [FFmpeg](https://ffmpeg.org/) (required by `yt-dlp` and `pydub`)

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENAI_API_KEY` in `.env` for STT fallback and live transcription.

## Usage

```bash
python -m app.main "https://www.youtube.com/watch?v=VIDEO_ID"
```

Optional parameters:

```bash
python -m app.main "https://www.youtube.com/watch?v=VIDEO_ID" \
  --timestamp-interval 15 \
  --live-before 3 \
  --live-after 3 \
  --max-chunk-duration 60 \
  --stt-model whisper-1 \
  --output-dir output \
  --save-debug-audio
```

Disable silence-based chunking:

```bash
python -m app.main "URL" --no-silence-detection
```

## Output

Transcripts are saved to the `output/` directory:

- `{video_id}.txt` — human-readable timestamped transcript
- `{video_id}.json` — structured output with metadata

JSON includes: `source_url`, `video_id`, `video_type`, `processing_method`, `timestamp_interval_seconds`, `segments`, and `metadata` (STT provider/model or live window settings when applicable).

### Debug audio (STT only)

Enable with `--save-debug-audio` or `SAVE_DEBUG_AUDIO=true`. Chunks are written to:

```text
output/debug_audio/{video_id}/
  chunk_000_0.0s-58.4s.wav
  chunk_001_58.4s-120.0s.wav
  manifest.json
```

The manifest lists each chunk index, filename, and start/end/duration in seconds.

## Project Structure

```
app/
├── config/settings.py      # Centralized configuration
├── models/schemas.py       # Data models
├── services/               # Business logic modules
├── providers/openai.py
├── utils/
├── pipeline.py             # Orchestration layer
└── main.py                 # CLI entry point
tests/
output/
docs/
```

## Tests

```bash
pytest
```

Tests mock external APIs and do not require real live streams.

## Configuration

All defaults live in `app/config/settings.py` and can be overridden via environment variables or CLI flags. See `.env.example` for available options.
