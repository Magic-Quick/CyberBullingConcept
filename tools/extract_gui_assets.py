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

# 1. Left Chassis
l0 = psd[0].composite()
l0.save(os.path.join(OUT_DIR, 'gui_chassis_left.png'))

# 2. Right Chassis
l5 = psd[5].composite()
l5.save(os.path.join(OUT_DIR, 'gui_chassis_right.png'))

# 3. Middle Chassis Tile (smooth slice of retro plastic)
l4 = psd[4].composite()
# Crop a 160px wide tile from Layer 4
mid_tile = l4.crop((100, 0, 260, l4.height))
mid_tile.save(os.path.join(OUT_DIR, 'gui_chassis_mid.png'))

# 4. Progress Slider Track
l8 = psd[8].composite()
l8.save(os.path.join(OUT_DIR, 'gui_slider_track.png'))

# 5. Timeline Scrubber Knob (Layer 9)
l9 = psd[9].composite()
l9.save(os.path.join(OUT_DIR, 'gui_knob_timeline.png'))

# 6. Volume Knobs
# Layer 22 (Voice, cyan tint or yellow), Layer 21 (Music), Layer 20 (SFX)
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

# 8. Copy existing pre-cut buttons (Pause, Prev, Next, Vol)
for btn_name in ['gui_btn_pause.png', 'gui_btn_prev.png', 'gui_btn_next.png', 'gui_btn_vol.png']:
    src = os.path.join(EXISTING_GUI, btn_name)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(OUT_DIR, btn_name))
        print(f'Copied {btn_name}')

# Create Play button variant from Pause button:
# A keycap with a play triangle instead of two pause bars
pause_im = Image.open(os.path.join(OUT_DIR, 'gui_btn_pause.png'))
play_im = pause_im.copy()
# Draw play triangle in center
draw = ImageDraw.Draw(play_im)
# Center of button is roughly (31, 30)
# Button size: 62 x 64
cx, cy = 31, 30
# Fill center area with keycap beige color before drawing triangle
draw.rectangle((cx - 12, cy - 12, cx + 12, cy + 12), fill=(150, 142, 124, 255))
draw.polygon([(cx - 7, cy - 9), (cx - 7, cy + 9), (cx + 8, cy)], fill=(28, 25, 20, 255))
play_im.save(os.path.join(OUT_DIR, 'gui_btn_play.png'))
print('Created gui_btn_play.png')

# 9. Extract all 9 LEDs from PSD
# LED layers sorted by x coordinate:
led_indices = [10, 12, 13, 14, 15, 16, 17, 11, 18]
for i, idx in enumerate(led_indices):
    led_img = psd[idx].composite()
    led_img.save(os.path.join(OUT_DIR, f'gui_led_{i+1}.png'))

# Also create a generic inactive (dim) LED
inactive_led = psd[12].composite() # Layer 12 is a dim gray LED
inactive_led.save(os.path.join(OUT_DIR, 'gui_led_dim.png'))

# Also copy existing colored LEDs
for led in ['gui_led_purple.png', 'gui_led_orange.png', 'gui_led_red.png', 'gui_led_yellow.png']:
    src = os.path.join(EXISTING_GUI, led)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(OUT_DIR, led))

print('All assets extracted to', OUT_DIR)
