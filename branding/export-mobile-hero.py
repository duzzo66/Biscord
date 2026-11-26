# Python / branding/export-mobile-hero.py / Pillow / export generated responsive hero formats
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
brand = root / 'branding'
image = Image.open(brand / 'hero-mobile-vulcord.png').convert('RGBA')
folder = 'assets/cdn.prod.website-files.com/6257adef93867e50d84d30e2/'
rows = json.loads((brand / 'overrides.json').read_text())
for suffix in ['', '-p-500']:
    file = folder + '6abec3265ca23899daf402b3_Hero-mobile2%20(1)' + suffix + '.webp'
    size = Image.open(root / file).size
    target = brand / 'overrides' / file
    target.parent.mkdir(parents=True, exist_ok=True)
    image.resize(size, Image.Resampling.LANCZOS).save(target, 'WEBP', quality=95, method=6)
    rows = [row for row in rows if row['file'] != file]
    rows.append({'file': file, 'size': list(size), 'animated': False, 'pose': 'branded-mobile-home-hero'})
for name, size in [('hero-mobile-vulcord-v2.webp', (1344, 1090)), ('hero-mobile-vulcord-v2-500.webp', (500, 406))]:
    image.resize(size, Image.Resampling.LANCZOS).save(brand / 'assets' / name, 'WEBP', quality=95, method=6)
(brand / 'overrides.json').write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')
print('Exported both original mobile paths and two versioned responsive fox assets.')
