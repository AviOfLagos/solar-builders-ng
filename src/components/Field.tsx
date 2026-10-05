export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-flare">{error}</span> : hint ? <span className="mt-1 block text-mute">{hint}</span> : null}
    </label>
  );
}

export function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="font-display mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
