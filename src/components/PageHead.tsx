import Link from "next/link";
export function PageHead({ title, intro, crumbs }: { title: string; intro?: string; crumbs: [string, string][] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-8">
      <nav aria-label="Breadcrumb" className="text-sm text-mute">
        <ol className="flex flex-wrap gap-1.5">
          {crumbs.map(([n, h], i) => (
            <li key={h} className="flex gap-1.5">{i > 0 && <span aria-hidden>/</span>}{i < crumbs.length - 1 ? <Link href={h} className="hover:underline">{n}</Link> : <span aria-current="page">{n}</span>}</li>
          ))}
        </ol>
      </nav>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-lg text-ink-2">{intro}</p>}
    </div>
  );
}
