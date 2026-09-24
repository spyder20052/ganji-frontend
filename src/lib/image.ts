/** Photos prises sur le téléphone : compressées et ré-encodées avant tout envoi (≤ 300 Ko). */

export const MAX_BYTES = 300 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ce format de photo n’est pas lu par ce téléphone. Essayez une photo JPEG.')); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

export function blobToB64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Compression sur le téléphone avant envoi (≤ 300 Ko) : WebP si le navigateur sait
 * l'encoder, sinon JPEG. On baisse d'abord la qualité, puis la taille de l'image.
 */
export async function compress(file: File): Promise<{ blob: Blob; mime: 'image/webp' | 'image/jpeg' }> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Compression impossible sur ce téléphone.');
  const webp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  const mime = webp ? 'image/webp' : 'image/jpeg';
  let maxSide = 1600;
  for (let round = 0; round < 8; round++) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await toBlob(canvas, mime, q);
      if (blob && blob.type === mime && blob.size <= MAX_BYTES) return { blob, mime };
    }
    maxSide = Math.round(maxSide * 0.75);
  }
  throw new Error('Photo trop lourde, même compressée. Rapprochez-vous du document et reprenez la photo.');
}
