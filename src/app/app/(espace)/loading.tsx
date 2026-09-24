export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <p className="sr-only">Chargement de votre carnet…</p>
      <div className="h-10 w-64 animate-pulse rounded-2xl bg-[var(--card)]" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-36 animate-pulse" />
        ))}
      </div>
      <p aria-hidden className="text-base text-[var(--fg-muted)]">Chargement…</p>
    </div>
  );
}
