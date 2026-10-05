import data from "../../src/data/products.json";

type P = { id: string; slug: string; name: string; brand: string; category: string; price: number };
export const products = data.products as unknown as P[];
export const brands = data.brands as { slug: string; name: string }[];
export const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;
