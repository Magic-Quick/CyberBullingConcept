# Retro Soviet Film Character Style Guide

> Назначение: восстановить стиль персонажей, если потеряется чат. Это не Midjourney-стиль и не рисованный concept art. Это направление для GPT Image API edit: персонажи должны выглядеть как кадры из старого фантастического кино с практическими костюмами, декорациями и пленкой.

## Одобренные якоря качества

- `media/visual/generated/retro_film_pavel_gpt_v2.png` - Павел попал в нужный стиль: live-action practical effects, дым, реальные материалы, сервоманипуляторы как реквизит, 35mm film still.
- `media/visual/generated/retro_film_tolya_gpt_v2.png` - Толя попал в нужный стиль: старый фантастический фильм, аналоговый мостик, CRT/пульты, костюм как реальный гардероб.
- `Визуал/Сгенерированные_картинки/retro_soviet_film_pavel_playbox_logo_gpt_v4.png` - эталон поздней версии для Павла: живой актер, мягкая пленочная оптика, павильонная лаборатория, лампа и CRT-приборы как физический реквизит, механические руки выглядят как практические модели.
- `Визуал/Сгенерированные_картинки/retro_soviet_ship_tolya_winged_playbox_logo_gpt_v5.png` - эталон поздней версии для Толи: командир на корабле, но декорации выглядят как построенный съемочный павильон; корабли за окнами выглядят как миниатюры/матт-пейнтинг, а не как современный VFX.
- `Визуал/generated/Команда/Fin/retro_film_artem_mechanicus_warp_mutant_v10.png` - радикальный эталон Механикус + Варп-Мутанта Артёма (v10): клёпаный железный череп с мощными шлангами, искусственные глаза на лбу, трансовый взгляд, 4 микро-механодендрита ниже основных рук, калибрующие светящийся полиэдр.
- `Визуал/generated/Команда/Fin/retro_film_artem_pure_prop_intense_v9.png` - высший канонический эталон Артёма (v9): идеальная кинематографическая бутафория 70–80-х (чистый гладкий пульт, крупные кнопки, спокойный тёмный павильон, монолитная механическая труба-клешня) в сочетании с леденящим безумным взглядом прямо в объектив из v2. Полное отсутствие микромусора.
- `Визуал/generated/Команда/Fin/retro_film_artem_simple_prop_v7.png` - золотой эталон лаконичной бутафории Артёма (v7): чистый пульт, CRT-осциллограф, взгляд опущен к модели.
- `Визуал/generated/Команда/Fin/retro_film_artem_hooded_intense_v8.png` - золотой эталон Артёма в капюшоне (v8): канонический верстак с икосаэдром и серво-руками, переведённый в чистое 35mm кино с безумным пронзительным взглядом прямо в камеру и без лишних ламп на столе.
- `Визуал/generated/Команда/retro_film_eva_theatrical_prop_helmet_v7.png` - высший канонический эталон Евы (v7): абсолютный образец живого 35mm кино 1978–1983 (живая актриса с естественной кожей под тёплыми софитами, бутафорский панцирь Керриган, снятый шлем космодесанта из дешёвого пластика на пульте с эмблемой Playbox, узнаваемый пояс без нейрослопа с винтажной рацией, подсумком и баллонами, снайперка с ремнём у пульта, зелёный CRT-монитор).
- `Визуал/generated/Команда/retro_film_eva_theatrical_liveaction_kerrigan_v6.png` - версия без шлема (v6).
- `Визуал/generated/Команда/retro_film_eva_cheap_theatrical_kerrigan_v5.png` и `retro_film_eva_ghost_kerrigan_prop_v4.png` - промежуточные поисковые варианты (v4/v5).
- `Визуал/generated/Команда/retro_film_eva_theatrical_prop_v3.png` - альтернативный павильонный вариант (v3).

