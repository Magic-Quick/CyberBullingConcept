"""Prepare authenticated, spoiler-safe game contexts without external generation.

All image derivatives go to media/visual/generated/Gui, never to Fin. Screenshot
geometry is pinned to checked source hashes so a changed source needs review.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'media/visual/generated/Gui/interactive-context'
MANIFEST = ROOT / 'media/interactive/chronicles/context-assets.json'
PINNED = {
    'demoblil': ('repo/src/assets/slack/02_demoblil.webp', 'f40c311c51c21abad4a88449c991f5ebfe62f132121cb4bdfbc6209cf20029f5'),
    'egg': ('media/slack_screenshots/backup/13_chest_egg_sound.png', '42b3dd2ebcedd68580b154218a7076b7c66e5f41abd4635342798c343584a453'),
    'claude': ('media/slack_screenshots/backup/04_claude_banned.png', 'a3059c253ece8d09db69a66f8ab15c8fdbf9ac1af305c929e342046ba6dd1be8'),
    'eduard': ('web_assets/images/team/retro_warhammer_eduard_levin_gpt_v3.png', 'ef9e4234cb8a7f9db2953271670fbfe7e83a40486e28e2c8a912f2b8c4f97800'),
}
TRANSCRIPT = ROOT / 'docs/research_facts/facts_2026-09-25_meetings.md'


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_image(name: str) -> tuple[Image.Image, dict]:
    relative, expected = PINNED[name]
    path = ROOT / relative
    actual = digest(path)
    if actual != expected:
        raise ValueError(f'{relative}: source changed; review crop and masks before preparing contexts')
    return Image.open(path).convert('RGB'), {'path': relative, 'sha256': actual}


def censor(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Blur the text area, then cover every source glyph with opaque pixels."""
    x0, y0, x1, y1 = box
    outer = (max(0, x0), max(0, y0), min(image.width, x1), min(image.height, y1))
    image.paste(image.crop(outer).filter(ImageFilter.GaussianBlur(10)), outer)
    draw = ImageDraw.Draw(image)
    draw.rectangle((x0, y0, x1 - 1, y1 - 1), fill=(52, 57, 68))


