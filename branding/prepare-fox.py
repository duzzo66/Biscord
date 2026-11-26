# Python / branding/prepare-fox.py / Python 3 + Pillow / Biscord mascot exports
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, math, hashlib

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / 'branding'
OUT = BRAND / 'assets'
OUT.mkdir(exist_ok=True)

def cell(sheet, columns, rows, index):
    w, h = sheet.size
    col, row = index % columns, index // columns
    frame = sheet.crop((round(col*w/columns), round(row*h/rows), round((col+1)*w/columns), round((row+1)*h/rows))).convert('RGBA')
    alpha = frame.getchannel('A').point(lambda v: 0 if v < 8 else min(255, round(v*255/253)))
    frame.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError('Empty fox frame')
    return frame.crop(bbox)

wave_sheet = Image.open(BRAND / 'fox-wave-sheet.png')
pose_sheet = Image.open(BRAND / 'fox-poses-sheet.png')
wave = [cell(wave_sheet, 4, 2, i) for i in range(8)]
poses = {name: cell(pose_sheet, 3, 2, i) for i, name in enumerate(['sit','left','right','run','party','gaming'])}

def fitted(fox, size, padding=.06):
    canvas = Image.new('RGBA', size)
    fox = fox.copy()
    fox.thumbnail((max(1,round(size[0]*(1-padding*2))), max(1,round(size[1]*(1-padding*2)))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(fox, ((size[0]-fox.width)//2, size[1]-round(size[1]*padding)-fox.height))
    return canvas

for name, pose in poses.items():
    fitted(pose, (512,512)).save(OUT / ('fox-'+name+'.png'))
frames = [fitted(x,(384,384)) for x in wave]
frames[0].save(OUT/'fox-wave.webp',save_all=True,append_images=frames[1:],duration=[300,120,120,120,180,120,120,450],loop=0,lossless=True)
def gif_frames(images):
    converted=[]
    for frame in images:
        q=frame.convert('RGB').quantize(colors=255)
        q=q.point(lambda p:p+1)
        q.putpalette([0,0,0]+q.getpalette()[:765])
        q.paste(0,mask=frame.getchannel('A').point(lambda v:255 if v<100 else 0))
        converted.append(q)
    return converted
gif=gif_frames(frames)
gif[0].save(OUT/'fox-wave.gif',save_all=True,append_images=gif[1:],duration=[300,120,120,120,180,120,120,450],loop=0,disposal=2,transparency=0,optimize=False)
fitted(wave[0],(512,512)).save(OUT/'fox.png')
overrides = json.loads((BRAND/'overrides.json').read_text()) if (BRAND/'overrides.json').exists() else []

def export(source, pose, animated=False, decoration=False, role=False):
    source_path = ROOT / source.replace('\\','/')
    if not source_path.is_file():
        return
    with Image.open(source_path) as original:
        size, fmt = original.size, original.format
        original_animated = getattr(original, 'is_animated', False)
    target = BRAND / 'overrides' / source.replace('\\','/')
    target.parent.mkdir(parents=True,exist_ok=True)
    def compose(fox):
        if 'wumpus-pl' in source.lower():
            feet=fitted(poses['sit'],(512,512)).crop((145,394,353,486))
            feet.thumbnail((150,42),Image.Resampling.LANCZOS)
            im=Image.new('RGBA',size)
            im.alpha_composite(feet,((size[0]-feet.width)//2,size[1]-feet.height))
            return im
        if decoration:
            im=Image.new('RGBA',size)
            tiny=fitted(fox,(max(1,round(size[0]*.32)),max(1,round(size[1]*.32))),.01)
            im.alpha_composite(tiny,(0,0))
            return im
        if role:
            im=Image.new('RGBA',size)
            tiny=fitted(fox,(round(size[0]*.34),round(size[1]*.8)))
            im.alpha_composite(tiny,(round(size[0]*.03),round(size[1]*.1)))
            draw=ImageDraw.Draw(im)
            font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',max(12,round(size[0]*.13)))
            draw.text((size[0]*.39,size[1]*.36),'vulcord',font=font,fill='#f36bd5',stroke_width=0)
            return im
        if 'shadow' in source.lower():
            im=Image.new('RGBA',size)
            ImageDraw.Draw(im).ellipse((size[0]*.15,size[1]*.4,size[0]*.85,size[1]*.75),fill=(20,10,40,60))
            return im.filter(ImageFilter.GaussianBlur(max(1,size[1]*.06)))
        return fitted(fox,size)
    animated = animated or original_animated
    result = [compose(x) for x in wave] if animated else [compose(poses[pose])]
    if fmt=='GIF':
        # Reserve index zero for transparency rather than losing the fox silhouette.
        palette=gif_frames(result)
        palette[0].save(target,format='GIF',save_all=True,append_images=palette[1:],duration=160,loop=0,disposal=2,transparency=0,optimize=False)
    elif animated and fmt in ('WEBP','PNG'):
        result[0].save(target,format=fmt,save_all=True,append_images=result[1:],duration=160,loop=0,**({'lossless':True} if fmt=='WEBP' else {'disposal':0,'blend':0}))
    else:
        if fmt in ('JPEG','ICO'):
            result[0]=result[0].convert('RGB')
        result[0].save(target,format=fmt)
    item={'file':source.replace('\\','/'),'size':list(size),'animated':animated,'pose':pose}
    if animated:
        name=hashlib.sha256(item['file'].encode()).hexdigest()[:16]+'.png'
        (OUT/'posters').mkdir(exist_ok=True)
        result[0].save(OUT/'posters'/name)
        item['poster']='/brand/posters/'+name
    overrides[:]=[x for x in overrides if x['file']!=item['file']]
    overrides.append(item)

for asset in json.loads((BRAND/'mascot-inventory.json').read_text(encoding='utf-8')):
    source=asset['file']
    name=source.lower()
    pose='left' if 'left' in name else 'right' if 'right' in name or 'point' in name else 'run' if 'running' in name else 'party' if 'party' in name or 'jump' in name else 'gaming' if 'headset' in name else 'sit'
    export(source,pose)

# The role-perk illustration also contained the original mascot and name.
export('client/assets/boosts/93c84331a5f11ba05946bce6fb4f85594d98cb52c8452e9b6869291da41cf62c.png','sit',role=True)
export('client/assets/boosts/07ad706367af930589109e947258105fd0b8e1b97d1fccc4cbf1ec9905ffb4f1.png','sit',animated=True,role=True)
catalog=json.loads((ROOT/'client/assets/collectibles/catalog.json').read_text(encoding='utf-8'))
for item in catalog['items']:
    if any(name in item.get('name','').lower() for name in ('clyde','wumpus')):
        for key in ('thumbnail','animated'):
            if item.get(key):
                export(item[key].lstrip('/'),'sit',animated=key=='animated',decoration=True)
(BRAND/'overrides.json').write_text(json.dumps(overrides,indent=2),encoding='utf-8')
print(f'Prepared {len(overrides)} mascot replacements; GIFs and animated PNG/WebP retain animation and source dimensions.')
