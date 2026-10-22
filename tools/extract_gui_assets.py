import os
import shutil
import numpy as np
from PIL import Image, ImageDraw
from psd_tools import PSDImage

PSD_PATH = r'Визуал/generated/Gui/ws96_interface_mockup3.psd'
EXISTING_GUI = r'Визуал/generated/Gui'
OUT_DIR = r'repo/src/assets/images/gui'

os.makedirs(OUT_DIR, exist_ok=True)
psd = PSDImage.open(PSD_PATH)

print('Loaded PSD:', PSD_PATH, 'Size:', psd.size)

# Extract Layer 25 (Levels adjustment layer) and its mask
levels_layer = psd[25]
mask = np.array(levels_layer.mask.topil())
mask_ox, mask_oy = 18, -2
opacity_weight = 156.0 / 255.0  # Layer 25 opacity is 156

def apply_levels_adjustment(img, bbox):
    """
    Applies the exact Photoshop Levels adjustment (Layer 25: gamma 0.67, output ceiling 172)
    weighted by the layer's mask and opacity at the image's canvas coordinates bbox (x1, y1, x2, y2).
    """
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]
    x1, y1 = bbox[0], bbox[1]

    # Grid of canvas coordinates
    u = np.arange(w)
    v = np.arange(h)
    uu, vv = np.meshgrid(u, v)
    cx = x1 + uu
    cy = y1 + vv

    # Mask coordinates
    mx = np.clip(cx - mask_ox, 0, mask.shape[1] - 1)
    my = np.clip(cy - mask_oy, 0, mask.shape[0] - 1)

    m_val = mask[my, mx, np.newaxis]  # (h, w, 1)
    weight = opacity_weight * (m_val / 255.0)

    rgb = arr[:, :, :3]
    v_norm = rgb / 255.0
    v_gamma = np.power(v_norm, 1.0 / 0.67)
    adj_rgb = v_gamma * 172.0

    arr[:, :, :3] = np.clip((1.0 - weight) * rgb + weight * adj_rgb, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))

print('Extracting layers with Levels adjustment applied (excluding lightbulbs/LEDs)...')

# 1. Left Chassis:
# Layer 1 is (33, 24, 874, 185) -> size (841, 161)
l1 = psd[1].composite()
# Layer 0 is the 4-button socket well at (92, 75) -> relative x = 92-33=59, y = 75-24=51
l0 = psd[0].composite()
l1.paste(l0, (59, 51), l0)
# Layer 11 is the LCD bezel and clean dark emerald screen glass at (640, 74) -> relative x = 607, y = 50
l11 = psd[11].composite()
l1.paste(l11, (607, 50), l11)
# Apply Levels adjustment
chassis_left = apply_levels_adjustment(l1, psd[1].bbox)
chassis_left.save(os.path.join(OUT_DIR, 'gui_chassis_left.png'))
print('Saved gui_chassis_left.png with 4-button socket and clean LCD screen:', chassis_left.size)

# 2. Right Chassis:
# Layer 10 is (1455, 24, 1801, 184) -> size (346, 160)
l10 = psd[10].composite()
# Layer 21 sub 0 is the CC/Mode socket at (1611, 72) -> relative x = 1611-1455=156, y = 72-24=48
l21_sub0 = psd[21][0].composite()
l10.paste(l21_sub0, (156, 48), l21_sub0)
# Ensure the socket well under CC & Mode buttons is solid deep pitch-black (#080a0c)
draw_r = ImageDraw.Draw(l10)
draw_r.rounded_rectangle((158, 50, 281, 110), radius=5, fill=(8, 10, 12, 255))
chassis_right = apply_levels_adjustment(l10, psd[10].bbox)
chassis_right.save(os.path.join(OUT_DIR, 'gui_chassis_right.png'))
print('Saved gui_chassis_right.png with pure pitch-black socket well:', chassis_right.size)

# 3. Middle Chassis:
# Layer 9 is (874, 24, 1457, 185) -> size (583, 161)
l9 = psd[9].composite()
chassis_mid = apply_levels_adjustment(l9, psd[9].bbox)
chassis_mid.save(os.path.join(OUT_DIR, 'gui_chassis_mid.png'))
print('Saved gui_chassis_mid.png (583x161 plate):', chassis_mid.size)

