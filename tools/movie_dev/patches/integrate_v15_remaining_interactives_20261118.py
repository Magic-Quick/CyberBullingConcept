"""Integrate the reviewed I-02/I-05 proposal through the versioned Co-Writer API.

Stage first, inspect the generated diff, then apply. This never edits the movie.
"""
from pathlib import Path
import argparse
import difflib
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT / 'scratch/interactive-iv-v-20261118/integration'
WORK.mkdir(parents=True, exist_ok=True)
BRIDGE = 'F:/AI/AI_Control_Hub_Portable/AgentTools/hub.py'
PATHS = {
    'proposal': ROOT / 'scratch/interactive-iv-v-20261118/INTERACTIVE_IV_V_CLEAN.md',
    'v15': ROOT / 'docs/guardians_edition/VOICES_OF_PRODUCTION_V15_GUARDIANS.md',
    'v15_1': ROOT / 'docs/guardians_edition/VOICES_OF_PRODUCTION_V15_1_GUARDIANS.md',
}
VOICE = re.compile(r'^\[ГОЛОС ЛОРДА ([^\]\r\n]+)\]\n(.*?)\n\[КОНЕЦ РЕПЛИКИ\]', re.M | re.S)


def rpc(method, params=None):
    command = [sys.executable, '-X', 'utf8', BRIDGE]
    options = {'text': True, 'encoding': 'utf-8', 'capture_output': True, 'check': False}
    if params is None:
        command.append(method)
    else:
        command.extend(['--params-file', '-', method])
        options['input'] = json.dumps(params, ensure_ascii=True)
    process = subprocess.run(command, **options)
    payload = json.loads(process.stdout)
    if not payload.get('ok'):
        raise RuntimeError(json.dumps({'method': method, 'reply': payload}, ensure_ascii=False))
    return payload['result']


def open_document(path):
    status = rpc('cowriter.status')
    rpc('cowriter.open', {'path': str(path), 'expectedVersion': status['document']['version'], 'preserveDraft': True})


def read_document(path):
    open_document(path)
    rules = rpc('cowriter.rules.get')
    parts, versions, expected_start = [], set(), 1
    while True:
        reply = rpc('cowriter.read', {'startLine': expected_start, 'lineCount': 500})
        if Path(reply['document']['path']).resolve() != path.resolve():
            raise RuntimeError('The editor switched to another document during reading.')
        versions.add(reply['document']['version'])
        if reply['startLine'] != expected_start:
            raise RuntimeError('Non-contiguous editor snapshot.')
        parts.append(reply['text'])
        if not reply['hasMore']:
            break
        expected_start = reply['endLine'] + 1
    if len(versions) != 1:
        raise RuntimeError('The editor changed during reading; retry with a fresh snapshot.')
    text = '\n'.join(parts)
    metadata = reply['document']
    if hashlib.sha256(text.encode('utf-8')).hexdigest().upper() != metadata['contentHash']:
        raise RuntimeError('Reconstructed editor text failed its content hash.')
    if len(text.encode('utf-16-le')) // 2 != metadata['characters']:
        raise RuntimeError('Reconstructed editor text failed its character count.')
    return {'document': metadata, 'rules': rules, 'text': text}


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError(f'Expected one edit anchor, got {text.count(old)}: {old[:100]!r}')
    return text.replace(old, new, 1)


def game_block(text, game_id):
    pattern = re.compile(r'^\[НАЧАЛО ИНТЕРАКТИВА ' + re.escape(game_id) + r'\b.*?^\[КОНЕЦ ИНТЕРАКТИВА ' + re.escape(game_id) + r'\]', re.M | re.S)
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(f'Expected exactly one {game_id} block.')
    return matches[0].group()


def speech(text):
    return ' '.join(re.sub(r'\[[^\]]*\]', '', text).split())


def voices(text):
    result = {}
    for match in VOICE.finditer(text):
        if match[1] in result:
            raise RuntimeError(f'Duplicate voice ID: {match[1]}')
        result[match[1]] = speech(match[2])
    if len(result) != text.count('[КОНЕЦ РЕПЛИКИ]'):
        raise RuntimeError('Unbalanced or unrecognised voice blocks.')
    return result


def say(voice_id, body):
    return f'[ГОЛОС ЛОРДА {voice_id}]\n{body.strip()}\n[КОНЕЦ РЕПЛИКИ]'


