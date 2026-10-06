import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import { OpenLinkForm } from "@/components/OpenLink";

export const metadata: Metadata = withOg({ title: "Open a link or code", description: "Open a priced list from your installer or a friend's Go Solar Me page.", robots: { index: false } }, "page/open");

export default function OpenPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="font-display text-4xl">Got a link or code?</h1>
      <p className="mt-2 text-ink-2">Paste what an installer, friend or family member sent you.</p>
      <div className="card mt-6 p-6"><OpenLinkForm label="Link or code" autoFocus /></div>
    </div>
  );
}
