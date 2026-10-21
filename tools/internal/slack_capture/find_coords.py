from PIL import Image
import numpy as np

img = Image.open(r"H:\PLBX\CyberBullingConcept\Скриншоты_Slack\01_Горин_Jnghfdbk.png")
print("Image size:", img.size)

# The card has a slightly lighter background than the main background #1a1d21
# Let's inspect rows around y=100 to y=300 and cols around x=200 to x=800
arr = np.array(img)

# Find coordinates where search result cards are drawn
# In the search result list, cards have a border or background
for y in range(100, 250, 10):
    for x in range(300, 700, 50):
        pixel = arr[y, x][:3]
        if not (pixel[0] == pixel[1] == pixel[2] and pixel[0] < 35):
            print(f"y={y}, x={x}: rgb={pixel}")
