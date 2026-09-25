# Illustrations de la landing Ganji : prompts de génération

**Mode d'emploi.** Pour chaque image : joindre le dossier `Ganji_Identite_Visuelle`, coller le **préambule de style** puis le **prompt** de l'image. Les prompts sont en anglais : les générateurs d'images les suivent mieux.

**Chargement.** Aucune illustration n'est téléchargée à l'ouverture de la page : chacune part quand elle arrive à 400 px de l'écran (`DeferredImages`), ce qui garde la première page sous 200 Ko, même en 2G.

**Livraison.** Exporter en PNG, fond transparent (sauf mention contraire), au format indiqué, puis déposer le fichier dans `public/illustrations/` avec **exactement** le nom donné. La page le détecte au prochain déploiement ; tant qu'il manque, elle affiche un visuel de marque à la place. Poids conseillé : moins de 400 Ko par PNG (Vercel les convertit ensuite en AVIF/WebP).

**Contrôle avant dépôt.** Aucun texte ni chiffre dans l'image (les libellés sont dans la page, donc traduisibles et lus par les lecteurs d'écran), pas de rouge hors sang et urgence, mêmes visages d'une image à l'autre pour un même personnage.

---

## Préambule de style (à coller tel quel avant chaque prompt)

```
Flat vector illustration in the Ganji health-platform brand style (see the attached identity folder: logo, colors, patterns, app mockup). Geometric, modular shapes built on a square grid with softly rounded corners, echoing the Ganji symbol (four stepped leaves around a hollow cross). Friendly Beninese characters with deep brown skin tones (#5A3A22, #7A4E2E, #8C5A36), simple faces (two dot eyes, small smile, no nose line), rounded bodies, no outlines, no gradients, no texture, no drop shadows. Clothing may carry a subtle wax-print pattern made of tiny stepped squares. Strict palette: Forest #0B3D2C, Ganji green #168A56, Sprout #5FD08F, Sage #B7D3C1, Mist #E6F0E9, Paper #F5F4EE, Ink #0A1A14, one warm accent Ochre #D99A1E used sparingly. Red #C62828 only for blood bags, blood drops or emergency objects. Calm, reassuring, public-service tone, generous empty space. Transparent background, PNG. Absolutely no text, letters, numbers, logos or watermark anywhere in the image.
```

---

## 1. Communauté

### `hero-communaute.png` · carré 1600 × 1600 · section « Pensé pour chacun »

Prévue pour le haut de page, elle est placée plus bas : en haut, l'onde Ganji en SVG ne coûte rien, alors que cette image (13 à 22 Ko selon l'écran) ferait dépasser les 200 Ko de la première page.
```
A circle of six people around a large Ganji symbol shape in Ganji green #168A56 and Sprout #5FD08F, sitting on a soft Mist stepped square. Around it, evenly spaced and facing slightly inward: a 34-year-old man (Koffi) showing a QR code on a simple Android phone; his mother (Afiavi, 52, colorful headwrap, wax-print dress) holding a basic keypad phone to her ear, three small stepped sound waves coming out; a male hematologist (Dr Houngbédji, white coat, stethoscope) holding a tablet; a female pharmacist in a Sage coat holding a small medicine box; a young pregnant woman in a headwrap; a community health worker with a cap, a shoulder bag and a notebook. Thin concentric stepped squares radiate from the central symbol like a signal reaching everyone. Balanced, welcoming, lots of breathing room.
```

## 2. Le problème

### `probleme-course.png` · 4:3, 1600 × 1200 · section « le problème »
```
A tense but respectful scene on a Cotonou street at dusk: a young woman on the back of a zemidjan motorbike taxi holding an empty blood bag (red), a man holding a paper prescription in front of a closed pharmacy with lowered shutters, and loose paper medical records flying in the wind between them. Forest and Sage buildings, a low Ochre sun. Convey the running around and the scattered care, without drama, no injuries, no blood spilled.
```

## 3. Ce que Ganji permet (mosaïque de 9 services, 4:3, 1600 × 1200 chacun)

### `service-carnet.png`
```
A patient shows a QR code on his phone to a smiling female doctor, who scans it with a tablet. Between them floats a small rounded padlock shape that is open and checked in Sprout, meaning access granted with consent. A simple desk and a plant in Sage.
```

### `service-sang.png`
```
A young blood donor holding a basic keypad phone gives a thumbs up; above the phone, three stepped signal squares. Next to him a blood bag (red) with a drop, and a map pin in Ganji green on a simplified map shape. Hopeful, energetic.
```

### `service-medicaments.png`
```
A pharmacist behind a counter scans the QR code printed on a paper prescription with a phone. Shelves of medicine boxes in Sage and Mist behind her, one large green check mark shape floating above the counter.
```

