# РЕЕСТР ПРОМПТОВ MIDJOURNEY: СУРОВЫЙ ЭКИПАЖ ЦИТАДЕЛИ (WARHAMMER 40K ED.)
> **Полное расширенное досье с описанием лиц и референсов:** [`WARHAMMER_CHARACTERS_VISUAL_DOSSIER.md`](file:///H:/PLBX/CyberBullingConcept/docs/golden/WARHAMMER_CHARACTERS_VISUAL_DOSSIER.md).  
> **Форматы генерации для каждого героя:**  
> 1. **Full-body 3/4 Concept (`--ar 16:9`):** Эпичный концепт в полный рост в три четверти.  
> 2. **Dialog Face Avatar (`--ar 1:1`):** Унифицированная квадратная аватарка лица для диалогов в игре.  
> **Интеграция прототипов:** Для каждого героя с фото в `H:\PLBX\CyberBullingConcept\Визуал\Реальные персонажи` прописано портретное сходство и прямой путь к файлу.

---

## ⚡ БЫСТРЫЕ КОМАНДЫ ДЛЯ ЗАПУСКА ГЕНЕРАЦИИ В DISCORD

| # | Персонаж | Канонический титул | Реальная роль | Файл прототипа | Запуск Full-Body (16:9) | Запуск Avatar (1:1) |
|---|---|---|---|---|---|---|
| 1 | **Толя (Анатолий)** | Лорд-Командор Цитадели | CEO / Основатель | `02_Toly_Sherbakov_лицо.jpg` | `--tag "tolya_fullbody"` | `--tag "tolya_avatar"` |
| 2 | **Алексей Горин** | Верховный Надзиратель Конвейера | Head of Production | `01_Alexey_Gorin_лицо.jpg` | `--tag "gorin_fullbody"` | `--tag "gorin_avatar"` |
| 3 | **Ева Аксёнова** | Сестра Клиентского Фронта | Project Lead | *Оригинальный канон* | `--tag "eva_fullbody"` | `--tag "eva_avatar"` |
| 4 | **Эдуард Левин** | Зодчий Игрового Замысла | Project Lead | `08_02_Эдуард_Левин...jpg` | `--tag "edward_fullbody"` | `--tag "edward_avatar"` |
| 5 | **Егор Ткачёв** | Преподобный Толкователь Воли Клиентархов | Creative Director | *Оригинальный канон* | `--tag "egor_fullbody"` | `--tag "egor_avatar"` |
| 6 | **Павел Самойленко** | Архи-Цензор Синтаксической Ереси | CTO | `08_06_Павел_Самойленко_лицо.jpg`| `--tag "pavel_fullbody"` | `--tag "pavel_avatar"` |
| 7 | **Максим Мамусин** | Архи-Техномагистр Канона | Tech Lead | `03_Максим_Мамусин_slack_1024.jpg` | `--tag "maxim_fullbody"` | `--tag "maxim_avatar"` |
| 8 | **Миша** | Алхимик Внутренней Кузницы | Lead Core Dev | *Оригинальный канон* | `--tag "misha_fullbody"` | `--tag "misha_avatar"` |
| 9 | **Вика (Виктория)** | Верховная Настоятельница Пиксельного Канона | Art Director | `08_07_Вика_со_стикерами.jpg` | `--tag "vika_fullbody"` | `--tag "vika_avatar"` |
| 10 | **Артём Хухро** | Техноэкзорцист Графической Скверны | Lead 3D / Art Tech Lead | `Артем хухро.jpg` | `--tag "huhro_fullbody"` | `--tag "huhro_avatar"` |
| 11 | **Женя** | Мастер Вечного Рендера | 2D Artist | *Оригинальный канон* | `--tag "zhenya_fullbody"` | `--tag "zhenya_avatar"` |
| 12 | **Вова (Владимир)** | Адепт Цветового Канона | 3D/2D Artist | `04_Владимир_Хаецкий_лицо.jpg`| `--tag "vova_fullbody"` | `--tag "vova_avatar"` |
| 13 | **Давит Газарян** | Архи-Механик Статического Рантайма | Playable Developer | `08_01_Давит_Газарян...jpg` | `--tag "davit_fullbody"` | `--tag "davit_avatar"` |
| 14 | **Александр Панков**| Архи-Инженер Квантового Клика | Playable Developer | `08_03_Александр_Панков...jpg`| `--tag "pankov_fullbody"` | `--tag "pankov_avatar"` |
| 15 | **Даниал Искаков** | Кузнец Троичного Кода | Playable Developer | *Оригинальный канон* | `--tag "danial_fullbody"` | `--tag "danial_avatar"` |
| 16 | **Кирилл Берёзкин** | Магистр Циклической Несовместимости | Platform Engineer | *Оригинальный канон* | `--tag "kirill_fullbody"` | `--tag "kirill_avatar"` |
| 17 | **Кристиан** | Страж Нулевого Коммита | Platform Developer | *Оригинальный канон* | `--tag "christian_fullbody"` | `--tag "christian_avatar"` |
| 18 | **Ник Егоров** | Координатор Скоростной Статики | Playable Developer | *Оригинальный канон* | `--tag "nick_fullbody"` | `--tag "nick_avatar"` |
| 19 | **Леван** | Префект Сверхсветового Рендера | Playable Developer | *Оригинальный канон* | `--tag "levan_fullbody"` | `--tag "levan_avatar"` |
| 20 | **Алексей (новый)** | Новообращённый Послушник | Junior Playable Dev | *Оригинальный канон* | `--tag "alexey_fullbody"` | `--tag "alexey_avatar"` |
| 0 | **ИИ-Лорд** | Верховный Хронометрист Цитадели | ИИ-судья / Ведущий | *Машинный трон* | `--tag "ai_lord_fullbody"` | `--tag "ai_lord_avatar"` |

Подробные тексты всех промптов с деталями брони, окружения и лицевых референсов находятся в [`WARHAMMER_CHARACTERS_VISUAL_DOSSIER.md`](file:///H:/PLBX/CyberBullingConcept/docs/golden/WARHAMMER_CHARACTERS_VISUAL_DOSSIER.md).
