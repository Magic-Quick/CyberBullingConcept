# 🎬 Movie Dev & Patch Suite (`tools/movie_dev/`)

Коллекция вспомогательных скриптов, использовавшихся при разработке, рефакторинге и верификации интерактивного фильма (PixiJS 8, `repo/`).

## Структура каталога

* **`inspection/` (106 скриптов):**
  Скрипты поиска, анализа и считывания структур кода `repo/src/` (`MovieApp.ts`, `Subtitles.ts`, `storyData.ts`):
  * `inspect_act*.py`, `inspect_story_acts*.py`: тайминги и параметры актов
  * `inspect_ambient_*.py`, `inspect_cue_*.py`, `inspect_all_shot_cues.py`: проверка эмбиента, аудио-кью и нормализации
  * `inspect_premiere_*.py`, `inspect_daw_*.py`: проверка дорожек таймлайна в стиле Premiere/DAW
  * `find_*.py`: точечный поиск методов, конструкторов и вызовов
  * `check_nick_images.py`, `read_nick_prompts.py`: проверка сгенерированных ассетов

* **`patches/` (38 скриптов):**
  Одноразовые скрипты модификации и патчинга исходного кода `repo/src/`:
  * `apply_audio_director_suite.py`, `apply_daw_director_*.py`: внедрение режиссёрской панели и DAW-таймлайна
  * `apply_premiere_upgrades_part1..4.py`: пакетные апгрейды таймлайна
  * `apply_user_fixes.py`: выравнивание скруглений, масок и стилей карточек
  * `patch_ambient_*.py`, `patch_movieapp_*.py`, `patch_subtitles.py`: патчи синхронизации, субтитров и звука
  * `fix_*.py`: исправление опечаток, отступов и багов

* **`verification/` (10 скриптов):**
  Скрипты сквозного тестирования и браузерной верификации (Playwright / headless Chromium):
  * `test_full_experience_verification.py`: полная сквозная проверка воспроизведения
  * `verify_all_user_bugs_fixed.py`: автоматический регрессионный тест исправлений
  * `verify_premiere_director.py`, `verify_intro_and_audio.py`: проверка запуска и переходов
  * `test_seek_past_disclaimer.py`, `test_initial_music_playback.py`: проверка разблокировки аудио и перемотки
