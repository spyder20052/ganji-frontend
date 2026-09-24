'use client';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QrClient({ value, size = 240, label }: { value: string; size?: number; label: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#06291f', light: '#ffffff' } }).then(setSvg);
  }, [value]);
  return <div role="img" aria-label={label} style={{ width: size, height: size }} className="rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />;
}
