"""Carte du hero : les 77 communes du Bénin (chefs-lieux, ganji-backend/src/data/geo.ts) reliées en réseau.
Sortie : public/hero/benin.svg (animée en CSS) et, à l'écran, la position des communes des événements.
  python3 scripts/carte/benin.py
"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'communes.json')))['communes']
PAD, LNG0, LAT0 = 14, 0.98, 12.07
W = round((3.69 - LNG0) * 100 + 2 * PAD)
H = round((LAT0 - 6.28) * 100 + 2 * PAD)
pt = {c['n']: ((c['lng'] - LNG0) * 100 + PAD, (LAT0 - c['lat']) * 100 + PAD) for c in C}
names = list(pt)
dist = lambda a, b: math.dist(pt[a], pt[b])

# Arbre couvrant minimal (le réseau le plus court qui relie tout le pays), puis quelques liens courts en plus.
inside, edges = {'Cotonou'}, set()
while len(inside) < len(names):
    a, b = min(((a, b) for a in inside for b in names if b not in inside), key=lambda e: dist(*e))
    inside.add(b); edges.add(tuple(sorted((a, b))))
tree = set(edges)
for a in names:
    near = sorted((b for b in names if b != a), key=lambda b: dist(a, b))
    for b in near[:2]:
        if dist(a, b) < 55: edges.add(tuple(sorted((a, b))))
# Silhouette : une grille de carrés (le motif en escalier de la charte). Une case est « terre » si elle est
# à moins de R d'un chef-lieu : la forme vient des données, pas d'un tracé de frontière approximatif.
CELL, R = 9, 45
land = ''
for gy in range(0, H, CELL):
    row = [gx for gx in range(0, W, CELL) if any(math.dist((gx + CELL / 2, gy + CELL / 2), p) < R for p in pt.values())]
    runs, start, prev = [], None, None
    for gx in row:
        if start is None: start = gx
        elif gx != prev + CELL: runs.append((start, prev)); start = gx
        prev = gx
    if start is not None: runs.append((start, prev))
    land += ''.join(f'M{a} {gy}h{b - a + CELL}v{CELL}h-{b - a + CELL}z' for a, b in runs)
home = pt['Cotonou']
far = max(math.dist(home, p) for p in pt.values())
order = sorted(edges, key=lambda e: min(math.dist(home, pt[e[0]]), math.dist(home, pt[e[1]])))
f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
edge_d = ''.join(f'M{f(pt[a][0])} {f(pt[a][1])}L{f(pt[b][0])} {f(pt[b][1])}' for a, b in order)

# Trajets des impulsions : le chemin dans l'arbre entre deux communes.
adj = {n: [] for n in names}
for a, b in tree: adj[a].append(b); adj[b].append(a)
def route(src, dst):
    prev, todo = {src: None}, [src]
    while todo:
        n = todo.pop(0)
        for m in adj[n]:
            if m not in prev: prev[m] = n; todo.append(m)
    path, n = [], dst
    while n: path.append(n); n = prev[n]
    path.reverse()
    d = 'M' + 'L'.join(f'{f(pt[n][0])} {f(pt[n][1])}' for n in path)
    length = sum(dist(path[i], path[i + 1]) for i in range(len(path) - 1))
    return d, length
PULSES = [('Cotonou', 'Djougou', '#C62828', 1.7), ('Cotonou', 'Kandi', '#5FD08F', 2.4), ('Cotonou', 'Natitingou', '#5FD08F', 3.3), ('Parakou', 'Malanville', '#C62828', 2.9)]

nodes = []
for n in names:
    x, y = pt[n]
    delay = 0.15 + math.dist(home, (x, y)) / far * 1.1
    s = 8 if n == 'Cotonou' else 5.5
    nodes.append(f'<rect class="n{" h" if n == "Cotonou" else ""}" x="{f(x - s / 2)}" y="{f(y - s / 2)}" width="{s}" height="{s}" rx="{f(s * 0.28)}" style="animation-delay:{delay:.2f}s"/>')
pulses = []
for i, (a, b, color, start) in enumerate(PULSES):
    d, length = route(a, b)
    pulses.append(f'<circle class="p" r="2.6" fill="{color}" style="offset-path:path(\'{d}\');--t:{length / 140:.1f}s;animation-delay:{start}s"/>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<style>
.n{{fill:#168A56;opacity:0;transform-box:fill-box;transform-origin:center;animation:n .55s cubic-bezier(.16,1,.3,1) forwards}}
.h{{fill:#5FD08F}}
.l{{fill:#168A56;fill-opacity:.1;animation:l 1.2s .1s ease-out both}}
@keyframes l{{from{{fill-opacity:0}}}}
@keyframes n{{from{{opacity:0;transform:scale(.2)}}to{{opacity:1;transform:none}}}}
.e{{fill:none;stroke:#5FD08F;stroke-width:1.1;stroke-opacity:.6;stroke-linecap:round;stroke-dasharray:1 1;stroke-dashoffset:1;animation:e 1.7s .3s cubic-bezier(.45,0,.2,1) forwards}}
@keyframes e{{to{{stroke-dashoffset:0}}}}
.r{{fill:none;stroke:#5FD08F;stroke-width:1.3;opacity:0;transform-box:fill-box;transform-origin:center;animation:r 2.6s 1.3s ease-out infinite}}
@keyframes r{{from{{opacity:.9;transform:scale(.4)}}to{{opacity:0;transform:scale(3.2)}}}}
.p{{opacity:0;offset-rotate:0deg;animation:p var(--t) linear infinite}}
@keyframes p{{0%{{offset-distance:0%;opacity:0}}8%,88%{{opacity:1}}100%{{offset-distance:100%;opacity:0}}}}
@media (prefers-reduced-motion:reduce){{.l{{animation:none}}.n,.e{{animation:none;opacity:1;stroke-dashoffset:0}}.p,.r{{display:none}}}}
</style>
<path class="l" d="{land}"/>
<path class="e" pathLength="1" d="{edge_d}"/>
{''.join(pulses)}
<circle class="r" cx="{f(home[0])}" cy="{f(home[1])}" r="7"/>
{''.join(nodes)}
</svg>
'''
out = os.path.join(HERE, '..', '..', 'public', 'hero', 'benin.svg')
open(out, 'w').write(svg)
import gzip
print(f'benin.svg : {len(svg)} o, gzip {len(gzip.compress(svg.encode(), 9))} o · {len(edges)} liens · {W}x{H}')
for n in ('Cotonou', 'Abomey-Calavi', 'Djougou', 'Parakou', 'Kandi', 'Natitingou', 'Malanville'):
    x, y = pt[n]; print(f'  {n}: left {x / W * 100:.1f}% top {y / H * 100:.1f}%')