> [!IMPORTANT]
> **Правило папки `Fin`:** Агент никогда автоматически не сохраняет и не копирует файлы в папку `Fin/`. Папка `Fin/` формируется **исключительно пользователем вручную**, перемещающим туда только те кадры, которые он утвердил как образцовые. Все новые генерации агент сохраняет строго на уровень выше — в `Визуал/generated/Команда/` (и `Визуал/Сгенерированные_картинки/Команда/`).
- `Визуал/generated/Команда/Fin/retro_film_eva_retrofuturism_stealthsuit_v2.png` - альтернативный ретрофутуристический вариант Евы (v2) с мостиком звездолёта.
- `media/visual/generated/retro_grimdark_pavel_gpt_v1.png` и похожие v1 - не целевой стиль. Это слишком похоже на рисованную иллюстрацию/артбук.
- `media/visual/generated/retro_imperium_film_gorin_gpt_v2.png` - полезен по суровости, позе и имперскому дизайну, но НЕ эталон ретро-кино: слишком современный digital cinematic / game promo look, слишком четкая броня, слишком идеальный мрак, мало павильонной наивности 70-80-х.

## Почему Толя и Павел читаются как кино 70-80-х, а Горин пока слабее

Удачный ретроэффект держится не на словах `retro` и `film grain`, а на сумме производственных признаков:

- **Актер в костюме, а не персонаж из рендера.** У Толи и Павла лица, кожа, руки, ткань и посадка костюма выглядят как живой человек в гардеробе. У Горина броня и контраст легко становятся слишком современным промо-рендером.
- **Павильонная декорация.** Хорошие кадры выглядят как построенная сцена: панели из фанеры/металла, круглые CRT, бакелитовые кнопки, лампы, трубы, дым. Нужна физическая "съемочная" среда, а не бесконечная сверхдетализированная игровая локация.
- **Оптическая мягкость.** У эталонов есть 35mm softness, halation, чуть выцветший цвет, неидеальная резкость, легкое зерно. У плохих вариантов слишком высокий micro-contrast и crisp digital sharpness.
- **Теплый бытовой свет плюс зеленый CRT.** Лампы, теплый tungsten, приглушенный зеленый экран и дым дают ощущение старого фильма. Один только темный grimdark делает кадр современным.
- **Простая читаемая поза.** Толя держит жезл как актерский реквизит, Павел работает руками в лаборатории. Для Горина нужна такая же актерская постановка: суровый взгляд, командный жест, хронометр/планшет как реальный предмет, но без супергеройского постера.
- **Наивность практических эффектов.** Миниатюры кораблей, матт-пейнтинг за окнами, заметная условность реквизита и костюма важнее, чем фотореалистичная технологическая сложность.

Важно: золотые Павел и Толя — это референсы производственного ощущения, а не каталог деталей для копирования. Нельзя перетаскивать из них конкретные лампы, арки, манипуляторы, жезлы, позы или костюмные решения. Нужно повторять только причину ощущения старого кино: мягкая плёночная оптика, физический павильон, теплые практические источники, CRT/окна как реальные светящиеся поверхности, дым между слоями, крупные простые силуэты и умеренная детализация.

Для космических кораблей этот же принцип переводится так:

```text
1978-1983 miniature effects shot, motion-control model photography,
matte-painted starfield, optical glow around windows, soft focus,
visible film grain, slightly imperfect handmade model edges,
large readable ship silhouette, not modern CGI concept art.
```

Для рок-сцены ИИ-Лорда отдельная формула:

```text
late 1970s / early 1980s archival rock concert recording,
analog broadcast / VHS / 16mm concert-film softness,
red stage-light bleed, smoky PAR-can beams, crushed blacks,
scanline or interlace texture, chroma noise, halation, dirty lens,
paused bootleg concert tape feeling, not a clean modern poster.
```

Уточнение: если нужен **старый концерт / старый сайфай**, но не "плохая запись", не использовать VHS/TV degradation. Тогда формула такая:

```text
old sci-fi rock concert film still, 1978-1983 practical stage set,
35mm concert-film softness, warm amber and red PAR-can lights,
real smoke and theatrical haze, old lens halation, practical costume,
analog amplifiers and drum kit, dark stage void,
but no VHS scanlines, no interlace, no bad TV recording overlay,
no heavy chroma noise, no bootleg low-resolution look.
```

Если пользователь говорит, что ИИ-Лорд всё ещё выглядит как современный рендер, нужен не фильтр, а редизайн:

