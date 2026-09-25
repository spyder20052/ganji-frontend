"""Messages vocaux en yoruba : voix de synthèse Meta MMS-TTS à partir de scripts/voix/yoruba.json
(clé → [texte français, texte yoruba]). Sortie : public/audio/yoruba/<clé>.mp3 et public/audio/manifest.json.

  python3 -m venv .venv-voix && .venv-voix/bin/pip install torch transformers soundfile numpy
  .venv-voix/bin/python scripts/voix/synthese.py        # ffmpeg requis

Corriger un texte yoruba dans yoruba.json puis relancer ; un enregistrement humain au même chemin le remplace."""
import json, os, re, subprocess, tempfile, datetime
import numpy as np, soundfile as sf, torch
from transformers import AutoTokenizer, VitsModel
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'audio')
MSG = json.load(open(os.path.join(HERE, 'yoruba.json')))
tok = AutoTokenizer.from_pretrained('facebook/mms-tts-yor'); tts = VitsModel.from_pretrained('facebook/mms-tts-yor').eval()
rate = tts.config.sampling_rate
os.makedirs(os.path.join(OUT, 'yoruba'), exist_ok=True)
manifest = {'generatedAt': datetime.date.today().isoformat(), 'synthetic': True,
  'method': 'Traduction rédigée par une IA (Claude) à partir du texte français, voix de synthèse Meta MMS-TTS (yoruba). À faire valider par un locuteur natif avant tout usage réel.',
  'rejected': 'La traduction automatique NLLB-200 (600M) a été écartée : sens faux sur les messages de santé (fon et yoruba).',
  'license': 'Voix : modèle Meta MMS-TTS, licence CC-BY-NC 4.0 (usage non commercial).',
  'languages': {'yoruba': {}}}
for key, (fr, yo) in MSG.items():
    audio = []
    for s in [x.strip() for x in re.split(r'(?<=[.?!:;])\s+', yo) if x.strip()]:
        inp = tok(s, return_tensors='pt')
        if inp['input_ids'].shape[1] < 2: continue
        torch.manual_seed(7)
        with torch.no_grad(): wav = tts(**inp).waveform[0].numpy()
        audio += [wav, np.zeros(int(rate * 0.4), dtype=np.float32)]
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        sf.write(f.name, np.concatenate(audio), rate)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f.name, '-ac', '1', '-ar', '16000', '-b:a', '32k', os.path.join(OUT, 'yoruba', f'{key}.mp3')], check=True)
        os.unlink(f.name)
    manifest['languages']['yoruba'][key] = {'fr': fr, 'text': yo}
    print(key, 'ok', flush=True)
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print('FIN', len(manifest['languages']['yoruba']))
