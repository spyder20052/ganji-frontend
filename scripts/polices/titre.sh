#!/usr/bin/env bash
# Police du titre de l'accueil : Bricolage Grotesque Bold, taille optique 96 (SIL Open Font License 1.1).
# On ne garde que les lettres du titre, en français et en anglais (≈ 2,5 Ko au lieu de 22 Ko) :
# à relancer si le titre change. Prérequis : python3 avec fonttools et brotli.
set -euo pipefail
cd "$(dirname "$0")/../.."
TEXTE='Votre santé, suivie partout.Your health, followed everywhere.'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
TMP=$(mktemp -d)
URL=$(curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,700' | grep -o 'https://[^)]*\.woff2' | tail -1)
curl -s -o "$TMP/source.woff2" "$URL"
python3 -m fontTools.subset "$TMP/source.woff2" --text="$TEXTE" --flavor=woff2 --layout-features='kern,liga' \
  --output-file=src/app/_landing/fonts/bricolage-titre.woff2
ls -l src/app/_landing/fonts/bricolage-titre.woff2