def create_games(proposal, director):
    pvoices = {m[1]: m[2] for m in VOICE.finditer(proposal)}

    def clip(voice_id):
        return say(voice_id, pvoices[voice_id])

    def cue(line):
        return line + '\n' if director else ''

    story2 = pvoices['I-02.ИСТОРИЯ.2']
    story4 = pvoices['I-02.ИСТОРИЯ.4']
    story5 = pvoices['I-02.ИСТОРИЯ.5']
    account_story = pvoices['I-05.ИСТОРИЯ.1']
    if director:
        quote = '«капец, я уже полюбил этот тент, как родного брата»'
        story2 = replace_once(story2, quote + '.', '\n[СЛАК: 06_tent_brother | исходная цитата на её произнесении, после чистой экспозиции кадра]\n' + quote + '.\n[ЗАКРЫТЬ СЛАК]')
        story4 = replace_once(story4, 'под нож', '\n[КАДР: retro_film_eduard_danial_playable_autopsy_green_v6 | с первым упоминанием хирургического вмешательства; чистая экспозиция до следующей плашки]\n[ЗВУК: нагнетающий | trailer_reese_bass_distortion_hit | условие: I-02.ИСТОРИЯ.4, фраза «под нож»; один акцент, голос приоритетен]\nпод нож')
        story5 = replace_once(story5, '«Капец, был же нормальный плейбл»', '\n[ЭКРАН: подлинная цитата C9 «Капец, был же нормальный плейбл)» синхронно с речью. Если отдельный источник не подготовлен, держать портрет и штатные субтитры; не подставлять чужой скриншот.]\n«Капец, был же нормальный плейбл»')
        account_story = replace_once(account_story, 'реальных-то только два', '\n[ЭКРАН: «реальных-то только два»]\nреальных-то только два')
        account_story = replace_once(account_story, 'я вообще вот сижу без работы', '\n[ЭКРАН: «сижу без работы»]\nя вообще вот сижу без работы')

    i02 = [
        '[НАЧАЛО ИНТЕРАКТИВА I-02 | ФОРМАТ: КТО ХОЧЕТ СТАТЬ МИЛЛИОНЕРОМ]',
        '[ИНТЕРАКТИВ: I-02 | адаптация «Миллионера» | один выбор; все четыре пункта удалены | без бюджета ошибок]',
        '[СЛУЖЕБНО I-02: один концепт Househunt B1-C9, разные редакции и два раунда правок. A и B — связанные действия с тентом. C и D сначала предложил клиент. Исчезновение D установлено сравнением схем v2/v3, а не прямой цитатой «уберите слайдер». Не называть все пункты первоначальными механиками Эдика или результатом одного письма.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: ENTER_I-02; прежние каналы остановить; вход, контекст, вопрос и чтение вариантов без подложки]')
        + '[КАДР: ai_lord_throne_book_reading_narrator | Лорд без будущих предметов; чистая экспозиция три секунды при смене кадра]\n'
        + clip('I-02.ВХОД'),
        '[КАДР: retro_warhammer_eduard_levin_gpt_v3 | нейтральный портрет Эдика, без спойлерного фона]\n'
        '[РЕЖИССУРА: чистый портрет три секунды; имя и полный титул; дождаться чтения; затем контекст]\n'
        '[ПЕРСОНАЖ: Эдуард Левин | Зодчий Игрового Замысла | цвет: #06d6a0]\n'
        + clip('I-02.КОНТЕКСТ'),
        clip('I-02.ВОПРОС'),
        '[ЭКРАН I-02: четыре равноправных варианта. До выбора не показывать «Всё перечисленное», красные отметки удаления или готовую развязку. При использовании реального скриншота C9 скрыть итоговую схему упрощения и все подсказки к общему ответу; подготовленный путь не выдумывать. До подготовки такого кадра держать нейтральный портрет, не имитировать Slack.]',
        '[ВАРИАНТ A: Купить дом вслепую, под тентом]\n'
        '[ВАРИАНТ B: Снять тент свайпом]\n'
        '[ВАРИАНТ C: Выбрать покупку по открытой цене]\n'
        '[ВАРИАНТ D: Получить бонусы к стоимости после покупки]',
        clip('I-02.ВАРИАНТЫ'),
        cue('[ЗВУК: игровой | media/interactive/millionaire/audio/17_question_medium_q6-2000-clock.mp3 | условие: WAIT_I-02, после конца I-02.ВАРИАНТЫ; GAME_THINK по кругу 20%; без таймера проигрыша]')
        + '[ЖДАТЬ ОТВЕТА: одна кнопка, касание или A/B/C/D; Enter подтверждает вариант. Кнопки доступны после чтения вариантов. Отсутствие выбора не штрафуется и не раскрывает ответ.]',
        '[ПЕРВЫЙ ВЫБОР I-02: атомарно зафиксировать A/B/C/D, заблокировать повторные нажатия. Выбранная механика получает статус «Вырезано». Это верная часть ответа, а не ошибка игрока; ошибочный сигнал не подавать.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: I-02.ПЕРВЫЙ_ВЫБОР; GAME_THINK плавно остановить за 0.22 с; не запускать фанфару или сигнал ошибки]')
        + clip('I-02.ПЕРВЫЙ_ВЫБОР'),
        '[ЭКРАН I-02: после конца реплики по очереди отметить остальные три механики тем же статусом «Вырезано», затем итог «Всё перечисленное». Порядок соответствует монтажному времени; пауза замораживает подсветки.]',
        clip('I-02.РАСКРЫТИЕ'),
        '[УСЛОВИЯ I-02: любой первый выбор ведёт к одному раскрытию всех четырёх пунктов; ошибок и повторного ожидания нет. COMMON.ЛИМИТ здесь не используется. Двойной клик, удержание клавиши и Enter не создают вторую ветку.]',
        '[ПРОДОЛЖИТЬ I-02: после раскрытия и конца голоса доступна «К хроникам». Нажатие убирает поле и маскированный источник и запускает общую историю. При отсутствии аудио работают текстовые этапы и кнопка; ожидания несуществующей записи нет.]',
        '[УПРАВЛЕНИЕ I-02: штатные пауза, CC, громкость, перемотка и явный повтор; уход к другой главе закрывает все каналы игры. CC не скрывает вопрос и кнопки. Новый раунд только при новом просмотре или явном переходе по игровой метке.]',
        '[ОБЩЕЕ ПРОДОЛЖЕНИЕ I-02: история Househunt ниже; одна и та же после A/B/C/D. Все исходные факты доступны независимо от выбранной механики.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: RESUME_I-02; игровая подложка уже остановлена; история начинается без остаточного сигнала]')
        + clip('I-02.ИСТОРИЯ.1'),
        '[РЕЖИССУРА: тент допустим с первого произнесённого упоминания. Если подтверждённого кадра нет, сохранять портрет Эдика; не создавать ложное изображение исходного билда.]',
        say('I-02.ИСТОРИЯ.2', story2),
        clip('I-02.ИСТОРИЯ.3'),
        say('I-02.ИСТОРИЯ.4', story4),
        '[КАДР: retro_warhammer_eduard_levin_gpt_v3 | возвращение к Эдику перед исходной репликой]\n'
        + say('I-02.ИСТОРИЯ.5', story5),
        '[ДАЛЕЕ I-02: зал IV, без повторного эпизода Househunt в середине комнаты. Исходная экранная пунктуация цитаты сохраняется, знак реакции не озвучивать.]',
        '[КОНЕЦ ИНТЕРАКТИВА I-02]',
    ]

    i05 = [
        '[НАЧАЛО ИНТЕРАКТИВА I-05 | ФОРМАТ: ПОЛЕ ЧУДЕС]',
        '[ИНТЕРАКТИВ: I-05 | Поле чудес | ответ: ПУЛЗЫ | пять букв | лимит: три ошибки]',
        '[СЛУЖЕБНО I-05: принимать ПУЛЗЫ без учёта регистра и внешних пробелов. Требуется русское слово из расшифровки синка, без замены английским брендом или синонимом. Источник — встреча, не переписка Slack.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: ENTER_I-05; остановить прежние каналы; вход и вопрос без фоновой подложки]')
        + '[КАДР: ai_lord_throne_book_reading_narrator | нейтральный Лорд; три секунды чистой экспозиции при смене кадра]\n'
        + clip('I-05.ВХОД'),
        '[КАДР: retro_film_maksim_mamusin_android_coding_gemini_pro_v8 | нейтральный портрет Мамусина]\n'
        '[РЕЖИССУРА: чистый портрет → имя и полный титул → контекст; на повторном знакомом плане не повторять полную церемонию]\n'
        '[ПЕРСОНАЖ: Максим Мамусин | Палач Старого Стека | цвет: #48cae4]\n'
        + clip('I-05.КОНТЕКСТ'),
        clip('I-05.ВОПРОС'),
        '[ЭКРАН I-05: пять синих клеток, вопрос сохраняется при вводе и реакциях. Если показывается выдержка, это подлинная расшифровка производственного синка с подписью «Из производственного синка», без выдуманной даты и без имитации Slack. Скрыть «пулзы», «пулзов» и все повторы; маску держать до ухода в сюжет, не открывать по буквам.]',
        cue('[ЗВУК: игровой | media/interactive/pole_chudes/audio/02_think_60s_pole_cudes-60-seconds.mp3 | условие: WAIT_I-05, после конца вопроса; GAME_THINK по кругу 20%; под реакции 5%, затем 20% без перезапуска; таймера поражения нет]')
        + '[ЖДАТЬ ОТВЕТА: одна буква или слово целиком + Enter. Набор с выбранной ячейки; остальные введённые и открытые буквы сохраняются. Голос в ожидании молчит.]',
    ]
    bank = [(key, value) for key, value in pvoices.items()
            if key.startswith('I-05.') and not key.startswith(('I-05.ВХОД', 'I-05.КОНТЕКСТ', 'I-05.ВОПРОС', 'I-05.ВЕРНО', 'I-05.ИСТОРИЯ.'))]
    for voice_id, body in bank:
        tag = cue(f'[ЗВУК: приглушить | GAME_THINK | условие: {voice_id}; до 5% на время этой реакции, затем 20% с прежней позиции]')
        if director and (voice_id == 'I-05.БУКВА.ВЕРНО' or voice_id.startswith('I-05.БУКВА.ДРУГОЕ_МЕСТО.')):
            tag += f'[SFX: media/interactive/pole_chudes/audio/01_letter_correct_pole_letter_correct.mp3 | условие: {voice_id}; один раз, если буква не завершила слово]\n'
        elif director and voice_id.startswith('I-05.БУКВА.НЕВЕРНО.'):
            tag += f'[SFX: media/interactive/pole_chudes/audio/07_letter_wrong_pole_letter_wrong.mp3 | условие: {voice_id}; один раз до третьей ошибки]\n'
        elif director and voice_id.startswith('I-05.СЛОВО.НЕВЕРНО.'):
            tag += f'[SFX: media/interactive/pole_chudes/audio/22_word_wrong_nevernoe-slovo.mp3 | условие: {voice_id}; первые 1.2 с, fade 0.15 с; только до третьей ошибки]\n'
        i05.append(tag + say(voice_id, body))
    i05 += [
        '[ВЫБОР РЕАКЦИИ I-05: для каждого из девяти событий с тремя вариантами первая реплика случайна, затем круг без повтора подряд. За одно событие звучит одна реакция. Подсказки БУКВА/СЛОВО вызываются ведущим, а не каждым нажатием.]',
        '[ПРОВЕРКА I-05: новая неверная буква или неверное полное слово — одна ошибка. Верная буква, повтор, пустой, некорректный, незавершённый и слишком длинный ввод — без ошибки. Верные буквы не сбрасывают бюджет. На раунд — три ошибки. При нескольких технических проблемах выбрать одну реакцию. Частичный ввод сохраняется.]',
        '[ПРОВЕРКА I-05: верная буква открывается на всех своих местах. Для буквы в другом месте — отдельная реакция вместо обычной. Последняя правильная буква вызывает только ВЕРНО. На третьей ошибке — только COMMON.ЛИМИТ, без обычной реакции на ошибку.]',
        '[УПРАВЛЕНИЕ I-05: отправка блокируется на время реплики; удержание Enter не создаёт ещё одну попытку. Пауза, CC, громкость и навигация штатные. Уход по таймлайну закрывает игру со всеми звуками; явный повтор запускает новый раунд. Настройки сохраняются. При недоступном голосе остаются текст и управляемый переход, без зависания в ожидании аудио.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: I-05.ВЕРНО; GAME_THINK остановить за 0.22 с; фон не возвращается до общей истории]')
        + cue('[SFX: media/interactive/pole_chudes/audio/32_word_correct_pole_word_1996.mp3 | условие: I-05.ВЕРНО; один раз, максимум 1.5 с и fade 0.15 с, голос приоритетен]')
        + clip('I-05.ВЕРНО'),
        '[ПОБЕДА I-05: открыты П У Л З Ы; после конца реплики доступна «К хроникам», она запускает общую историю.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: EXHAUSTED_I-05; убрать GAME_THINK и сигналы до COMMON.ЛИМИТ; обычную реакцию не вызывать]')
        + '[ЛИМИТ I-05: один раз вызвать общий клип COMMON.ЛИМИТ из банка в конце документа, затем автоматически начать общую историю. Скрытые клетки на проигрыше не раскрывать; правильное слово прозвучит в сюжете.]',
        '[ОБЩЕЕ ПРОДОЛЖЕНИЕ I-05: перед любым исходом убрать поле и маскированную выдержку. История Мамусина полностью доступна и после победы, и после трёх ошибок.]',
        cue('[ЗВУК: тишина | ALL_MUSIC | условие: RESUME_I-05; игровые каналы закрыты; исходное объяснение Макса без фанфары]')
        + '[КАДР: retro_film_maksim_mamusin_android_coding_gemini_pro_v8 | знакомый портрет, без новых объектов]\n'
        + '[ЭКРАН: при входе известная из контекста подпись «В отчёте — 11», затем уточнения только на своих словах. Иллюстрация подлинной расшифровки, не имитация дашборда и не изменение данных.]\n'
        + say('I-05.ИСТОРИЯ.1', account_story),
        clip('I-05.ИСТОРИЯ.2'),
        '[ДАЛЕЕ I-05: без дополнительного объясняющего панчлайна — зал V, «Смотрим на итоговый радар месяца».]',
        '[КОНЕЦ ИНТЕРАКТИВА I-05]',
    ]
    clean = lambda parts: '\n'.join(line.rstrip() for line in '\n\n'.join(filter(None, parts)).split('\n'))
    return clean(i02), clean(i05)