### `service-urgence.png`
```
A calm emergency scene: a first-aid worker kneels next to a man lying on his side after a motorbike fall (no blood, no visible wound), and scans a QR card shown on the man's phone lock screen. A red cross shape on the rescuer's bag. Reassuring, controlled.
```

### `service-orientation.png`
```
At night (a moon shape, Forest sky), a father holds a small child with a thermometer; with his other hand he looks at a phone showing four large pictograms: a house, a pill, a clinic, a siren. In the distance, a lit health center with a green cross shape.
```

### `service-mere-enfant.png`
```
A young pregnant woman in a headwrap sits with a nurse who holds a calendar card with four marked slots; next to them, a baby on a parent's lap receives drops from a nurse. Soft, warm, protective.
```

### `service-teleexpertise.png`
```
Split composition: on the left, a nurse in a small rural health center photographs a paper test result with her phone; on the right, a specialist doctor in a city hospital listens and answers with a voice message. Stepped signal squares travel from left to right across a simplified map of Benin.
```

### `service-relais.png`
```
A community health worker with a cap and a notebook stands in a village among three simple houses; he taps three large pictograms on a phone while two villagers wave. A small cloud with a crossed-out signal shows there is no network, and a stepped arrow shows the report will be sent later.
```

### `service-pilotage.png`
```
A public-health officer in office attire stands in front of a large simplified map of Benin divided into twelve rounded regions in Mist, Sage, Sprout and Ganji green, with two small red blood-drop markers and a few ochre alert markers. A clean chart panel with rounded bars beside her. Institutional, clear.
```

## 4. Pour chacun (8 portraits, carré 800 × 800, fond Mist #E6F0E9 plein en carré aux angles arrondis)

Même cadrage pour les 8 : buste centré, épaules visibles, regard vers la caméra, fond Mist plein (pas transparent).

### `persona-koffi.png`
```
Bust portrait of Koffi, 34, a calm young man with short hair, a plain Sage t-shirt, holding a simple Android phone at chest height. Living with leukemia, but serene and confident.
```

### `persona-afiavi.png`
```
Bust portrait of Afiavi, 52, a warm mother with a bright wax-print headwrap in Ochre and Forest, holding a basic keypad phone near her ear, small stepped sound waves beside it.
```

### `persona-rafiatou.png`
```
Bust portrait of Rafiatou, 23, a young pregnant woman from northern Benin in a Sage headwrap, one hand on her belly, gentle smile.
```

### `persona-houngbedji.png`
```
Bust portrait of Dr Houngbédji, a male hematologist in his forties, white coat, stethoscope around the neck, holding a tablet, kind and focused.
```

### `persona-rachidatou.png`
```
Bust portrait of Rachidatou, a nurse in a rural health center, Ganji green scrubs and a Mist headscarf, holding a phone ready to take a photo.
```

### `persona-pharmacienne.png`
```
Bust portrait of a pharmacist woman in a Sage lab coat, holding a small medicine box and a paper prescription with a QR code shape.
```

### `persona-mathieu.png`
```
Bust portrait of Mathieu, a community health worker in his thirties, cap, shoulder bag strap across the chest, notebook in hand.
```

### `persona-ministere.png`
```
Bust portrait of a public-health director, a woman in her fifties in a Forest suit jacket and wax-print scarf, confident, a small map-of-Benin pin shape on her lapel.
```

## 5. Comment ça marche (3 tutoriels, carré 1200 × 1200)

### `tuto-carnet.png`
```
Two hands hold a phone; on the screen a large keypad with rounded keys, and above the phone a speech bubble shape with six small rounded squares (a one-time code, no digits drawn). A small ID card shape in Mist next to the phone.
```

### `tuto-partage.png`
```
A patient holds a phone showing a QR code toward a doctor's tablet; a small round clock shape in Ochre floats between them, and a stepped signal links the two screens.
```

### `tuto-rappels.png`
```
An elderly woman sitting on a wooden chair listens to a basic keypad phone with stepped sound waves; next to her a calendar card with one marked slot and a small pill shape.
```

## 6. Confiance

### `confiance-journal.png` · carré 1200 × 1200
```
A person holds a large rounded shield made of the Ganji stepped shape in Forest and Ganji green; behind the shield, a vertical list of four rounded cards: three with green check shapes and one with an ochre crossed shape, meaning one refused access. Trustworthy, protective.
```

## 7. Appel final

### `cta-ensemble.png` · 16:9, 1920 × 1080
```
A wide, joyful group scene: the same six characters as the hero image (Koffi, Afiavi, the hematologist, the pharmacist, the pregnant woman, the community health worker) stand side by side and wave, with a large soft Ganji symbol behind them in Sprout and Sage. Ample empty space above them.
```
