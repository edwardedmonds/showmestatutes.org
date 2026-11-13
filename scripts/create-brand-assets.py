"""Rebuild the small sharing/favicon assets with Pillow and Liberation fonts."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
font_root = Path('/usr/share/fonts')
def font(name, size):
    paths = list(font_root.rglob(name))
    if not paths:
        raise SystemExit(f'Install Liberation fonts to rebuild brand assets: {name}')
    return ImageFont.truetype(str(paths[0]), size)
paper, green, muted = '#f7f6f1', '#254e3e', '#617067'
canvas = Image.new('RGB', (1200, 630), paper)
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((60, 50, 122, 118), radius=8, fill=green)
draw.text((91, 80), '§', font=font('LiberationSerif-Regular.ttf', 57), fill=paper, anchor='mm')
draw.text((145, 62), 'Show Me Statutes', font=font('LiberationSans-Bold.ttf', 35), fill=green)
draw.line((60, 150, 1140, 150), fill='#d5ded4', width=2)
draw.text((60, 190), 'MISSOURI STATUTE SEARCH', font=font('LiberationSans-Bold.ttf', 24), fill=muted)
draw.text((60, 250), 'Know the topic?', font=font('LiberationSerif-Regular.ttf', 74), fill=green)
draw.text((60, 340), 'Find the section.', font=font('LiberationSerif-Italic.ttf', 74), fill=green)
draw.text((60, 480), 'Search headings. Read the official source.', font=font('LiberationSans-Regular.ttf', 31), fill=muted)
draw.text((60, 555), 'showmestatutes.org', font=font('LiberationSans-Regular.ttf', 25), fill=green)
canvas.save(root / 'static/social-card.png', optimize=True)
for size, name in [(96, 'favicon.png'), (180, 'apple-touch-icon.png')]:
    icon = Image.new('RGB', (size, size), green)
    pen = ImageDraw.Draw(icon)
    pen.text((size/2, size*.46), '§', font=font('LiberationSerif-Regular.ttf', round(size*.8)), fill=paper, anchor='mm')
    icon.save(root / 'static' / name, optimize=True)
