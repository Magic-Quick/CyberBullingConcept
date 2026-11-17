"""Extract reusable quiz graphics from recorded online references.

PNG cutouts preserve source pixels; SVG companions are clean reconstructions.
No generated images or files in Fin are involved.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "media/interactive"
ITEMS = []
POLE_SOURCE = {
    "show":"pole_chudes",
    "page":"https://www.rbc.ru/life/news/67165b2b9a794783313534fa",
    "image":"https://s0.rbk.ru/v6_top_pics/media/img/0/36/347295061105360.webp",
    "local":"pole_chudes/references/yakubovich_blue_rbc.webp",
    "kind":"broadcast_still_yakubovich_classic_blue_tiles",
    "selected_on":"2026-11-16",
}


def save(image, show, name, kind, source=None, box=None, note=None):
    path = BASE / show / "graphics" / name
    image.save(path)
    ITEMS.append(dict(path=path.relative_to(BASE).as_posix(),kind=kind,source=source,crop_xyxy=box,size=list(image.size),note=note))


def svg(show,name,w,h,body):
    path=BASE/show/"graphics"/name
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>',encoding="utf8")
    ITEMS.append(dict(path=path.relative_to(BASE).as_posix(),kind="clean_vector_reconstruction",size=[w,h],note="Векторная реконструкция, не пиксельная вырезка из эфира."))


def isolated(source, box, points):
    image=source.crop(box).convert("RGBA")
    mask=Image.new("L",image.size)
    ImageDraw.Draw(mask).polygon(points,fill=255)
    image.putalpha(mask)
    return image


def erase_horizontal(image, box):
    """Interpolate each row between two clean pixels, retaining the border."""
    x0,y0,x1,y1=box
    for y in range(y0,y1):
        a=image.getpixel((x0-1,y));b=image.getpixel((x1,y))
        for x in range(x0,x1):
            t=(x-x0+1)/(x1-x0+1)
            image.putpixel((x,y),tuple(round(a[k]*(1-t)+b[k]*t) for k in range(3))+(255,))


def pole():
    source=Image.open(BASE/POLE_SOURCE["local"]).convert("RGBA")
    ref=POLE_SOURCE["local"]
    save(source.crop((94,684,748,762)),"pole_chudes","word_row_raw.png","screenshot_crop",ref,[94,684,748,762])
    tile=source.crop((260,686,337,759))
    # Classic blue on-air tile. Keep the captured silver frame, remove its surroundings.
    mask=Image.new("L",tile.size)
    ImageDraw.Draw(mask).polygon([(3,2),(74,2),(74,69),(3,69)],fill=255)
    tile.putalpha(mask)
    save(tile,"pole_chudes","tile_blank_cutout.png","screenshot_cutout",ref,[260,686,337,759],"Классическая синяя ячейка с серебристой рамкой, 77×73 px. Белая буква — отдельный слой.")
    save(tile.copy(),"pole_chudes","tile_closed.png","screenshot_cutout",ref,[260,686,337,759],"Закрытая буква остаётся синим квадратом без символа, как в эфирном табло.")
    step=tile.width+4
    for count in [6,10,14]:
        row=Image.new("RGBA",(count*step+4,tile.height+8))
        for i in range(count):row.alpha_composite(tile,(4+i*step,4))
        save(row,"pole_chudes",f"word_row_{count}_blank.png","assembled_screenshot_cutouts",ref,note="Прозрачный фон; слова и буквы в файл не запечены.")
    for name in ["tile_blank.svg","tile_closed.svg"]:
        svg("pole_chudes",name,160,160,'<defs><linearGradient id="silver" x2=".8" y2="1"><stop stop-color="#f7f9ff"/><stop offset=".4" stop-color="#c4cedb"/><stop offset=".65" stop-color="#738499"/><stop offset="1" stop-color="#edf4ff"/></linearGradient><linearGradient id="blue" x2="0" y2="1"><stop stop-color="#0032ae"/><stop offset=".2" stop-color="#0045eb"/><stop offset=".8" stop-color="#0039db"/><stop offset="1" stop-color="#002eb3"/></linearGradient></defs><rect x="3" y="3" width="154" height="154" fill="url(#silver)" stroke="#49576c" stroke-width="2"/><rect x="12" y="12" width="136" height="136" fill="url(#blue)" stroke="#11276f" stroke-width="4"/><path d="M6 154V6H154" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>')
    (BASE/"pole_chudes/graphics/layout.json").write_text(json.dumps({"tile_size":[77,73],"row_step":81,"text_color":"#ffffff","suggested_font":"Times New Roman","text_center":[38.5,36.5],"text_is_separate":True,"style":"yakubovich_classic_blue_silver","source":ref},ensure_ascii=False,indent=2),encoding="utf8")


def millionaire():
    source=Image.open(BASE/"millionaire/references/source_slide.jpg").convert("RGBA")
    ref="millionaire/references/source_slide.jpg"
    qbox=(143,378,879,463)
    qpts=[(2,41),(27,16),(49,3),(687,3),(710,18),(733,41),(710,66),(687,81),(49,81),(27,66)]
    raw=isolated(source,qbox,qpts)
    save(raw,"millionaire","question_raw.png","screenshot_cutout",ref,list(qbox))
    question=raw.copy();erase_horizontal(question,(41,19,144,60))
    save(question,"millionaire","question_blank_cutout.png","cleaned_screenshot_cutout",ref,list(qbox),"Удалено слово-заполнитель; рамка и градиент исходного кадра сохранены.")
    abox=(176,508,512,553)
    apts=[(2,22),(24,2),(312,2),(333,22),(312,43),(24,43)]
    answer=isolated(source,abox,apts)
    save(answer,"millionaire","answer_raw.png","screenshot_cutout",ref,list(abox))
    # Clean the label and placeholder inside the bevel, not the outer frame.
    erase_horizontal(answer,(29,8,150,34))
    save(answer,"millionaire","answer_blank_cutout.png","cleaned_screenshot_cutout",ref,list(abox))
    # Highlight masks preserve the screenshot's silver border.
    for state,color in [("selected",(194,120,20)),("correct",(31,122,65)),("wrong",(146,35,45))]:
        edited=answer.copy();mask=Image.new("L",answer.size)
        ImageDraw.Draw(mask).polygon([(10,22),(29,7),(307,7),(326,22),(307,37),(29,37)],fill=235)
        layer=Image.new("RGBA",answer.size,color+(255,));edited=Image.composite(layer,edited,mask);edited.putalpha(answer.getchannel("A"))
        save(edited,"millionaire",f"answer_{state}.png","edited_screenshot_cutout",ref,list(abox))
    overlay=Image.new("RGBA",(1024,200));overlay.alpha_composite(question,(143,0))
    for xy in [(176,88),(513,88),(176,136),(513,136)]:overlay.alpha_composite(answer,xy)
    save(overlay,"millionaire","quiz_overlay_blank.png","assembled_screenshot_cutouts",ref,note="Вопрос и четыре ответа, без текста. Координаты текстовых зон в layout.json.")
    defs='<defs><linearGradient id="fill" x2="0" y2="1"><stop stop-color="#22134b"/><stop offset=".5" stop-color="#080c30"/><stop offset="1" stop-color="#100822"/></linearGradient></defs>'
    svg("millionaire","question_blank.svg",1440,170,defs+'<path d="M4 85 60 23Q82 5 110 5H1330Q1355 5 1380 23L1436 85 1380 147Q1355 165 1330 165H110Q82 165 60 147Z" fill="url(#fill)" stroke="#c6cbd7" stroke-width="4"/>')
    for state,fill in [("blank","url(#fill)"),("selected","#ad6d12"),("correct","#16643d"),("wrong","#83232f")]:
        svg("millionaire",f"answer_{state}.svg",680,92,defs+f'<path d="M4 46 50 5H630L676 46 630 87H50Z" fill="{fill}" stroke="#aebad4" stroke-width="4"/>')
    layout={"canvas":[1024,200],"question":{"image":"question_blank_cutout.png","xy":[143,0],"text_rect":[199,20,622,45]},"answers":[{"key":key,"xy":[x,y],"text_rect":[x+30,y+9,270,27]} for key,x,y in [("A",176,88),("B",513,88),("C",176,136),("D",513,136)]],"text_is_separate":True,"preferred_text_color":"#ffffff","suggested_font":"Arial","note":"Все координаты text_rect: x,y,width,height. Для чёткого HD-интерфейса использовать SVG; для точного сходства исходные PNG."}
    (BASE/"millionaire/graphics/layout.json").write_text(json.dumps(layout,ensure_ascii=False,indent=2),encoding="utf8")


def chgk():
    source=Image.open(BASE/"chgk/references/source_photo.jpg").convert("RGB")
    w,h=source.size
    box=tuple(round(v*s) for v,s in zip((.26,.71,.77,.99),(w,h,w,h)))
    save(source.crop(box),"chgk","table_reference_crop.jpg","reference_crop","chgk/references/source_photo.jpg",list(box),"Историческое фото стола; только референс, не готовый таймер из эфира.")
    ticks=[]
    for i in range(60):
        a=math.radians(i*6-90);r=211 if i%5==0 else 221
        ticks.append(f'<path d="M{256+r*math.cos(a):.2f} {256+r*math.sin(a):.2f}L{256+235*math.cos(a):.2f} {256+235*math.sin(a):.2f}" stroke="#c3ac73" stroke-width="{4 if i%5==0 else 2}"/>')
    svg("chgk","timer_ring.svg",512,512,'<circle cx="256" cy="256" r="248" fill="#071b18" fill-opacity=".96" stroke="#baa26e" stroke-width="3"/>'+''.join(ticks)+'<circle cx="256" cy="256" r="193" fill="none" stroke="#6a6045" stroke-width="1"/>')
    svg("chgk","question_panel.svg",1440,540,'<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#0b2521"/><stop offset="1" stop-color="#040f10"/></linearGradient></defs><rect x="4" y="4" width="1432" height="532" rx="12" fill="url(#bg)" stroke="#b9a26e" stroke-width="3"/><path d="M40 58H1400M40 481H1400" stroke="#776947" stroke-width="1"/>')


def contact_sheet():
    sheet=Image.new("RGB",(1600,1010),"#0a0e17");d=ImageDraw.Draw(sheet)
    try:font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",28)
    except OSError:font=ImageFont.load_default()
    for show,x in [("pole_chudes",30),("millionaire",550),("chgk",1070)]:
        im=Image.open(BASE/show/"references/browser_screenshot.jpg").convert("RGB");im.thumbnail((500,320))
        sheet.paste(im,(x,70));d.text((x,25),{"pole_chudes":"Поле чудес","millionaire":"Миллионер","chgk":"Что? Где? Когда?"}[show],fill="white",font=font)
    d.text((30,410),"Вырезки из исходных кадров",fill="white",font=font)
    im=Image.open(BASE/"pole_chudes/graphics/word_row_10_blank.png");im.thumbnail((900,100));sheet.paste(im,(30,470),im)
    tile=Image.open(BASE/"pole_chudes/graphics/tile_blank_cutout.png")
    try:letter_font=ImageFont.truetype("C:/Windows/Fonts/times.ttf",46)
    except OSError:letter_font=font
    for i,ch in enumerate("ИНТЕРАКТИВ"):
        d.text((34+i*(tile.width+4)+tile.width/2,474+tile.height/2-1),ch,fill="white",font=letter_font,anchor="mm")
    q=Image.open(BASE/"millionaire/graphics/quiz_overlay_blank.png");sheet.paste(q,(30,610),q)
    d.text((235,635),"Текст вопроса",fill="white",font=font)
    for text,xy in [("A: Вариант ответа",(240,708)),("B: Вариант ответа",(578,708)),("C: Вариант ответа",(240,756)),("D: Вариант ответа",(578,756))]:
        d.text(xy,text,fill="white",font=font)
    d.text((1090,470),"ЧГК: отдельные сигналы",fill="#d4c18d",font=font)
    for i,t in enumerate(["Начало минуты","Предупреждение","Конец минуты","Гонг","Поле ввода ответа"]):d.text((1090,525+i*55),t,fill="#b7c2cf",font=font)
    d.text((30,915),"Пустые PNG • прозрачный фон • SVG для масштабирования • 146 аудиофайлов",fill="#a9b6ca",font=font)
    sheet.save(BASE/"preview.jpg",quality=93)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--show",choices=["all","pole_chudes"],default="all")
    args=parser.parse_args()
    if args.show=="pole_chudes":
        manifest=json.loads((BASE/"graphics_manifest.json").read_text(encoding="utf8"))
        pole()
        manifest["graphics"]=[item for item in manifest["graphics"] if not item["path"].startswith("pole_chudes/")]+ITEMS
        manifest["sources"]=[POLE_SOURCE if item["show"]=="pole_chudes" else item for item in manifest["sources"]]
        manifest["updated_on"]="2026-11-16"
        (BASE/"graphics_manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
        contact_sheet()
        print(f"Replaced {len(ITEMS)} Pole Chudes graphics with classic blue tiles")
        return
    pole();millionaire();chgk();contact_sheet()
    manifest={"schema_version":1,"relative_to":"media/interactive","graphics":ITEMS,"sources":[{"show":"pole_chudes","page":"https://tkgorod.ru/news/zhitel-ust-kuta-vyigral-avtomobil-na-pole-chudes-44572/","image":"https://tkgorod.ru/media/filer_public_thumbnails/filer_public/46/70/4670c277-20b4-4b53-95d1-c290d2c73364/sequence_01still001.jpg__1500x1500_q100_ALIAS-1500x1500_subsampling-2.jpg","local":"pole_chudes/references/source_frame.jpg","kind":"broadcast_still_republished_in_news"},{"show":"millionaire","page":"https://ppt-online.org/468684","image":"https://cf2.ppt-online.org/files2/slide/c/CN0GPAmrhltWUBxLOM9X83bqydKEYca1Sno2zJVuv4/slide-14.jpg","local":"millionaire/references/source_slide.jpg","kind":"third_party_presentation_template_using_broadcast_background"},{"show":"chgk","page":"https://rodina-history.ru/2025/09/04/50-let-nazad-vpervye-v-efir-vyshla-legendarnaia-peredacha-chto-gde-kogda.html","image":"https://cdnstatic.rg.ru/uploads/images/2025/09/03/ria_779554hr_2b4.jpg","local":"chgk/references/source_photo.jpg","kind":"historical_press_photo_not_a_game_interface"}],"rights_status":"Third-party references and derivatives: no reuse license verified. Clean SVG reconstructions and functional CHGK panels are project-authored."}
    manifest["sources"][0]=POLE_SOURCE
    (BASE/"graphics_manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
    print(f"Built {len(ITEMS)} graphics files and preview.jpg")


if __name__=="__main__":main()