def save(image: Image.Image, name: str, metadata: dict) -> dict:
    target = (OUT / name).resolve()
    if not target.is_relative_to(OUT.resolve()) or any(p.casefold() == 'fin' for p in target.parts):
        raise ValueError('Refusing image output outside the designated Gui directory')
    image.save(target, 'WEBP', lossless=True, method=6)
    return {'pending': False, 'path': target.relative_to(ROOT).as_posix(), 'width': image.width, 'height': image.height,
            'sha256': digest(target), **metadata}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [Path('C:/Windows/Fonts') / ('arialbd.ttf' if bold else 'arial.ttf'),
                  Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')]
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    raise RuntimeError('A Cyrillic-capable Arial or DejaVu font is required')


def transcript_card() -> tuple[Image.Image, dict]:
    lines = TRANSCRIPT.read_text(encoding='utf-8-sig').splitlines()
    line_number, source = next((i + 1, line) for i, line in enumerate(lines)
                               if line.startswith('- Макс: «Это пулзы всё зарегалось,'))
    match = re.search(r'^- Макс: «([^»]+)»', source)
    assert match is not None
    quote = match.group(1)
    answers = list(re.finditer(r'\bпулз[а-яё]*\b', quote, re.IGNORECASE))
    if len(answers) != 2:
        raise ValueError('Transcript wording changed; review every answer occurrence')
    image = Image.new('RGB', (1600, 610), '#151a23')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((1, 1, 1598, 608), radius=20, outline='#3c4557', width=2)
    draw.rectangle((54, 54, 62, 107), fill='#a4b4cd')
    draw.text((84, 52), 'Из производственного синка', font=font(38, True), fill='#eef1f6')
    draw.text((84, 130), 'Макс:', font=font(30, True), fill='#bcc8da')
    body_font = font(37)
    max_width, start_x, line_height, y = 1420, 84, 64, 198
    tokens = ('«' + quote + '»').split(' ')
    wrapped, current = [], []
    for token in tokens:
        candidate = ' '.join(current + [token])
        if current and draw.textlength(candidate, font=body_font) > max_width:
            wrapped.append(' '.join(current)); current = [token]
        else:
            current.append(token)
    if current:
        wrapped.append(' '.join(current))
    masks = []
    for line in wrapped:
        draw.text((start_x, y), line, font=body_font, fill='#e2e6ee')
        for word in re.finditer(r'\bпулз[а-яё]*\b', line, re.IGNORECASE):
            left = int(start_x + draw.textlength(line[:word.start()], font=body_font)) - 5
            right = int(start_x + draw.textlength(line[:word.end()], font=body_font)) + 6
            # Arial glyph bounds have an ascender offset; cover the full line box.
            masks.append((left, y - 1, right, y + 48))
        y += line_height
    if y > 540:
        raise ValueError('Transcript excerpt no longer fits; review layout')
    for box in masks:
        censor(image, box)
    draw = ImageDraw.Draw(image)
    draw.text((84, 552), 'Фрагмент расшифровки', font=font(24), fill='#8e9aae')
    return image, {'kind': 'transcript', 'source': {'path': TRANSCRIPT.relative_to(ROOT).as_posix(),
            'line': line_number, 'sha256': digest(TRANSCRIPT),
            'excerptSha256': hashlib.sha256(quote.encode('utf-8')).hexdigest()},
            'sourceLabel': 'Из производственного синка', 'masks': [list(box) for box in masks],
            'maskMode': 'baked_blur_and_opaque', 'maskedOccurrences': len(masks),
            'note': 'Подлинная речь Макса; все формы ответа скрыты. Даты и Slack-интерфейс не добавлялись.'}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    games = {}

    image, source = source_image('demoblil')
    if image.size != (960, 178):
        raise ValueError('Unexpected Gorin screenshot dimensions')
    masks = [(175, 117, 319, 157)]
    for box in masks:
        censor(image, box)
    games['I-01'] = save(image, 'i01-context.webp', {'kind': 'slack', 'source': source,
        'crop': [0, 0, 960, 178], 'masks': [list(box) for box in masks], 'maskMode': 'baked_blur_and_opaque',
        'note': 'Подлинная просьба Горина; слово-разгадка целиком закрыто, автор и допустимый контекст сохранены.'})

    image, source = source_image('egg')
    crop = (0, 274, 1600, 446)
    image = image.crop(crop)
    masks = [(924, 116, 1010, 160)]
    for box in masks:
        censor(image, box)
    games['I-04'] = save(image, 'i04-context.webp', {'kind': 'slack', 'source': source,
        'crop': list(crop), 'masks': [list(box) for box in masks], 'maskMode': 'baked_blur_and_opaque',
        'note': 'Только реальное сообщение Эдика с требуемой просьбой; предыдущие сообщения с разгадкой исключены.'})

    image, source = source_image('claude')
    crop = (0, 18, 1600, 146)
    image = image.crop(crop)
    games['I-03'] = save(image, 'i03-context.webp', {'kind': 'slack', 'source': source,
        'crop': list(crop), 'masks': [], 'maskMode': 'answer_reply_excluded_by_crop',
        'note': 'Показан только подлинный первый блок о блокировке. Позднейший ответ Павла и соседние реплики целиком за пределами кадра.'})

    image, source = source_image('eduard')
    crop = (200, 0, 1110, 700)
    image = image.crop(crop)
    games['I-02'] = save(image, 'i02-context.webp', {'kind': 'portrait', 'source': source,
        'crop': list(crop), 'masks': [], 'fallback': True,
        'note': 'Предусмотренный сценарием нейтральный портрет Эдика: без домов, тента и вивисекции. Подготовленный подлинный игровой скриншот C9 пока отсутствует; переписка не выдумывается.'})

    image, metadata = transcript_card()
    games['I-05'] = save(image, 'i05-context.webp', metadata)

    output = {'schemaVersion': 1, 'sourcePolicy': 'Local verified sources only; no external API or generated correspondence',
              'generatedBy': 'tools/chronicles/prepare_context_images.py', 'games': games}
    MANIFEST.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for key, entry in sorted(games.items()):
        print(key, entry['path'], f"{entry['width']}x{entry['height']}")


if __name__ == '__main__':
    main()