```text
AI Lord must read as a human actor inside an old sci-fi robot suit:
boxy fiberglass torso, vacuum-formed plastic armor panels,
chunky cylindrical arms and legs, oversized boots,
black fabric/rubber undersuit visible at joints,
practical hinge gaps, straps, screws, seams, scuffed paint,
red eye bulbs behind smoky plastic lenses,
handmade crown prop, old concert stage, not modern CGI armor.
```

Канон ИИ-Лорда при таких переделках:

```text
Keep the AI Lord face essentially unchanged from the canonical source:
angular gray metal mask, heavy brow plates, sharp red glowing eyes,
stern straight mouth, gold crown, and circular headphone-like side disks.
Retro sci-fi costume language may simplify the body and materials,
but it must not redesign the face into a generic robot.
Keep the bass guitar close to the canonical dark red/black gothic shape:
long neck, ornate curved body, brass/gold trim, heavy stage-prop presence.
```

Для ИИ-Лорда ретро-дух получается не от состаривания исходной современной брони, а от замены логики тела на старый съёмочный костюм:

```text
Use the old-film robot-suit body language:
simple cylindrical limbs, boxy metal chest, broad handmade shoulder pads,
large wearable boots, visible black rubber/fabric joints,
few large riveted plates instead of many sleek armor segments,
dull scuffed silver/charcoal metal, aged red cloth, practical prop construction.
Keep the canonical AI Lord head unchanged; add shoulder spikes and the red belt club
as monarch/Warhammer cues, but avoid returning to modern polished armor.
```

Уточнение по текущему удачному листу ИИ-Лорда:

```text
For the AI Lord practical costume sheet, keep the cape closer to the old concert reference:
dark heavy red stage cloth hanging behind the body, narrower and more vertical,
not a huge flat blanket. Keep the crown band clean without small rivet dots.
The red belt club should be a simple red cylindrical prop without an extra metal ring/collar at the bottom.
```

Финальное уточнение по плащу и дубинке:

```text
The cape must NOT be shredded or hole-ridden. It should be a mostly intact heavy red stage cape,
like the guitar-stage reference: one solid cloth panel with vertical folds, only subtle wear.
The belt club shape must match the canonical club reference: red cylindrical body, attached to the belt
through an upper hoop holder, suction-cup-like top, rounded bulbous bottom with a small recessed notch.
Do not simplify it into a plain stick and do not invent new lower metal rings.
```

Для следующих правок не брать слишком чистый v4 как материал-эталон. Правильнее держаться грязного реквизитного вида v3/v5:

```text
Preserve the dirty practical prop realism:
scuffed smoky metal, uneven grime, aged rivets, dusty 35mm softness,
and a red cape that is dirty and slightly careless, not newly cleaned.
The cape may be worn and imperfect; avoid making it neat, glossy, or sterile.
The club must keep the exact toy-like red prop proportions from the canonical reference:
short thick red cylinder, upper suction-cup cap, belt hoop holder,
rounded lower bulb with a small recessed notch.
```

Если пользователь просит сделать ИИ-Лорда "ниже", "приземистее", "прижимистее" или "на голову ниже", это НЕ значит отъехать камерой или уменьшить весь лист персонажа в кадре:

```text
Do not zoom out and do not make the character smaller in the canvas.
Keep the figure presence/framing large, but change the design proportions:
shorter legs and torso, broader shoulders, chunkier limbs, wider boots,
lower center of gravity, more compact heavy robot-suit silhouette.
He should look shorter as a character design, not smaller as an image object.
```

## Золотой уровень детализации

Эталон детализации - поздние версии Толи и Павла. Следующие варианты должны быть не детальнее их.

Правило кадра:

- одна простая, сильная, легко читаемая поза;
- один главный реквизит в руках или возле рук;
- один читаемый знак на груди, если нужен;
- фон из крупных павильонных форм, CRT, ламп и дыма, без перегруза сотнями мелких деталей;
- максимум 1-2 механических помощника/манипулятора для технических персонажей;
- никаких стен из микродеталей, десятков шестеренок, ювелирной брони, куч мелких кабелей и перегруженных HUD.

Промптовая формула:

