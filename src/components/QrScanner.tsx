'use client';
import { useT } from '@/i18n/client';
import { Camera, CameraOff, Keyboard } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

/** API BarcodeDetector (Chrome Android, Edge, Safari 17+) : absente des types DOM standard. */
type DetectedCode = { rawValue: string };
type Detector = { detect(source: CanvasImageSource): Promise<DetectedCode[]> };
type DetectorCtor = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

function detectorCtor(): DetectorCtor | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null;
}

export interface QrScannerProps {
  /** Appelé avec le contenu lu (QR) ou saisi (code, texte collé). */
  onValue: (value: string) => void | Promise<void>;
  busy?: boolean;
  inputLabel: string;
  inputHint?: string;
  placeholder?: string;
  submitLabel: string;
  scanLabel?: string;
  /** Longueur minimale de la saisie manuelle. */
  minLength?: number;
}

/**
 * Lecteur de QR code : caméra arrière + BarcodeDetector quand le navigateur le permet
 * (une analyse toutes les 300 ms, flux coupé dès la lecture), sinon saisie manuelle.
 * La saisie manuelle reste toujours proposée : réseau lent, caméra refusée, QR imprimé abîmé.
 */
export function QrScanner({ onValue, busy = false, inputLabel, inputHint, placeholder, submitLabel, scanLabel, minLength = 6 }: QrScannerProps) {
  const t = useT();
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputId = useId();
  const hintId = useId();

  useEffect(() => {
    const Ctor = detectorCtor();
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) return;
    if (!Ctor.getSupportedFormats) {
      setSupported(true);
      return;
    }
    Ctor.getSupportedFormats()
      .then((f) => setSupported(f.includes('qr_code')))
      .catch(() => setSupported(false));
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    const Ctor = detectorCtor();
    if (!Ctor) return;
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      if (!video) return stop();
      video.srcObject = stream;
      await video.play();
      const detector = new Ctor({ formats: ['qr_code'] });
      let inFlight = false;
      timerRef.current = setInterval(async () => {
        if (inFlight || video.readyState < 2) return;
        inFlight = true;
        try {
          const codes = await detector.detect(video);
          const raw = codes[0]?.rawValue?.trim();
          if (raw) {
            stop();
            setValue(raw);
            await onValue(raw);
          }
        } catch {
          /* image illisible : on réessaie au prochain passage */
        } finally {
          inFlight = false;
        }
      }, 300);
    } catch {
      stop();
      setCamError(t('Caméra indisponible ou refusée. Saisissez le code à la main.'));
    }
  }

  return (
    <div className="space-y-3">
      {supported && (
        <div className="space-y-2">
          <div className={scanning ? 'relative overflow-hidden rounded-2xl bg-black' : 'hidden'}>
            <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" aria-label={t('Aperçu de la caméra')} />
            <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" />
          </div>
          {scanning ? (
            <button type="button" onClick={stop} className="btn btn-ghost w-full">
              <CameraOff size={20} aria-hidden /> Arrêter la caméra
            </button>
          ) : (
            <button type="button" onClick={start} disabled={busy} className="btn btn-primary w-full">
              <Camera size={20} aria-hidden /> {scanLabel ?? t('Scanner le QR code')}
            </button>
          )}
          {scanning && <p role="status" className="text-sm text-[var(--fg-muted)]">Placez le QR code dans le cadre. Lecture automatique.</p>}
        </div>
      )}
      {camError && <p role="alert" className="text-sm font-bold text-[var(--color-ocre-700)]">{camError}</p>}

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (v.length >= minLength && !busy) void onValue(v);
        }}
      >
        <label htmlFor={inputId} className="flex items-center gap-2 text-base font-bold">
          <Keyboard size={18} aria-hidden /> {supported ? t('Ou {action}', { action: `${inputLabel.charAt(0).toLowerCase()}${inputLabel.slice(1)}` }) : inputLabel}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            className="input num"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={inputHint ? hintId : undefined}
          />
          <button type="submit" className="btn btn-soft shrink-0" disabled={busy || value.trim().length < minLength}>
            {busy ? t('Vérification…') : submitLabel}
          </button>
        </div>
        {inputHint && (
          <p id={hintId} className="text-sm text-[var(--fg-muted)]">
            {inputHint}
          </p>
        )}
      </form>
    </div>
  );
}
