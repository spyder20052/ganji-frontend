import QRCode from 'qrcode';

/** QR code rendu côté serveur en SVG (aucun JavaScript envoyé au téléphone). */
export async function Qr({ value, size = 240, label }: { value: string; size?: number; label: string }) {
  const svg = await QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#06291f', light: '#ffffff' } });
  return (
    <div role="img" aria-label={label} style={{ width: size, height: size }} className="rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