```text
match the simple readable detail density of the approved Tolya and Pavel references:
one strong actor pose, one or two large practical props, quiet physical set,
large readable costume shapes, no dense micro-detail, no ornate overdesigned armor,
no busy wall of tiny mechanisms, no modern high-detail game cinematic.
```

## Формула лаконичной ретро-бутафории и предотвращения перегруза (Уроки Артёма v7)

### 1. Почему нейросеть скатывается в CGI/артбук и как её удержать в кино
- **Ловушка микродетализации:** Как только в промпт попадают описания мелких кабелей, множества поршней, пара из клапанов, паучьих пальцев и турелей линз (как было в v6), модель переключается в режим **«современный цифровой концепт-арт / игровой рендер»**. Мелкие детали разрушают плёночную оптику 1970–80-х.
- **Принцип крупной формы (Theatrical Prop):** Реквизит должен выглядеть так, будто его сделали бутафоры на киностудии Мосфильм или BBC из крашеной фанеры, латуни, точёного алюминия и листового металла. Клешня — это не 20 микро-шарниров, а простая монолитная труба, один гидравлический цилиндр и 2–3 массивные губки захвата.
- **Правило читаемости силуэта (Readable Silhouette):** Форма руки или инструмента должна безошибочно читаться в мелком масштабе (силуэт на тёмном фоне).

### 2. Лицо живого актёра — главный якорь правдоподобия
- **Не закрывать нижнюю часть лица:** Маски, чугунные респираторы и трубки на челюсти превращают персонажа в безликого монстра или 3D-модель из шутера. Губы, подбородок, скулы и мимика должны быть живыми и открытыми.
- **Минимум кибернетики на лице (Правило «Одного акцента»):** Ровно один читаемый прибор. Например: аккуратная часовая лупа-монокль на одном глазу на тонком кожаном ремешке. Второй глаз остаётся человеческим, создавая сильный психологический контраст.
- **Строгая суровость без полумер:** Взгляд немигающий, серьёзный, брови сведены, рот сомкнут — никакого позирования для селфи или весёлых ухмылок.

### 3. Предметный мир и декорации студии
- **Чистый гладкий пульт вместо нагромождения проводов:** Окрашенная консоль, крупные квадратные клавиши с внутренней подсветкой, массивные тумблеры.
- **Один центральный профильный прибор:** Круглый зелёный экран CRT/осциллографа с векторной сеткой. Это сразу задаёт эпоху 1978–1983 годов без необходимости загромождать фон.
- **Запрет на лишние бытовые лампы:** Настольные лампы не должны стоять на каждом столе — свет строится кинософитами съёмочной площадки.
- **Один физический объект в руках/манипуляторе:** Каркасный латунный икосаэдр/куб или чертёж, объясняющий профессию персонажа (калибровка 3D-геометрии).

### 4. Оптика и свет 35mm
- **Схема света:** Тёплый боковой/фронтальный свет софитов (tungsten ~3200K) + слабый холодный контровой свет по контуру + зелёный отсвет люминофора CRT на щеке и пульте.
- **Плёнка:** Kodak 5247 / Свема 35mm — лёгкий ореол (halation) вокруг ярких кнопок, мягкое органическое зерно, естественная глубина резкости объектива (не цифровая резкость по всем пикселям).

### 5. Стек референсов для GPT Image API `edit`
При запуске `image_gen.py edit` передавать 4 файла:
1. `IMAGE 1:` Предыдущий базовый кадр (композиция, поза, цветовая гамма робы/кителя).
2. `IMAGE 2:` Фото реального человека (`10_Артем_Хухро_лицо_крупно.png`) — обеспечивает 100% портретное сходство и правильные волосы.
3. `IMAGE 3:` Утверждённый эталон стиля кино (`Fin/retro_soviet_film_pavel_playbox_logo_gpt_v4.png` или `Fin/retro_film_tolya_gpt_v2.png`) — привязывает генератор к плёночной фактуре и бутафории.
4. `IMAGE 4:` Знак Playbox (`playbox_winged_logo_official_user.png`) — для правильной эмблемы на груди.

