#!/usr/bin/env python3
"""Polices de Ganji, réduites au strict nécessaire (budget de la première page : 200 Ko).

- src/fonts/bricolage-titres.woff2 : Bricolage Grotesque SemiBold, taille optique 40, lettres
  françaises et anglaises. Titres de toute l'application, et accents de l'accueil.
- src/app/_landing/fonts/bricolage-titre.woff2 : Bricolage Grotesque Bold, taille optique 96,
  seulement les lettres du titre de l'accueil (à relancer si le titre change).
- src/components/logotype-trace.ts : le logotype « Ganji » de la charte (Poppins Medium) en tracé
  vectoriel, pour ne pas télécharger Poppins Medium sur chaque page.

Bricolage Grotesque et Poppins : SIL Open Font License 1.1. Prérequis : python3, fonttools, brotli.
Usage : python3 scripts/polices/polices.py (depuis ganji-frontend/).
"""
import io
import re
import urllib.request

from fontTools import subset
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
TITLE = 'Votre santé, suivie partout.Your health, followed everywhere.'
# Latin de base, accents français, espaces insécables, guillemets, tirets, apostrophe typographique,
# degré, multiplication, point médian, puce, points de suspension, euro.
CHARSET = [*range(0x20, 0x7F), 0xA0, 0xAB, 0xB0, 0xB7, 0xBB, 0xD7, *map(ord, 'ÀÂÄÇÈÉÊËÎÏÔÖÙÛÜàâäçèéêëîïôöùûüÿ'),
           0x152, 0x153, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x202F, 0x20AC]


def fetch(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read()


def google_font(query: str) -> TTFont:
    """Fichier woff2 « latin » servi par Google Fonts (le dernier bloc de la feuille de style)."""
    css = fetch(f'https://fonts.googleapis.com/css2?family={query}').decode()
    url = re.findall(r'url\((https://[^)]+\.woff2)\)', css)[-1]
    return TTFont(io.BytesIO(fetch(url)))


def save_subset(font: TTFont, out: str, *, unicodes=None, text=None):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'tnum']
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes or [], text=text or '')
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(out)
    print(out)


def bricolage(opsz: float, wght: float) -> TTFont:
    var = google_font('Bricolage+Grotesque:opsz,wght@12..96,200..800')
    return instancer.instantiateVariableFont(var, {'opsz': opsz, 'wght': wght})


save_subset(bricolage(40, 600), 'src/fonts/bricolage-titres.woff2', unicodes=CHARSET)
save_subset(bricolage(96, 700), 'src/app/_landing/fonts/bricolage-titre.woff2', text=TITLE)

# Logotype : « Ganji » en Poppins Medium, approche serrée (-0,025 em) comme le logotype de la charte.
# Repère : 1000 unités = 1 em ; boîte de 1 em de haut (ligne pleine, interligne 1), ligne de base à 850.
poppins = google_font('Poppins:wght@500')
glyphs, cmap, hmtx = poppins.getGlyphSet(), poppins.getBestCmap(), poppins['hmtx']
pen, x = SVGPathPen(glyphs), 0
for ch in 'Ganji':
    name = cmap[ord(ch)]
    glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 850)))
    x += hmtx[name][0] - 25
width = x + 25
path = re.sub(r'(\d+\.\d)\d+', r'\1', pen.getCommands())
with open('src/components/logotype-trace.ts', 'w') as f:
    f.write('/* Généré par scripts/polices/polices.py : logotype de la charte (Poppins Medium) en tracé. */\n')
    f.write(f"export const LOGOTYPE_VIEWBOX = '0 0 {width} 1000';\n")
    f.write(f"export const LOGOTYPE_RATIO = {width / 1000:.3f};\n")
    f.write(f"export const LOGOTYPE_PATH = '{path}';\n")
print('src/components/logotype-trace.ts', width)
