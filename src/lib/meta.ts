import type { Metadata } from "next";
import { STORE } from "@/config/store";

type Opts = {
  title: string; description: string;
  /** Canonical path, e.g. "/shop". Omit for pages that shouldn't be indexed. */
  path?: string;
  /** Which link-preview picture to use: "page/shop", "product/{slug}", "fund/{id}" ... see /og. */
  og: string;
  type?: "website" | "article";
  noindex?: boolean;
};

/**
 * Title, description, canonical, Open Graph and Twitter for one page, all in one place, so
 * every page shares the same calm preview card when it is pasted into WhatsApp, X, LinkedIn or a text.
 */
export function pageMeta({ title, description, path, og, type = "website", noindex }: Opts): Metadata {
  const image = { url: `/og/${og}`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: { type, siteName: STORE.name, locale: "en_NG", title, description, ...(path ? { url: path } : {}), images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Adds the Open Graph and Twitter card (with the page's preview picture) to metadata a page already defines. */
export function withOg(meta: Metadata, og: string, type: "website" | "article" = "website"): Metadata {
  const title = typeof meta.title === "string" ? meta.title : meta.title && "absolute" in meta.title ? String(meta.title.absolute) : "Solar Builders NG";
  const description = meta.description ?? undefined;
  const canonical = typeof meta.alternates?.canonical === "string" ? meta.alternates.canonical : undefined;
  const image = { url: `/og/${og}`, width: 1200, height: 630, alt: title };
  return {
    ...meta,
    openGraph: { type, siteName: STORE.name, locale: "en_NG", title, description, ...(canonical ? { url: canonical } : {}), images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