def build_main(before, proposal, director):
    text = before
    edits = []

    def edit(old, new):
        nonlocal text
        if before.count(old) != 1:
            raise RuntimeError('An integration edit is not a unique original-text range.')
        text = replace_once(text, old, new)
        edits.append({'oldText': old, 'newText': new})
    old02 = game_block(before, 'I-02')
    context = next(m[2] for m in VOICE.finditer(old02) if m[1] == 'I-02.КОНТЕКСТ')
    continuation = next(m[2] for m in VOICE.finditer(old02) if m[1] == 'I-02.ОБЩЕЕ_ПРОДОЛЖЕНИЕ')
    if director:
        context = context.replace('условие: I-02.КОНТЕКСТ;', 'условие: ROOM-III.КАТАСТРОФА;')
        context = context.replace('остановить перед вопросом', 'остановить перед репликой Кристиана')
    restored = say('ROOM-III.КАТАСТРОФА', context)
    if director:
        restored += '\n\n[ЗВУК: тишина | ALL_MUSIC | условие: ROOM-III.КРИСТИАН; остановить сценические каналы, «oops» без музыкального комментария]\n'
        restored += '[КАДР: retro_film_kristian_repository_guardian_v2 | нейтральный портрет; чистый вход три секунды, затем имя и титул]\n'
        restored += '[ПЕРСОНАЖ: Кристиан | Хранитель Чистой Ветки | цвет: #06d6a0]\n'
    else:
        restored += '\n\n'
    restored += say('ROOM-III.КРИСТИАН', continuation)
    if director:
        restored += '\n\n[ЗВУК: фон | titan_forge | условие: ROOM_III_AFTER_CATASTROPHE; BASE мягко вернуть за 0.6 с, ниже речи; далее история артового отсека]'
    anchor = '\nПереходим в моторные цеха.\n'
    edit(anchor, anchor + '\n' + restored + '\n')

    start = text.index('🏷️ [ЭКРАН / ПЛАШКА КЛИЕНТА]: Zynga')
    end = text.index('🏷️ [ЭКРАН / ПЛАШКА КЛИЕНТА]: Supercell', start)
    removed_househunt = text[start:end]
    if 'Капец, был же нормальный плейбл' not in removed_househunt:
        raise RuntimeError('Househunt removal boundaries are wrong.')
    edit(removed_househunt, '')

    new02, new05 = create_games(proposal, director)
    edit(game_block(text, 'I-02'), new02)
    edit(game_block(text, 'I-05'), new05)

    old_common = '[СЛУЖЕБНО: следующая запись вызывается только третьей ошибкой «Миллионера» или «Поля чудес» (I-04, I-01, I-02, I-05). Для ЧГК I-03 не использовать. Записать один раз и переиспользовать.]'
    new_common = '[СЛУЖЕБНО: следующая запись вызывается только третьей ошибкой I-04, I-01 или I-05. В адаптации I-02 ошибок нет: любой выбор раскрывает все четыре пункта. Для ЧГК I-03 не использовать. Записать один раз и переиспользовать.]'
    edit(old_common, new_common)

    integration = '> **Интеграция от 18.11.2026:** I-02 — Househunt, один выбор с раскрытием всех четырёх исчезнувших игровых действий, без ошибок; I-05 — «Пулзы», пять букв и три ошибки. Первые три согласованные игры сохранены. История серверной катастрофы и «oops» возвращена в зал III; история Househunt целиком стоит после I-02, объяснение Мамусина — после I-05. Это текстовая интеграция, не подтверждение готовности озвучки или плеера.'
    status = next(line for line in text.splitlines() if line.startswith('> **Статус редакции '))
    if director:
        updated = status.replace('от 17.11.2026', 'от 18.11.2026')
        edit(status, updated + '\n' + integration)
    else:
        edit(status, status + '\n' + integration)
        montage = next(line for line in text.splitlines() if line.startswith('> **Для монтажа:**'))
        new_montage = '> **Для монтажа:** история звука сундука остаётся в I-04, эпизод Павла — в I-03. Контекст серверной катастрофы и «oops» возвращены в зал III. После I-02 звучит вся новая история Househunt с исходными цитатами про тент и нормальный плейбл; повтор из зала IV убран. После I-05 — расшифровка объяснения Мамусина про пулзы и отсутствие работы. До разгадок скрывать итог I-02 и слово «пулзы» со всеми словоформами. Источник I-05 — синк, не Slack. Остальные сюжетные фрагменты и три ранее согласованные игры сохранены.'
        edit(montage, new_montage)
    (WORK / ('edits_v15_1.json' if director else 'edits_v15.json')).write_text(json.dumps(edits, ensure_ascii=False, indent=2), encoding='utf-8')
    return text


