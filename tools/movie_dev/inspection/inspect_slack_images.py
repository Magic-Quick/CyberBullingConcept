import os
from PIL import Image

slack_dir = 'repo/src/assets/slack'
for f in sorted(os.listdir(slack_dir)):
    if f.endswith('.png'):
        p = os.path.join(slack_dir, f)
        img = Image.open(p)
        print(f"{f:30} : {img.size}")