### 6. Ключевые стоп-слова в промпте
Всегда указывать в негативном блоке:
`No digital CGI, no 3D render look, no video game cinematic, no floating neon holograms, no over-detailed micro-greebles, no complex wire clusters, no comic outlines, no concept art poster, no smiles or cheerful expressions.`

## Ваха-персонализация и эмоциональный спектр лиц

Все персонажи в этом направлении должны выглядеть психологически достоверно для гримдарк-конвейера: **лица у всех строго суровые, зловещие, испуганные или обреченные** (в зависимости от роли и статуса в сеттинге), даже если исходный фото-референс дружелюбный или улыбающийся.

- **Суровые (Stern):** Высшее командование (Толя, Ева) — тяжелый авторитетный взгляд, бремя долга.
- **Зловещие (Sinister):** Надзиратели конвейера и инквизиторы сроков (Горин с хлыстом, Архи-Цензор Павел) — безжалостный карающий взгляд.
- **Испуганные (Frightened):** Лиды и разработчики перед крахом релиза под взором ИИ-Лорда — нервное напряжение, затравленный взгляд.
- **Обреченные (Doomed):** Рядовые послушники и жертвы нейрослопа — изможденность, тени под глазами, смирение с участью.

Общее правило лица:

```text
stern, sinister, frightened, or doomed grimdark expression depending on the role,
no smile, lowered brows, tense jaw, heavy serious eyes, severe atmospheric presence,
inspired by the harsh faces in the Chronicles of the Imperium layers,
but rendered as a real actor in an old sci-fi film.
```

Примеры суровых лиц и поз смотреть в:

- `Визуал/Слои_хроник_империума/05_Слой 5.png`
- `Визуал/Слои_хроник_империума/10_Слой 10.png`
- `Визуал/Слои_хроник_империума/15_Слой 15.png`
- `Визуал/Слои_хроник_империума/20_Слой 20.png`
- `Визуал/Слои_хроник_империума/40_Слой 41.png`

Слои хроник использовать только как референс позы, силуэта и суровости лица. Не копировать их как рисованный стиль.

Каждый персонаж обязан иметь собственную ваховскую особенность, связанную с ролью:

- у руководства и HoP: знаки должности, аугметические вокс-узлы, хронометры, печати, командные перчатки, элементы офицерской брони;
- у проектных лидов и геймдизайна: когитаторные линзы, тактические планшеты, свитки/скрижали правил, servo-caliper, броне-воротники Администратума/Механикус;
- у техлидов и разработчиков: мехадендриты, аугметические пальцы, диагностические окуляры, кабельные разъемы, теплообменники;
- у арт-крыла: wireframe-окуляры, стилусы-реликвии, спектральные линзы, следы мутаций нейрослопа.

Запрещено механически переиспользовать уже найденные элементы:

- не давать Горину ту же трубу/жезл, что у Толи;
- не делать Горина полностью черным, если это стирает его отличие от других командиров;
- не повторять один и тот же мостик/лабораторию/позу без новой роли и реквизита;
- не использовать солнечную систему/армиллярную сферу для Эдика, если она не раскрывает его как Зодчего игрового замысла;
- не заменять фантазию простой перестановкой чужих props.

Промптовая формула индивидуальности:

```text
add one original Warhammer-like role-specific feature that belongs only to this character,
such as a practical augmetic implant, a distinctive armor collar, a duty insignia,
or a single meaningful prop tied to their production role.
Do not reuse Tolya's baton, Pavel's exact mechanicus arms, or previous generic props.
Keep the detail density at the Tolya/Pavel golden-reference level.
```

Для Горина:

```text
not all black; use dark bottle-green, iron gray, oxblood lining, tarnished brass,
or Administratum khaki-black officer cloth.
He is the Supreme Overseer of the Conveyor, not a copy of the Lord-Commander:
give him a production-seal gauntlet, quota slate, deadline chronometer,
or command stamp instead of Tolya's baton/tube.
His face must be stern and brave, no smile.
```

Для Эдика:

```text
he is the Architect of Game Design / Magos Artifex, not a generic astronomer.
Avoid a solar system model.
Use a readable game-design reliquary instead: rule-tablet, balance cogitator slab,
servo-caliper, brass decision scale, or a single schematic altar.
Make his face more severe and analytical, no friendly smile.
```

