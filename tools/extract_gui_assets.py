import os
import shutil
from PIL import Image, ImageDraw
from psd_tools import PSDImage

PSD_PATH = r'Визуал/Сгенерированные_картинки/Gui/ws96_interface_mockup2.psd'
EXISTING_GUI = r'Визуал/Сгенерированные_картинки/Gui'
OUT_DIR = r'repo/src/assets/images/gui'

os.makedirs(OUT_DIR, exist_ok=True)
psd = PSDImage.open(PSD_PATH)

print('Extracting from PSD...')

# 1. Left Chassis:
# Layer 0 is (33, 24, 874, 185) -> size (841, 161)
# NOTE: Layer 0 already has natural soft warm beige/brown button wells!
l0 = psd[0].composite() # RGBA

# Composite Layer 6 (LCD bezel and clean dark screen glass) at (607, 50)
# NOTE: DO NOT composite Layer 7 (baked digits) so the dial screen stays clean!
l6 = psd[6].composite()
l0.paste(l6, (607, 50), l6)
l0.save(os.path.join(OUT_DIR, 'gui_chassis_left.png'))
print('Saved gui_chassis_left.png with clean LCD screen and natural button sockets:', l0.size)

# 2. Right Chassis:
# Layer 5 is (1455, 24, 1801, 184) -> size (346, 160)
l5 = psd[5].composite()
# Composite Layer 19 sub 0 (the socket housing with 2 holes for CC & Mode!)
# Layer 19 sub 0 is at (1611, 72, 1738, 137) -> x=1611-1455=156, y=72-24=48
l19_sub0 = psd[19][0].composite()
l5.paste(l19_sub0, (156, 48), l19_sub0)
l5.save(os.path.join(OUT_DIR, 'gui_chassis_right.png'))
print('Saved gui_chassis_right.png with CC/Mode socket well:', l5.size)

# 3. Middle Chassis:
# Layer 4 is (874, 24, 1457, 185) -> size (583, 161)
l4 = psd[4].composite()
l4.save(os.path.join(OUT_DIR, 'gui_chassis_mid.png'))
print('Saved gui_chassis_mid.png (583x161 plate):', l4.size)

# 4. Progress Slider Track: 3-piece slice (fixed left cap, stretched mid, fixed right cap)
l8 = psd[8].composite() # (300, 39)
cap_left = l8.crop((0, 0, 25, 39))
cap_left.save(os.path.join(OUT_DIR, 'gui_track_cap_left.png'))
mid_track = l8.crop((25, 0, 275, 39))
mid_track.save(os.path.join(OUT_DIR, 'gui_track_mid.png'))
cap_right = l8.crop((275, 0, 300, 39))
cap_right.save(os.path.join(OUT_DIR, 'gui_track_cap_right.png'))
print('Saved 3-part timeline track (cap_left 25px, mid 250px, cap_right 25px)')

# 5. Timeline Scrubber Knob (Layer 9)
l9 = psd[9].composite()
l9.save(os.path.join(OUT_DIR, 'gui_knob_timeline.png'))

# 6. Volume Knobs
# Layer 22 (Voice), Layer 21 (Music), Layer 20 (SFX)
l22 = psd[22].composite()
l22.save(os.path.join(OUT_DIR, 'gui_knob_voice.png'))
l21 = psd[21].composite()
l21.save(os.path.join(OUT_DIR, 'gui_knob_music.png'))
l20 = psd[20].composite()
l20.save(os.path.join(OUT_DIR, 'gui_knob_sfx.png'))

# 7. CC and Mode Buttons
l19 = psd[19]
cc_btn = l19[1].composite()
cc_btn.save(os.path.join(OUT_DIR, 'gui_btn_cc.png'))
mode_btn = l19[2].composite()
mode_btn.save(os.path.join(OUT_DIR, 'gui_btn_mode.png'))

# 8. Extract authentic warm yellow/beige retro buttons from ws96_interface_mockup.psd
psd_orig = PSDImage.open(os.path.join(EXISTING_GUI, 'ws96_interface_mockup.psd'))
pause_orig = psd_orig[16].composite()
pause_orig.save(os.path.join(OUT_DIR, 'gui_btn_pause.png'))
prev_orig = psd_orig[17].composite()
prev_orig.save(os.path.join(OUT_DIR, 'gui_btn_prev.png'))
next_orig = psd_orig[18].composite()
next_orig.save(os.path.join(OUT_DIR, 'gui_btn_next.png'))
vol_orig = psd_orig[19].composite()
vol_orig.save(os.path.join(OUT_DIR, 'gui_btn_vol.png'))

# Create Play button variant in matching warm beige
play_im = pause_orig.copy()
draw = ImageDraw.Draw(play_im)
cx, cy = 31, 30
beige_col = pause_orig.getpixel((20, 20))
draw.rectangle((cx - 12, cy - 12, cx + 12, cy + 12), fill=beige_col)
draw.polygon([(cx - 7, cy - 9), (cx - 7, cy + 9), (cx + 8, cy)], fill=(28, 25, 20, 255))
play_im.save(os.path.join(OUT_DIR, 'gui_btn_play.png'))
print('Saved warm yellow/beige keycaps: Pause, Play, Prev, Next, Vol')

# 9. Extract all 9 LEDs from PSD
led_indices = [10, 12, 13, 14, 15, 16, 17, 11, 18]
for i, idx in enumerate(led_indices):
    led_img = psd[idx].composite()
    led_img.save(os.path.join(OUT_DIR, f'gui_led_{i+1}.png'))

# Generic inactive (dim) LED
inactive_led = psd[12].composite()
inactive_led.save(os.path.join(OUT_DIR, 'gui_led_dim.png'))

# Colored LEDs
for led in ['gui_led_purple.png', 'gui_led_orange.png', 'gui_led_red.png', 'gui_led_yellow.png']:
    src = os.path.join(EXISTING_GUI, led)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(OUT_DIR, led))

print('All assets extracted successfully to', OUT_DIR)