def verify(before, after):
    results = {}
    for key in ('v15', 'v15_1'):
        old, new = before[key], after[key]
        for game_id in ('I-04', 'I-01', 'I-03'):
            if game_block(old, game_id) != game_block(new, game_id):
                raise RuntimeError(f'Protected game {game_id} changed in {key}.')
        for handoff in ('HANDOFF-01', 'HANDOFF-02', 'HANDOFF-03', 'HANDOFF-04', 'HANDOFF-05'):
            if voices(old)[handoff] != voices(new)[handoff]:
                raise RuntimeError(f'Host handoff {handoff} changed in {key}.')
        block02, block05 = game_block(new, 'I-02'), game_block(new, 'I-05')
        if any(x in block02 for x in ('[ЛИМИТ I-02:', 'I-02.ОШИБКА.', '[ВАРИАНТ C: oops]')):
            raise RuntimeError('Old fourth-game behavior survived.')
        if 'ответ ТЕНТ' in block05 or 'четыре буквы' in block05 or '4 букв' in block05:
            raise RuntimeError('Old fifth-game answer survived.')
        if new.count('не отвлекая его на работу') != 1:
            raise RuntimeError('The approved punchline must occur once in each master.')
        if voices(old)['COMMON.ЛИМИТ'] != voices(new)['COMMON.ЛИМИТ']:
            raise RuntimeError('The approved limit response changed.')
        for old_id, new_id in [('I-02.КОНТЕКСТ', 'ROOM-III.КАТАСТРОФА'), ('I-02.ОБЩЕЕ_ПРОДОЛЖЕНИЕ', 'ROOM-III.КРИСТИАН')]:
            if voices(old)[old_id] != voices(new)[new_id]:
                raise RuntimeError('The restored server episode changed its speech.')
        if new.index('[ГОЛОС ЛОРДА ROOM-III.КАТАСТРОФА]') > new.index('#### Перед залом IV:'):
            raise RuntimeError('The server story was not restored to room III.')
        story4 = new[new.index('### [ЗАЛ IV:'):new.index('#### Перед залом V:')]
        if 'Капец, был же нормальный плейбл' in story4:
            raise RuntimeError('Househunt is duplicated in room IV.')
        if new.count('[ГОЛОС ЛОРДА COMMON.ЛИМИТ]') != 1:
            raise RuntimeError('The common clip is duplicated.')
        ids = voices(new)
        results[key] = {'voiceBlocks': len(ids), 'protectedGamesUnchanged': ['I-04','I-01','I-03'],
                        'commonLimitUnchanged': True, 'restoredServerSpeechUnchanged': True}
    left, right = voices(after['v15']), voices(after['v15_1'])
    new_ids = [key for key in left if key.startswith(('I-02.', 'I-05.', 'ROOM-III.'))]
    mismatches = [key for key in new_ids if left[key] != right.get(key)]
    if mismatches:
        raise RuntimeError('New speech differs between author/director: ' + ', '.join(mismatches))
    baseline_left, baseline_right = voices(before['v15']), voices(before['v15_1'])
    baseline_mismatches = [key for key,value in baseline_left.items() if key not in baseline_right or value != baseline_right[key]]
    results['newVoiceParity'] = len(new_ids)
    results['preexistingVoiceMismatches'] = baseline_mismatches
    return results