Для следующих персонажей, особенно если нужно больше Warhammer/Imperium, держать баланс так:

```text
grim imperial 40k-like hierarchy and costume language,
but photographed as a 1978-1983 live-action sci-fi film set:
an actor in a practical costume, theatrical blocking, real props,
matte-painted background, miniature spacecraft, CRT monitors,
tungsten lamps, soft lens, film halation, muted old color stock.
Avoid modern game cinematic, ultra-sharp digital armor, hyper-detailed CGI corridors.
```

Для Горина в следующих попытках усилить:

```text
stern no-smile face, heavy-lidded command stare, actor-like posture,
strictly preserve Alexey Gorin's own face reference and do not blend him with Tolya,
returned peaked officer cap, dark bottle-green / iron-gray / oxblood costume accents,
electro-whip as the main readable prop: brass-and-bakelite handle, coiled cable lash,
restrained blue-green old optical-effects arcs, no Tolya baton/tube,
analog production command office with many CRT screens around him,
green/amber graphs, waveforms, quota curves and data plots on the screens,
visible studio set construction, 1970s space-opera film still, not a modern trailer frame.
```

## Главная формула стиля

Нужно просить не "retro concept art", а:

```text
authentic old science-fiction movie still from the 1970s-early 1980s,
live-action practical-effects scene shot on 35mm film,
real costume fabric, metal props, rubber joints, CRT monitors,
tungsten practical lighting, smoke, optical softness, film grain, halation,
Soviet sci-fi cinema, Mosfilm / Lenfilm style, analogue hardware,
not illustration, not painting, not comic art, not CGI
```

## Советская фантастика

Чтобы сдвинуть кадр в сторону советской фантастики, добавлять:

- `Soviet sci-fi cinema`
- `Mosfilm / Lenfilm soundstage`
- `Solaris-era institutional hardware`
- `1970s Soviet television studio lighting`
- `analog control panels, Bakelite switches, CRT green phosphor screens`
- `matte-painted windows, miniature model spaceships`
- `muted khaki, gray, oxidized brass, dark red fabric`
- `practical set, visible seams, imperfect prop realism`

## Вариант "Отроки во Вселенной"

Для более приключенческого советского sci-fi, когда персонаж не на мостике, а на чужой планете, использовать:

- `in the spirit of 1970s Soviet youth sci-fi adventure cinema`
- `alien planet soundstage, theatrical practical set`
- `painted cyclorama sky, artificial rock formations, colored mineral columns`
- `geometric alien structures, strange observatory props, landing capsule nearby`
- `soft optimistic Soviet expedition mood, less gothic, less militaristic`
- `matte-painted horizon, miniature spacecraft, practical foam and fiberglass scenery`
- `slightly naive but sincere 35mm film realism`

Запрещать для этого варианта:

```text
No gothic starship bridge, no imperial throne room, no grim cathedral, no dark horror corridor.
```

Если сюжет должен оставаться в космосе и на корабле, НЕ переносить персонажа на планету. В этом случае брать из "Отроков" только язык старого кино:

```text
keep the character aboard his own voidship / command deck,
grimdark warfleet hierarchy and gothic ship interior remain,
but use 1970s Soviet youth sci-fi production design: geometric set pieces,
painted panels, strange decorative columns, round CRTs, analog consoles,
matte-painted starfield windows, miniature spacecraft, 35mm film softness.
Do not move the scene to an alien planet.
```

## Запреты

Всегда явно запрещать:

```text
No illustration, no drawing, no painting, no brush strokes, no comic outlines,
no concept art poster, no modern CGI, no plastic 3D render,
no modern hologram UI, no neon cyberpunk, no modern game cinematic,
no ultra-sharp digital armor, no glossy cosplay promo photo,
no readable text, no logos unless requested.
```

Если нужен логотип на груди, лучше просить компактную эмблему, а не весь wordmark.

## ИИ-Лорд

ИИ-Лорд в этом направлении должен выглядеть не как идеальный CGI-робот и не как рисунок, а как человек в тяжелом костюме для съемок:

```text
looks like a human actor wearing a heavy practical robot monarch costume for an old sci-fi film,
painted fiberglass armor, rubber joints, fabric cape, visible costume seams,
studio wardrobe screen test, tungsten lamps, gray backdrop, 35mm film grain.
```

Но узнаваемое лицо ИИ-Лорда не менять: серую угловатую маску, красные глаза, корону, прямой суровый рот и боковые круглые диски нужно сохранять как идентичность персонажа. В музыкальных сценах гитару тоже держать близко к исходнику: темная красно-черная готическая бас-гитара с длинным грифом, изогнутым корпусом и латунной/золотой окантовкой.

Для исходного turnaround-листа ИИ-Лорда сохранять ракурсы:

```text
Preserve the original multi-angle character sheet composition and the same front, three-quarter, side and back poses.
```

## Playbox Chest Emblem

Стабильный референс логотипа:

`media/visual/generated/playbox_logo_chest_reference.png`

Для грудного знака использовать не надпись `Playbox`, а квадратную каменно-металлическую эмблему:

```text
replace the skull chest emblem with a compact metal Playbox chest badge based on the square icon from the logo reference,
use the skull-fragment square emblem only, do not place the large "Playbox" wordmark on the chest.
```

Крылатый вариант для командирских/флотских персонажей:

`media/visual/generated/playbox_winged_logo_chest_reference.png`

Текущий более точный референс крылатого знака:

`Визуал/Сгенерированные_картинки/playbox_skull_badge_gpt_v20_wings_equal_inner_margins.png`

Для Толи и других старших командиров использовать компактную нагрудную эмблему как костюмный реквизит:

```text
replace the chest insignia with a compact winged metal Playbox command badge based on the supplied winged logo reference,
use the central square skull-fragment icon with stylized metal wings as a small military breastplate emblem,
do not place the large "Playbox" wordmark on the uniform.
```

Для Горина тоже использовать крылатую версию знака как знак старшего командования/надзора:

```text
for Alexey Gorin and high command characters, use the winged Playbox command badge,
but use only the upper winged emblem as a compact metal chest prop;
never place the large "Playbox" wordmark on clothing.
```

## GPT API Команда

Использовать локальный ключ:

`F:\AI\GPT\.env`

Базовый запуск через CLI навыка:

```powershell
$line = Get-Content -LiteralPath 'F:\AI\GPT\.env' | Where-Object { $_ -match '^\s*OPENAI_API_KEY\s*=' } | Select-Object -First 1
$env:OPENAI_API_KEY = (($line -replace '^\s*OPENAI_API_KEY\s*=\s*','').Trim().Trim('"').Trim("'"))
python 'C:\Users\Shestirukiy\.codex\skills\.system\imagegen\scripts\image_gen.py' edit `
  --model gpt-image-2 `
  --image '<EDIT_TARGET>' `
  --image '<OPTIONAL_LOGO_OR_STYLE_REFERENCE>' `
  --prompt-file '<PROMPT_FILE>' `
  --size 1536x1024 `
  --quality high `
  --out 'H:\PLBX\CyberBullingConcept\media\visual\generated\<name>.png'
