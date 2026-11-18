"""Prepare reviewed identity crops from existing art; no AI, network or Fin writes."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'media/visual/generated/Gui/neutral-portraits'
MANIFEST = ROOT / 'media/interactive/chronicles/neutral-portraits.json'
QA = ROOT / 'scratch/chronicles-portrait-qa-20261118'

# Pixel rectangles were selected and reviewed against the full source frames.
# The black matte is a presentation frame, not a fabricated location.
PORTRAITS = {
    'danial': ('Даниал Искаков', 'web_assets/images/team/retro_film_danial_iskakov_sapper_v1.png', (410, 0, 1170, 570), 'Убраны мина, инструменты и руки до аналогии с минным полем.'),
    'egor': ('Егор Ткачёв', 'repo/src/assets/images/retro_horror_film_egor_mickey_vat_v14.webp', (590, 0, 1110, 700), 'Убраны силуэт Микки и стазис-колба до истории Disney/Mintegral.'),
    'nick': ('Ник Егоров', 'web_assets/images/team/retro_film_nick_egorov_speedrun_v3.png', (400, 40, 1040, 620), 'Убраны часы и экран TIME DILATION / SHIFT DEADLINE до хроно-реактора.'),
    'artem': ('Артём Хухро', 'web_assets/images/team/retro_film_artem_khukhro_guyver_gemini_v19.png', (240, 0, 680, 360), 'Убрана голограмма коровы до её первого упоминания в зале IV.'),
    'alexey-novice': ('Алексей (новенький)', 'web_assets/images/team/retro_film_alexey_novice_v4.png', (580, 10, 1160, 570), 'Убран планшет с надписью 2D PLAYABLE TASK до выдачи 2D-плейбака.'),
    'kristian': ('Кристиан', 'web_assets/images/team/retro_film_kristian_repository_guardian_v2.png', (240, 35, 760, 540), 'Убран церемониальный предмет в руках до оглашения кары.'),
    'kirill': ('Кирилл Берёзкин', 'web_assets/images/team/retro_film_kirill_beryozkin_v2.png', (450, 90, 1000, 600), 'Нейтральная идентификация вместо эшафота, решёток и предметов будущего приговора.'),
}

ASSIGNMENTS = [
    ('ROOM-I.L269', 'danial', [271]),
    ('ROOM-I.L312', 'egor', [314]),
    ('ROOM-IV.L979', 'egor', [980]),
    ('ROOM-II.L615', 'nick', [616]),
    ('ROOM-III.L772', 'artem', [773]),
    ('ROOM-IV.L974', 'artem', [975]),
    ('ROOM-II.L610', 'alexey-novice', [611]),
    ('VERDICT.L1355', 'alexey-novice', [1356]),
    ('ROOM-III.L764', 'kristian', [765]),
    ('VERDICT.L1316', 'kristian', [1317]),
    ('VERDICT.L1304', 'kirill-kristian-pair', [1306, 1307]),
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def matte(crop: Image.Image, size=(1280, 720)) -> Image.Image:
    canvas = Image.new('RGB', size, (5, 5, 8))
    crop = ImageOps.contain(crop, size, Image.Resampling.LANCZOS)
    canvas.paste(crop, ((size[0] - crop.width) // 2, (size[1] - crop.height) // 2))
    return canvas


def anchor(blocks: dict, uid: str, word: str) -> dict:
    text = blocks[uid]
    words = text.split()
    index = next(i for i, token in enumerate(words) if word.lower() in token.lower())
    return {'type': 'word', 'utteranceId': uid, 'wordIndex': index, 'edge': 'start', 'offset': 0}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    # Reading the project is allowed during voice generation; never write it here.
    project = (ROOT / 'repo/src/chronicles/default-project.md').read_text(encoding='utf-8')
    blocks = dict(re.findall(r'\[ГОЛОС ЛОРДА ([^\]]+)\]\n([\s\S]*?)\n\[КОНЕЦ РЕПЛИКИ\]', project.split('```chronicles-config\n')[0]))
    records, crops = {}, {}
    for pid, (name, relative, rectangle, note) in PORTRAITS.items():
        source = ROOT / relative
        image = Image.open(source).convert('RGB')
        if rectangle[0] < 0 or rectangle[1] < 0 or rectangle[2] > image.width or rectangle[3] > image.height:
            raise ValueError('Crop outside source: ' + pid)
        crop = image.crop(rectangle)
        crops[pid] = crop
        target = OUTPUT / (pid + '-neutral.webp')
        matte(crop).save(target, 'WEBP', quality=96, method=6)
        responsive = OUTPUT / (pid + '-identity.webp')
        crop.save(responsive, 'WEBP', quality=96, method=6)
        records[pid] = {'name': name, 'path': target.relative_to(ROOT).as_posix(), 'width': 1280, 'height': 720,
                        'sha256': sha(target), 'source': {'path': relative, 'sha256': sha(source),
                                                       'width': image.width, 'height': image.height},
                        'crop': list(rectangle), 'responsivePath': responsive.relative_to(ROOT).as_posix(), 'mode': 'face_and_shoulders_crop_black_matte', 'note': note}
    # The shared source frame presents both men on the future punishment deck.
    # Preserve two identities without inventing a new scene: two existing crops
    # laid side by side on a plain presentation matte.
    pair = Image.new('RGB', (1280, 720), (5, 5, 8))
    for i, pid in enumerate(('kirill', 'kristian')):
        pair.paste(matte(crops[pid], (640, 720)), (i * 640, 0))
    target = OUTPUT / 'kirill-kristian-neutral-pair.webp'
    pair.save(target, 'WEBP', quality=96, method=6)
    records['kirill-kristian-pair'] = {'name': 'Кирилл Берёзкин и Кристиан', 'path': target.relative_to(ROOT).as_posix(),
                                      'width': 1280, 'height': 720, 'sha256': sha(target),
                                      'sourcePortraitIds': ['kirill', 'kristian'], 'mode': 'two_existing_portraits_black_matte',
                                      'note': 'Не новое событие: два подлинных кадрированных портрета вместо преждевременных жезлов и решёток эшафота.'}
    reveals = {
        'danial': {'sceneId': 'ROOM-I', 'assetKey': 'retro_film_danial_iskakov_sapper_v1', 'allowedFrom': anchor(blocks, 'ROOM-I.P006', 'минное'), 'quote': 'Лететь на крейсере сквозь настоящее минное поле'},
        'egor': {'sceneId': 'ROOM-I', 'assetKey': 'retro_horror_film_egor_mickey_vat_v14', 'allowedFrom': anchor(blocks, 'ROOM-I.P018', 'Disney'), 'quote': 'мумифицированным таском Disney для сети Mintegral'},
        'nick': {'sceneId': 'ROOM-II', 'assetKey': 'retro_film_nick_egorov_speedrun_v3', 'allowedFrom': anchor(blocks, 'ROOM-II.P014', 'хроно-реактор'), 'quote': 'В тот же миг локальный хроно-реактор взвыл'},
        'artem': {'sceneId': 'ROOM-IV', 'assetKey': 'retro_film_artem_khukhro_guyver_gemini_v19', 'allowedFrom': anchor(blocks, 'ROOM-IV.P015', 'коровы'), 'quote': 'концепт летающей роботизированной коровы'},
        'alexey-novice': {'sceneId': 'ROOM-II', 'assetKey': 'retro_film_alexey_novice_v4', 'allowedFrom': anchor(blocks, 'ROOM-II.P008', '2D-плейбак'), 'quote': 'срочно выдать Новообращённому Послушнику Алексею 2D-плейбак'},
        'kristian': {'sceneId': 'VERDICT', 'assetKey': 'retro_film_kristian_repository_guardian_v2', 'allowedFrom': anchor(blocks, 'VERDICT.P008', 'жезл'), 'quote': 'двухметровый церемониальный жезл'},
        'kirill-kristian-pair': {'sceneId': 'VERDICT', 'assetKey': 'retro_film_tribunal_scaffold_kirill_kristian_v1', 'allowedFrom': anchor(blocks, 'VERDICT.P009', 'решёток'), 'quote': 'рифлёных металлических решёток нижней палубы'},
    }
    result = {'schemaVersion': 1, 'sourcePolicy': 'Reviewed existing art only. No generated faces, external services, source edits or Fin writes.',
              'rendering': '1280x720, contain on plain dark matte; keep the whole prepared frame visible during identity reveal',
              'sourceNameplatesReviewed': 27, 'portraitFiles': len(records), 'portraits': records,
              'frameOverrides': [{'frameClipId': frame, 'portraitId': pid, 'nameplateLines': lines} for frame, pid, lines in ASSIGNMENTS],
              'fullSourceAllowedFrom': reveals,
              'additionalReview': [{'nameplateLine': 679, 'name': 'Павел Самойленко', 'status': 'keep_medium_shot_do_not_zoom_eyes',
                                    'note': 'В существующем каноническом кадре виден механический монокль. Не усиливать его кропом/приближением до ответа ЧГК. Нейтральный реальный avatar_pavel существует, но замена канонического арта фотопортретом автоматически не выполнялась.'}]}
    MANIFEST.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
    sheet = Image.new('RGB', (1440, 1120), (18, 22, 31))
    draw = ImageDraw.Draw(sheet)
    for i, (pid, record) in enumerate(records.items()):
        x, y = i % 3 * 480, i // 3 * 370
        image = Image.open(ROOT / record['path']).convert('RGB')
        image.thumbnail((460, 300))
        sheet.paste(image, (x + 10, y + 8))
        draw.text((x + 10, y + 286), record['name'], font=font, fill='white')
        draw.text((x + 10, y + 320), pid, font=font, fill=(160, 190, 215))
    sheet.save(QA / 'neutral-crops-contact.jpg', quality=95)
    print(json.dumps({'reviewedCards': 27, 'files': len(records), 'frameOverrides': len(ASSIGNMENTS),
                      'manifest': MANIFEST.relative_to(ROOT).as_posix()}, ensure_ascii=False))


if __name__ == '__main__':
    main()