# 4. Progress Slider Track: 3-piece slice (fixed left cap, stretched mid, fixed right cap)
# Layer 13 is (831, 86, 1131, 125) -> size (300, 39)
l13 = psd[13].composite()
track_adjusted = apply_levels_adjustment(l13, psd[13].bbox)
cap_left = track_adjusted.crop((0, 0, 25, 39))
cap_left.save(os.path.join(OUT_DIR, 'gui_track_cap_left.png'))
mid_track = track_adjusted.crop((25, 0, 275, 39))
mid_track.save(os.path.join(OUT_DIR, 'gui_track_mid.png'))
cap_right = track_adjusted.crop((275, 0, 300, 39))
cap_right.save(os.path.join(OUT_DIR, 'gui_track_cap_right.png'))
print('Saved 3-part timeline track (cap_left 25px, mid 250px, cap_right 25px)')

# 5. Timeline Scrubber Knob (Layer 14)
l14 = psd[14].composite()
knob_timeline = apply_levels_adjustment(l14, psd[14].bbox)
knob_timeline.save(os.path.join(OUT_DIR, 'gui_knob_timeline.png'))
print('Saved gui_knob_timeline.png:', knob_timeline.size)

# 6. Volume Knobs
# Layer 24 (Voice), Layer 23 (Music), Layer 22 (SFX)
l24 = psd[24].composite()
knob_voice = apply_levels_adjustment(l24, psd[24].bbox)
knob_voice.save(os.path.join(OUT_DIR, 'gui_knob_voice.png'))

l23 = psd[23].composite()
knob_music = apply_levels_adjustment(l23, psd[23].bbox)
knob_music.save(os.path.join(OUT_DIR, 'gui_knob_music.png'))

l22 = psd[22].composite()
knob_sfx = apply_levels_adjustment(l22, psd[22].bbox)
knob_sfx.save(os.path.join(OUT_DIR, 'gui_knob_sfx.png'))
print('Saved volume knobs: Voice, Music, SFX')

# 7. CC and Mode Buttons
cc_raw = psd[21][1].composite()
btn_cc = apply_levels_adjustment(cc_raw, psd[21][1].bbox)
btn_cc.save(os.path.join(OUT_DIR, 'gui_btn_cc.png'))

mode_raw = psd[21][2].composite()
btn_mode = apply_levels_adjustment(mode_raw, psd[21][2].bbox)
btn_mode.save(os.path.join(OUT_DIR, 'gui_btn_mode.png'))
print('Saved CC and Mode buttons')

# 8. Left Buttons sliced directly from mockup3
# Layer 5 is Play/Pause base keycap (92, 78, 154, 136) -> size (62, 58)
# Layer 7 is Pause icon '||' (106, 94, 126, 117) -> relative (14, 16)
# Layer 8 is Play icon '>' (113, 93, 129, 116) -> relative (21, 15)
l5 = psd[5].composite()
l7 = psd[7].composite()
l8 = psd[8].composite()
l4 = psd[4].composite()  # Prev button (154, 78, 216, 136) -> size (62, 58)
l3 = psd[3].composite()  # Next button (216, 78, 277, 136) -> size (61, 58)
l2 = psd[2].composite()  # Vol button (277, 78, 339, 136) -> size (62, 58)

# Composite Pause keycap
pause_im = l5.copy()
pause_im.paste(l7, (14, 16), l7)
btn_pause = apply_levels_adjustment(pause_im, psd[5].bbox)
btn_pause.save(os.path.join(OUT_DIR, 'gui_btn_pause.png'))

# Composite Play keycap
play_im = l5.copy()
play_im.paste(l8, (21, 15), l8)
btn_play = apply_levels_adjustment(play_im, psd[5].bbox)
btn_play.save(os.path.join(OUT_DIR, 'gui_btn_play.png'))

# Prev, Next, Vol keycaps
btn_prev = apply_levels_adjustment(l4, psd[4].bbox)
btn_prev.save(os.path.join(OUT_DIR, 'gui_btn_prev.png'))

btn_next = apply_levels_adjustment(l3, psd[3].bbox)
btn_next.save(os.path.join(OUT_DIR, 'gui_btn_next.png'))

btn_vol = apply_levels_adjustment(l2, psd[2].bbox)
btn_vol.save(os.path.join(OUT_DIR, 'gui_btn_vol.png'))
print('Saved authentic sliced buttons from mockup3: Pause, Play, Prev, Next, Vol')

# 9. Lightbulbs / LEDs: EXCLUDED from Levels adjustment as requested!
# Lamps remain in their natural glowing colors
print('Lightbulbs/LEDs preserved without Levels adjustment (as requested)')

print('All assets extracted successfully to', OUT_DIR)