```

## Prompt Skeleton

```text
Edit the supplied character image into an authentic old Soviet science-fiction movie still from the 1970s-early 1980s.
Preserve the character identity, face, main pose, framing, role-specific costume and props.
Make it look like a live-action practical-effects scene shot on 35mm film:
real costume fabric, metal props, rubber or fiberglass prosthetics, analog Soviet control panels,
CRT green phosphor screens, tungsten practical lighting, smoke, optical softness, film grain, halation.
The character must read as a real actor inside a physical studio set, with slightly imperfect costume construction,
not as a modern CGI warrior or digital key art.
Push the atmosphere toward Mosfilm / Lenfilm Soviet sci-fi, Solaris-era institutional hardware,
muted khaki-gray-black palette, oxidized brass, dark red fabric.
No illustration, no drawing, no painting, no comic outlines, no CGI, no modern hologram UI,
no modern game cinematic, no ultra-sharp digital armor, no text, no watermark.
```

---

## 9. Формула Де-CGI (Как победить сиджишность и вернуть дух живого кино 70–80-х)

Если первичный кадр персонажа (v1) ощущается «слишком сиджишным» (глянцевый 3D-рендер, видеоигровой арт, неоновый концепт-арт), применяется канонический протокол исправления:

### 1. Двухэтапная мостиковая связка (`v1` + `Fin-эталон` через `edit`)
Никогда не перегенерировать вслепую текстовым запросом заново. Перевести генератор в режим `edit` (`image_gen.py edit` / `generate.py --engine openai`) и передать **два входных изображения**:
- `--image 1:` Базовый кадр `v1` (сохраняет позу, ракурс, анатомию лица, силуэт).
- `--image 2:` Утверждённый эталон живой кино-плёнки (например, `Fin/retro_soviet_film_pavel_playbox_logo_gpt_v4.png` или `Fin/retro_film_tolya_gpt_v2.png`). Это физически привязывает нейросеть к зерну Kodak, оптике и бутафории.

### 2. Принцип «Материальной подмены» (Materiality Substitution)
Слова «сделай как кино» не работают сами по себе. Нужно принудительно переписать цифровой хай-тек на осязаемый реквизит:
- ❌ *«Светящиеся кибер-кабели / неоновые нити»* ➔ ✅ **Реальные резиновые шланги, матерчатая оплётка, толстые аналоговые патчкорды, воткнутые в физические бакелитовые гнёзда**.
- ❌ *«Энергетический жезл / футуристический девайс»* ➔ ✅ **Сварные трубы из окисленной латуни, радиолампы (vacuum tubes) и миниатюрные лампочки накаливания с тёплой спиралью**.
- ❌ *«Идеальная броня / гладкий пластик»* ➔ ✅ **Грубое сукно, плотная шерсть, холст, видимые грубые швы и складки театрального костюма**.
- ❌ *«Голографический интерфейс»* ➔ ✅ **Выпуклые круглые CRT-экраны с зелёным люминофором, стрелочные вольтметры, тумблеры и рельефные металлические пластины**.

### 3. Оптическая мягкость вместо микро-резкости
- В промпте принудительно задавать: `authentic 35mm anamorphic film still, Mosfilm / Lenfilm soundstage, warm tungsten practical lighting, optical halation around glowing bulbs, atmospheric mineral-oil smoke, visible analog film grain`.
- Убирать цифровой микро-контраст и резкие световые обводки (rim lights) в пользу рассеянного павильонного света.

### 4. Обязательный Negative-блок (Стоп-слова)
```text
STRICT NEGATIVE: No digital CGI, no 3D render look, no video game cinematic, no floating neon holograms, no over-detailed micro-greebles, no plastic digital smoothness, no clean glossy surfaces, no modern superhero concept art, no comic book outlines.
```

---

## 10. Принцип визуального юмора: Заложник конвейера и материализация абсурда (The Deadpan Casual Hostage)

При создании сатирических и гротескных кадров персонажей конвейера (как в эталоне Жени-художника `retro_film_zhenya_artist_real_v5.png`):

1. **Буквализация сленга (The Literalized Metaphor):**
   Внутренние аббревиатуры и мемы из чатов материализуются в физические объекты реквизита. Например, аббревиатура военной стратегии *Call of War* (`COW`) материализуется в **живую мультяшную корову в стальной каске Второй мировой войны**, привязанную к операционному столу.
2. **Контраст милоты и мрачной хирургии:**
   Столкновение двух миров: принудительно жизнерадостная казуальная игра vs мрачные производственные будни. Художник выступает в роли холодного, невозмутимого цехового хирурга с настоящей ручной циркулярной пилой/скальпелем, насаждающего «казуальную улыбку».
3. **Взгляд заложника в камеру (The 4th-Wall Hostage Glance):**
   Жертва конвейера на столе не улыбается и не кривляется. Она в чистом, немом ужасе косит одним выразительным глазом **прямо в объектив камеры на зрителя**.
4. **Запрет на клоунские рожицы (Deadpan Delivery):**
   Юмор работает только при абсолютной серьёзности и кинематографичности окружения (35-мм плёнка, реалистичные человеческие руки, тяжелый капюшон, сценические инструменты). Карикатурные гримасы разрушают эффект; холодная собранность лица делает абсурд по-настоящему смешным.


