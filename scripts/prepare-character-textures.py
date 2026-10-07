from pathlib import Path
from PIL import Image

source = Path(__file__).resolve().parents[1] / '.local/model-source'
for kind in ['body', 'head', 'opacity']:
    image = Image.open(source / f'm006_{kind}_color.tga').convert('RGBA')
    image.thumbnail((1024, 1024) if kind != 'opacity' else (512, 512))
    if kind == 'body':
        pixels = []
        for r, g, b, a in image.getdata():
            skin = r > g * 1.20 and g > b * 1.12 and r > 64
            pixels.append((r, g, b, a) if skin else (int(r * .40), int(g * .44), int(b * .50), a))
        image.putdata(pixels)
    image.save(source / f'{kind}.png')
    if kind != 'opacity':
        normal = Image.open(source / f'm006_{kind}_normal.tga').convert('RGB')
        normal.thumbnail((512, 512)); normal.save(source / f'{kind}-normal.png')
