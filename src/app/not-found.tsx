import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-bold">This page went off like NEPA.</h1>
      <p className="mt-3 text-ink-2">The link may be old or mistyped. Try the shop instead.</p>
      <Link href="/shop" className="btn btn-sun mt-6">Go to the shop</Link>
    </div>
  );
}
