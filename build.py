#!/usr/bin/env python3
"""Builds one self-contained wesenbuch.html (fonts, sketches, data and code inlined) and copies it into the Android app."""
import base64, json, os, re, shutil
here = os.path.dirname(os.path.abspath(__file__))
web, icons = os.path.join(here, 'web'), os.path.join(here, 'icons')
fs = os.path.join(here, 'node_modules', '@fontsource')

def font(family, path, weight, style='normal'):
    data = base64.b64encode(open(os.path.join(fs, path), 'rb').read()).decode()
    return f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:{style};font-display:swap;src:url(data:font/woff2;base64,{data}) format('woff2')}}"
fonts = '\n'.join([
    font('IM Fell English', 'im-fell-english/files/im-fell-english-latin-400-normal.woff2', 400),
    font('EB Garamond', 'eb-garamond/files/eb-garamond-latin-400-normal.woff2', 400),
    font('EB Garamond', 'eb-garamond/files/eb-garamond-latin-400-italic.woff2', 400, 'italic'),
    font('EB Garamond', 'eb-garamond/files/eb-garamond-latin-600-normal.woff2', 600),
])

AUTHORS = {'lorc': 'Lorc', 'delapouite': 'Delapouite', 'skoll': 'Skoll', 'caro-asercion': 'Caro Asercion', 'cathelineau': 'Cathelineau',
           'darkzaitzev': 'DarkZaitzev', 'carl-olsen': 'Carl Olsen'}
sketches, authors = {}, set()
for line in open(os.path.join(here, 'sketches.txt')):
    if not line.strip() or line.startswith('#'): continue
    key, icon, cap = re.split(r'\s{2,}', line.strip(), maxsplit=2)
    svg = open(os.path.join(icons, icon + '.svg')).read()
    paths = [(m.group(0), m.group(1)) for m in re.finditer(r'<path[^>]*?d="([^"]+)"[^>]*>', svg)]
    d = ' '.join(p for tag, p in paths if p != 'M0 0h512v512H0z')
    rule = 'evenodd' if 'evenodd' in svg else None
    sketches[key] = {'d': d, 'cap': cap, **({'r': rule} if rule else {})}
    who = icon.split('/')[0]
    if who in AUTHORS: authors.add(AUTHORS[who])

defs = open(os.path.join(here, 'tools', 'pencil-defs.svg')).read().replace('#2c2722', 'currentColor')
data = re.sub(r'^export ', '', open(os.path.join(web, 'data.js')).read(), flags=re.M)
app = open(os.path.join(web, 'app.js')).read()
script = (data + f'\nconst SKETCHES = {json.dumps(sketches, ensure_ascii=False)};\nconst SKETCH_AUTHORS = {json.dumps(sorted(authors))};\n' + app)
html = open(os.path.join(web, 'index.html')).read()
html = html.replace('/*@FONTS*/', fonts).replace('/*@DEFS*/', defs).replace('/*@SCRIPT*/', script)
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
out = os.path.join(here, 'dist', 'wesenbuch.html')
open(out, 'w').write(html)
assets = os.path.join(here, 'android', 'assets'); os.makedirs(assets, exist_ok=True)
shutil.copy(out, os.path.join(assets, 'index.html'))
print(out, len(html), 'bytes,', len(sketches), 'sketches')