def stage():
    snapshots = {}
    for key, path in PATHS.items():
        snapshot = read_document(path)
        snapshots[key] = snapshot
        (WORK / f'before_{key}.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
        (WORK / f'before_{key}.md').write_text(snapshot['text'], encoding='utf-8')
        print(json.dumps({'read': key, 'rulesHash': snapshot['rules'].get('hash'), 'rulesCharacters': len(snapshot['rules'].get('text', '')), 'version': snapshot['document']['version']}, ensure_ascii=False))
    before = {key: item['text'] for key,item in snapshots.items()}
    after = {key: build_main(before[key], before['proposal'], key == 'v15_1') for key in ('v15','v15_1')}
    verification = verify(before, after)
    for key, text in after.items():
        (WORK / f'after_{key}.md').write_text(text, encoding='utf-8')
        diff = ''.join(difflib.unified_diff(before[key].splitlines(True), text.splitlines(True), fromfile=f'before/{key}', tofile=f'after/{key}'))
        (WORK / f'{key}.diff').write_text(diff, encoding='utf-8')
    (WORK / 'verification.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(verification, ensure_ascii=False))


def apply():
    report = {}
    proposal_now = read_document(PATHS['proposal'])
    if proposal_now['text'] != (WORK / 'before_proposal.md').read_text(encoding='utf-8'):
        raise RuntimeError('The approved proposal changed since staging; restage before applying.')
    before = {key: (WORK / f'before_{key}.md').read_text(encoding='utf-8') for key in ('v15','v15_1')}
    after = {key: (WORK / f'after_{key}.md').read_text(encoding='utf-8') for key in ('v15','v15_1')}
    verify(before, after)
    for key in ('v15', 'v15_1'):
        current = read_document(PATHS[key])
        staged_snapshot = json.loads((WORK / f'before_{key}.json').read_text(encoding='utf-8'))
        if current['text'] != before[key] or current['rules'].get('hash') != staged_snapshot['rules'].get('hash'):
            raise RuntimeError(f'{key} changed since staging; no replacement applied to it.')
        edits = json.loads((WORK / f'edits_{key}.json').read_text(encoding='utf-8'))
        params = {'expectedVersion': current['document']['version'], 'edits': edits}
        rpc('cowriter.apply', dict(params, dryRun=True))
        changed = rpc('cowriter.apply', params)
        if changed.get('editorVerified') is not True:
            raise RuntimeError(f'{key} editor verification not confirmed; draft not saved.')
        saved = rpc('cowriter.save', {'expectedVersion': changed['document']['version']})
        if saved['document'].get('dirty') or saved['document'].get('diskState') != 'unchanged':
            raise RuntimeError(f'{key} did not save cleanly.')
        disk = PATHS[key].read_text(encoding='utf-8-sig')
        if disk != after[key]:
            raise RuntimeError(f'{key} saved text differs from reviewed plan.')
        report[key] = {'editorVerified': True, 'dirty': False, 'diskState': 'unchanged', 'version': saved['document']['version']}
        print(json.dumps({'saved': key, **report[key]}, ensure_ascii=False))
    (WORK / 'save_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


def collect_cues(text):
    cues = []
    for number, line in enumerate(text.splitlines(), 1):
        for match in re.finditer(r'\[(ЗВУК|SFX):\s*([^\]\n]+)\]', line):
            pieces = [value.strip() for value in match[2].split('|', 2)]
            if match[1] == 'SFX':
                kind, key = 'SFX', pieces[0]
                mix = ' | '.join(pieces[1:])
            else:
                kind, key = pieces[0], pieces[1]
                mix = pieces[2] if len(pieces) > 2 else ''
            cues.append({'line': number, 'kind': kind, 'key': key, 'condition_and_mix': mix})
    return cues


def support():
    before = {key: (WORK / f'before_{key}.md').read_text(encoding='utf-8') for key in ('v15','v15_1')}
    after = {key: PATHS[key].read_text(encoding='utf-8-sig') for key in ('v15','v15_1')}
    verification = verify(before, after)
    updates = {}

    def document(relative):
        path = ROOT / relative
        raw = path.read_bytes()
        return path, raw, raw.decode('utf-8-sig').replace('\r\n','\n')

    def put(path, raw, value):
        updates[path] = (raw, value)

    path, raw, text = document('docs/guardians_edition/INTERACTIVE_SCRIPT_STANDARD.md')
    text = text.replace('17.11.2026. Формат применён', '18.11.2026. Два последних вступления обновлены; формат применён', 1)
    text = text.replace('контрольное слово из переписки.', 'контрольное слово из рабочего источника: переписки Горина или производственного синка Мамусина.', 1)
    text = replace_once(text,
        'В «Миллионере» и «Поле чудес» правильный ответ или три ошибки закрывают проверку.',
        'В обычном «Миллионере» I-04 и буквенных играх I-01/I-05 правильный ответ или три ошибки закрывают проверку. В адаптации «Миллионера» I-02 любой первый выбор раскрывает все четыре удалённых действия; ошибок и COMMON.ЛИМИТ нет.')
    text = text.replace('В «Миллионере» и «Поле чудес» после третьей ошибки', 'В I-04, I-01 и I-05 после третьей ошибки', 1)
    text = text.replace('Оба исхода сохраняют нужные для сюжета факты.', 'Оба исхода игр с ошибками сохраняют нужные факты. В I-02 первый выбор → «Верно. Но вы пока вырезали слишком мало» → раскрытие всех четырёх пунктов → «К хроникам» → история Househunt.', 1)
    text = replace_once(text,
        '- Миллионер: четыре варианта, правильный отмечен служебно; у каждого неверного собственная реплика. Неверный вариант блокируется; повтор и отсутствие выбора не штрафуются. Отвлекающие ответы — игровые альтернативы, не реальные цитаты людей.',
        '- Миллионер I-04: четыре варианта, правильный отмечен служебно; у каждого неверного собственная реплика. Неверный вариант блокируется; повтор и отсутствие выбора не штрафуются. Отвлекающие ответы — игровые альтернативы, не реальные цитаты людей.\n- Миллионер I-02: четыре фактически исчезнувших игровых действия Househunt B1-C9 из разных редакций. Любой один пункт — верная часть общего ответа. После первого выбора все кнопки блокируются, звучит одна реакция и раскрываются остальные три. «Всё перечисленное» до выбора скрыто. Ошибки не начисляются; повторной попытки и общего финала трёх ошибок нет.')
    text = text.replace('Третья ошибка «Миллионера» или «Поля чудес» вызывает', 'Третья ошибка I-04, I-01 или I-05 вызывает', 1)
    old = 'В V15 перенесены история звука сундука в общее продолжение первой игры, контекст катастрофы и реакция Кристиана, эпизод Павла и реплика о детали Эдика; полные исходные цитаты сохранены.'
    new = 'В V15 история звука сундука остаётся после I-04, эпизод Павла — после I-03. История серверной катастрофы и «oops» возвращена в зал III. Вся история Househunt с тентом и исходными цитатами стоит после I-02; объяснение Мамусина про пулзы — после I-05. Четыре действия Househunt исчезли в два раунда правок; промежуточные покупку и бонусы предложил клиент. Не изображать их четырьмя первоначальными механиками, удалёнными одним письмом.'
    text = replace_once(text, old, new)
    text = replace_once(text,
        'в I-02 — «oops»; в I-05 — «тент» и сравнение с родным братом.',
        'в I-02 — итоговую схему упрощения и подсказки к «всё перечисленное»; в I-05 — «пулзы», «пулзов» и все повторы разгадки.')
    text = replace_once(text,
        'Для I-02 ещё требуется подготовить игровой кадр из реального треда Кирилла и Кристиана; имитацию переписки не подставлять.',
        'Для I-02 допустим только подготовленный реальный источник Househunt C9 с маской; путь не выдумывать. Источник I-05 — производственный синк: показывать подлинную расшифровку с маской слова, не имитировать Slack или новый дашборд.')
    text = replace_once(text,
        'Реакции второй игры «Поле чудес» адаптированы к слову из четырёх букв, без чужих упоминаний Горина и восьми клеток.',
        'Второе «Поле чудес» I-05 использует ПУЛЗЫ, пять клеток и полный банк реакций на ввод; текст связан с учётом загрузки Мамусина, без чужих упоминаний Горина или четырёхбуквенного ответа.')
    put(path, raw, text)

    path, raw, text = document('docs/guardians_edition/CHAPTER_HANDOFFS_TIMELINE.md')
    text = text.replace('17 ноября 2026 года.', '18 ноября 2026 года. I-02 и I-05 интегрированы в V15 и V15.1.', 1)
    text = text.replace('«Миллионер» и «Поле чудес» получают новый лимит из трёх ошибок.', 'I-04, I-01 и I-05 получают новый лимит из трёх ошибок.', 1)
    text = text.replace('5. Оба исхода сходятся в одной точке.', '5. В I-02 первый выбор раскрывает все четыре удалённые механики и ведёт к «К хроникам», без ошибок. В играх с победой и проигрышем оба исхода сходятся в одной точке.', 1)
    text = text.replace('«Миллионер»: реакция Кристиана', '«Миллионер»: механики Househunt и раскрытие всех четырёх пунктов', 1)
    text = text.replace('«Поле чудес»: сообщение Эдика', '«Поле чудес»: объяснение Мамусина про загрузку', 1)
    old = next(line for line in text.splitlines() if line.startswith('- В I-02 перед залом IV перенесён'))
    text = replace_once(text, old,
        '- I-02 перед залом IV: любой первый выбор A/B/C/D запускает «Верно. Но вы пока вырезали слишком мало», затем раскрытие всех четырёх исчезнувших действий. Ошибок нет. После «К хроникам» звучит вся история Househunt с исходными цитатами про тент и нормальный плейбл; повтор из зала IV убран. Серверная катастрофа и «oops» возвращены после «Переходим в моторные цеха» в зал III, с прежним произносимым текстом.')
    old = next(line for line in text.splitlines() if line.startswith('- Исходная фраза о детали Эдика перенесена'))
    text = replace_once(text, old,
        '- I-05 перед залом V: ответ ПУЛЗЫ, пять букв и три ошибки; одобренное «не отвлекая его на работу» сохранено. После любого исхода — исходное объяснение Макса про девять пулзов и два «реальных» плейбла, затем реплики про дайсы и «Не помню такого». Источник — синк, не Slack; маскировать все словоформы ответа. Тент и сравнение с братом теперь раскрываются в истории I-02.')
    put(path, raw, text)

    path, raw, text = document('docs/guardians_edition/APP_CHANGE_PLAN.md')
    text = replace_once(text,
        'Для I-02 получить исходный кадр реального треда с «oops».',
        'Для обновлённого I-02 подготовить источник Househunt C9; для I-05 использовать расшифровку синка с маской слова, не имитировать Slack.')
    text += '''\n\n## 12. Интеграция двух оставшихся вступлений — 18.11.2026\n\n- [x] Внести текущую механику I-02 Househunt и I-05 «Пулзы» в основные V15 и V15.1 через Co-Writer API с expectedVersion, editorVerified и отдельным сохранением.\n- [x] Сохранить первые три согласованные игры и все пять передач слова Толе без изменения речи.\n- [x] В I-02 заменить три ошибки одним выбором и раскрытием всех четырёх удалённых игровых действий. Учесть два раунда правок и клиентское происхождение промежуточной схемы.\n- [x] В I-05 указать ПУЛЗЫ, пять клеток, три ошибки и полный банк реакций; сохранить «не отвлекая его на работу».\n- [x] Вернуть серверную катастрофу и «oops» в зал III с прежней речью, убрать повтор Househunt из зала IV; историю тента включить в I-02, объяснение Мамусина — в I-05.\n- [x] Сверить 107 речевых блоков V15/V15.1; COMMON.ЛИМИТ записан один раз и вызывается только I-04/I-01/I-05.\n- [x] Обновить сценарный стандарт, таймлайн и производные музыкальные ведомости.\n- [ ] Озвучить новые реплики и собрать эти состояния в плеере. Интеграция в сценарий не означает внедрение игрового кода.\n'''
    put(path, raw, text)

    path, raw, text = document('docs/guardians_edition/EDITORIAL_RULES.md')
    old = 'В «Миллионере» и «Поле чудес» три ошибки вызывают согласованную общую реплику, затем автоматическое продолжение; правильный ответ — реакцию и кнопку «К хроникам».'
    new = 'В обычном «Миллионере» I-04 и буквенных I-01/I-05 три ошибки вызывают согласованную общую реплику, затем автоматическое продолжение; правильный ответ — реакцию и кнопку «К хроникам». Уточнение от 18.11.2026: в адаптации I-02 Househunt любой первый выбор раскрывает все четыре исчезнувших игровых действия; ошибок и COMMON.ЛИМИТ в ней нет.'
    text = replace_once(text, old, new)
    text += '''\n\n### Интегрированная редакция двух последних игр — 18.11.2026\n\nI-02 и I-05 внесены в V15/V15.1. История Househunt относится к одному C9, но к нескольким редакциям и двум раундам клиентских правок; не подменять игровые действия задачами разработчика. Источник I-05 — расшифровка синка, а не переписка: не рисовать ложный Slack. Одобренный пользователем оборот «не отвлекая его на работу» сохраняется дословно; рецепт записан в §7 проектного каталога юмора. Первые три игры и общий проигрышный клип сохранены.\n'''
    put(path, raw, text)

    cues = collect_cues(after['v15_1'])
    cue_path, cue_raw, cue_old = document('data/director/v15_1_music_cues.json')
    old_parsed = collect_cues(before['v15_1'])
    old_records = json.loads(cue_old)['cues']
    if old_parsed != old_records:
        raise RuntimeError('Cue parser does not reproduce the previous machine-readable ledger.')
    missing = [item['key'] for item in cues if item['key'].startswith('media/') and not (ROOT / item['key']).is_file()]
    if missing:
        raise RuntimeError('Missing music/SFX files: ' + ', '.join(sorted(set(missing))))
    put(cue_path, cue_raw, json.dumps({'source': PATHS['v15_1'].name, 'cues': cues}, ensure_ascii=False, indent=2) + '\n')

    path, raw, text = document('docs/guardians_edition/V15_1_MUSIC_CUE_SHEET.md')
    header = '''# Музыкальная партитура V15.1\n\n18.11.2026. Пересчитано из режиссёрских меток интегрированной V15.1. Это карта постановочных входов, не монтаж по секундам. Все 107 речевых блоков совпадают с V15; фон и сигналы привязаны к событиям.\n\n## Пять игровых пауз\n\n| Перед залом | Формат | Ожидание ответа | Выход |\n| --- | --- | --- | --- |\n| I | Миллионер I-04 | millionaire/audio/03_question_bed_q1-5-bed-2008.mp3, петля | Победа или третья ошибка, затем история сундука |\n| II | Поле чудес I-01 | pole_chudes/audio/02_think_60s_pole_cudes-60-seconds.mp3, петля | Разгадка или третья ошибка |\n| III | ЧГК I-03 | chgk/audio/32_minute_start_chgk2_sig1.mp3 один раз, затем тишина | Один ответ, выбранный вердикт, раскрытие при ошибке и история |\n| IV | Миллионер I-02 / Househunt | millionaire/audio/17_question_medium_q6-2000-clock.mp3, петля после чтения вариантов | На первом выборе остановить; раскрытие всех четырёх механик без сигнала ошибки; «К хроникам» |\n| V | Поле чудес I-05 / Пулзы | pole_chudes/audio/02_think_60s_pole_cudes-60-seconds.mp3, петля | Разгадка или третья ошибка; затем объяснение Мамусина |\n\nПеред словом Толи и подводками — тишина. Под реакциями I-05 игровая петля приглушается без перезапуска; на финале прекращается. COMMON.ЛИМИТ — только для I-04/I-01/I-05, без музыки. I-02 не использует проигрышные сигналы. Серверный DREAD и сухое «oops» снова принадлежат залу III; хирургический акцент Househunt — только после раскрытия I-02, на фразе «под нож».\n\n## Все cue по сценарию\n\n'''
    header += f'{len(cues)} входов, остановок и сигналов. Пути media/… отсчитываются от корня проекта; короткие ключи — существующие микшеры и CUE_NORMALIZATION_MAP. Условные ветки не проигрывать подряд.\n\n'
    header += '| Строка V15.1 | Тип | Ключ / файл | Условие и микс |\n| --- | --- | --- | --- |\n'
    for item in cues:
        mix = item['condition_and_mix'].replace('|', '\\|').replace('\n',' ')
        header += f"| [строка {item['line']}](H:/PLBX/CyberBullingConcept/docs/guardians_edition/VOICES_OF_PRODUCTION_V15_1_GUARDIANS.md:{item['line']}) | {item['kind']} | `{item['key']}` | {mix} |\n"
    put(path, raw, header)

    path, raw, text = document('AI_MAP.md')
    old_row = next(line for line in text.splitlines() if line.startswith('| 📝 **Чистовой проект двух оставшихся игр, 18.11**'))
    new_row = '| 📝 **Две оставшиеся игры интегрированы, 18.11** | `docs/guardians_edition/VOICES_OF_PRODUCTION_V15_GUARDIANS.md` и `VOICES_OF_PRODUCTION_V15_1_GUARDIANS.md` | Перед IV — Househunt: один выбор, раскрытие всех четырёх удалённых действий, без ошибок. Перед V — ПУЛЗЫ: пять букв, три ошибки, полный банк реакций. Первые три игры сохранены; история 22 ГБ/«oops» возвращена в III, Househunt — после I-02. Сверка источников: `scratch/interactive-iv-v-20261118/HOUSEHUNT_MECHANICS_RESEARCH.md`. Проект `INTERACTIVE_IV_V_CLEAN.md` в той же папке — архивный снимок, не параллельный мастер. Плеер отдельно. |'
    text = replace_once(text, old_row, new_row)
    text = text.replace('все 103 речевых блока V15', 'все 107 речевых блоков V15')
    text = text.replace('Все 165 музыкальных/SFX cue', f'Все {len(cues)} музыкальных/SFX cue')
    text = text.replace('Все варианты и словоформы берутся из V15', 'Все варианты и словоформы берутся из V15')
    put(path, raw, text)

    # All transformations have been checked before any supporting document is written.
    for path, (original, updated) in updates.items():
        if path.read_bytes() != original:
            raise RuntimeError(f'Supporting document changed concurrently: {path.name}')
    saved = []
    for path, (original, updated) in updates.items():
        relative = path.relative_to(ROOT)
        backup = WORK / 'support_before' / relative
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(original)
        if b'\r\n' in original:
            updated = updated.replace('\n', '\r\n')
        encoded = updated.encode('utf-8')
        if original.startswith(b'\xef\xbb\xbf'):
            encoded = b'\xef\xbb\xbf' + encoded
        path.write_bytes(encoded)
        saved.append(str(relative))
    report = {'supportingDocuments': saved, 'musicCues': len(cues), 'verifiedSpeech': verification}
    (WORK / 'support_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


def archive():
    if not (WORK / 'support_report.json').is_file():
        raise RuntimeError('Canonical scripts and supporting documents must be saved first.')
    proposal = read_document(PATHS['proposal'])
    old_status = next(line for line in proposal['text'].splitlines() if line.startswith('**Статус:**'))
    new_status = '**Статус:** интегрировано 18.11.2026 в [V15](../../docs/guardians_edition/VOICES_OF_PRODUCTION_V15_GUARDIANS.md) и [V15.1](../../docs/guardians_edition/VOICES_OF_PRODUCTION_V15_1_GUARDIANS.md). Этот файл — архивный снимок согласованного проекта; последующие правки вносить в основные сценарии. Озвучка и плеер — отдельный этап.'
    old_tail = proposal['text'][proposal['text'].index('## Монтаж при последующем внесении в основной сценарий'):]
    new_tail = '''## Интеграция в основные сценарии выполнена\n\n18.11.2026 оба вступления и все реакции перенесены в V15 и V15.1 через Co-Writer с проверкой версии, editorVerified и отдельным сохранением.\n\n- Первые три игры и пять передач слова сохранены без изменения речи.\n- Серверная катастрофа и «oops» возвращены в зал III с прежним текстом.\n- История Househunt целиком следует за I-02; повтор из зала IV убран.\n- Объяснение Мамусина следует за I-05 перед залом V; награждение остаётся после него.\n- В основных сценариях один общий проигрышный клип, только для I-04/I-01/I-05.\n- Сверены 107 речевых блоков V15/V15.1, обновлены стандарт, таймлайн и музыкальные ведомости.\n\nАктуальные источники — основные сценарии; этот файл далее не поддерживать как параллельную редакцию. Проверки и сохранения: папка `integration/` рядом с этим файлом.\n'''
    edits = [{'oldText': old_status, 'newText': new_status}, {'oldText': old_tail, 'newText': new_tail}]
    changed = rpc('cowriter.apply', {'expectedVersion': proposal['document']['version'], 'edits': edits})
    if changed.get('editorVerified') is not True:
        raise RuntimeError('Archival note was not verified in the editor.')
    saved = rpc('cowriter.save', {'expectedVersion': changed['document']['version']})
    if saved['document'].get('dirty') or saved['document'].get('diskState') != 'unchanged':
        raise RuntimeError('Archival note did not save cleanly.')
    open_document(PATHS['v15_1'])
    final = rpc('cowriter.status')
    print(json.dumps({'archiveSaved': True, 'open': final['document']['path'], 'dirty': final['document']['dirty'], 'diskState': final['document']['diskState']}, ensure_ascii=False))


def finalize():
    key = 'v15_1'
    current = read_document(PATHS[key])
    planned_path = WORK / f'after_{key}.md'
    if current['text'] != planned_path.read_text(encoding='utf-8'):
        raise RuntimeError('The director text changed since integration; do not overwrite concurrent edits.')
    edits = []
    expected = current['text']
    for game_id in ('I-02','I-05'):
        old = game_block(current['text'], game_id)
        new = '\n'.join(line.rstrip() for line in old.split('\n'))
        if old != new:
            edits.append({'oldText': old, 'newText': new})
            expected = replace_once(expected, old, new)
    if edits:
        changed = rpc('cowriter.apply', {'expectedVersion': current['document']['version'], 'edits': edits})
        if changed.get('editorVerified') is not True:
            raise RuntimeError('Final formatting was not verified in the editor.')
        saved = rpc('cowriter.save', {'expectedVersion': changed['document']['version']})
        if saved['document'].get('dirty') or saved['document'].get('diskState') != 'unchanged':
            raise RuntimeError('Final formatting did not save cleanly.')
        if PATHS[key].read_text(encoding='utf-8-sig') != expected:
            raise RuntimeError('Final disk text differs from the saved editor text.')
        planned_path.write_text(expected, encoding='utf-8')
    print(json.dumps({'finalFormattingSaved': True, 'newGameBlocksOnly': True, 'protectedGamesUntouched': True}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['stage','apply','support','archive','finalize'])
    args = parser.parse_args()
    if args.mode == 'stage':
        stage()
    elif args.mode == 'apply':
        apply()
    elif args.mode == 'support':
        support()
    elif args.mode == 'archive':
        archive()
    else:
        finalize()
