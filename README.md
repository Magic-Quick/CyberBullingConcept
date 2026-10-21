# CyberBullingConcept («Сыгравший в ящик»)

Мультимедийный творческий проект: сатирические хроники продакшена в стилистике Warhammer 40K, трек ИИ-Лорда («Сервоторизация приматов»), озвучка, арт-ассеты и интерактивная веб-презентация.

---

## 🚀 Быстрый запуск (1 клик)

- **[OPEN_PRESENTATION.bat](file:///h:/PLBX/CyberBullingConcept/OPEN_PRESENTATION.bat)** — Запуск интерактивной веб-презентации `index.html`.
- **[START_STUDIO_SERVER.bat](file:///h:/PLBX/CyberBullingConcept/START_STUDIO_SERVER.bat)** — Запуск локального сервера студий на порту 8765.
- **[OPEN_JOKE_KEEPER.bat](file:///h:/PLBX/CyberBullingConcept/OPEN_JOKE_KEEPER.bat)** — Открытие интерфейса Joke Keeper Studio в браузере.

---

## 🗺️ Навигация по проекту

Подробная карта для ИИ-ассистентов и разработчиков находится в файле **[AI_MAP.md](file:///h:/PLBX/CyberBullingConcept/AI_MAP.md)**.

- **`docs/`** — Сценарии, лор, рэп-треки, досье персонажей и исследовательские факты.
  - `docs/golden/` — Актуальные эталонные версии (V13 сценария, трек ИИ-Лорда, правила лора).
  - `docs/archive_versions/` — Архив промежуточных версий V1–V12.
- **`media/`** — Все медиа-материалы:
  - `media/audio/` — Озвучка выпуска V13, музыкальные треки, эмбиенты, нарезки.
  - `media/visual/` — Арты Midjourney, Imagen, слои анимации, аватарки, промпты.
  - `media/slack_screenshots/` — Скриншоты реальных сообщений из Slack.
- **`tools/`** — Исполняемые скрипты:
  - `tools/studio/` — Co-Writer Studio, Joke Keeper Studio, бэкенд-сервер.
  - `tools/audio_pipeline/` — Генераторы озвучки и сведение аудио.
  - `tools/visual_pipeline/` — Обработка логотипов и персонажей.
  - `tools/slack_capture/` — Утилиты захвата и рендера сообщений Slack.
  - `tools/fact_analyzer/` — Парсеры и поисковики фактов.
- **`data/`** — Тяжелые базы фактов и JSON-датасеты.
- **`web_assets/`** — Фронтенд-ресурсы для работы плеера `index.html`.
- **`scratch/`** — Временные черновики, маски и служебные файлы.
