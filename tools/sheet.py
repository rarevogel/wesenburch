import re, sys, os, html
ICONS = sys.argv[1]; out = sys.argv[2]; names = sys.argv[3:]
DEFS = open(os.path.join(os.path.dirname(__file__), 'pencil-defs.svg')).read()
cells = []
for n in names:
    s = open(os.path.join(ICONS, n + '.svg')).read()
    ds = [d for d in re.findall(r'<path[^>]*?d="([^"]+)"', s) if d != 'M0 0h512v512H0z']
    d = ' '.join(ds)
    cells.append(f'<figure><svg viewBox="0 0 512 512"><use href="#paper"/>{pencil(d) if False else ""}' if False else (n, d))
def pencil(d):
    return f'''<g filter="url(#rough)"><path d="{d}" fill="url(#hatch1)" opacity=".7"/><path d="{d}" fill="url(#hatch2)" mask="url(#lowerright)" opacity=".8"/><path d="{d}" fill="none" stroke="#1f1b17" stroke-width="6" stroke-linejoin="round"/></g>
<g filter="url(#rough2)" opacity=".5"><path d="{d}" fill="none" stroke="#2c2722" stroke-width="2.4" transform="translate(4 3)"/></g>'''
body = ''.join(f'<figure><svg viewBox="-20 -20 552 552">{pencil(d)}</svg><figcaption>{html.escape(n)}</figcaption></figure>' for n, d in cells)
open(out, 'w').write(f'''<!doctype html><style>body{{margin:0;background:#e9e2d0;display:grid;grid-template-columns:repeat(8,1fr);gap:6px;padding:6px;font:12px sans-serif}}figure{{margin:0;background:#f6f1e4;text-align:center}}svg{{width:100%;display:block}}</style>
<svg width="0" height="0" style="position:absolute">{DEFS}</svg>{body}''')
