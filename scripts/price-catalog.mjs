// Turns brand prices (data/catalog-costs.json) into our selling prices (src/data/products.json).
// Runs before every build and dev start. Costs never reach the browser: only the output file is bundled.
import { readFileSync, writeFileSync } from "node:fs";
import { loadRules, priceFor } from "./pricing-lib.mjs";

const src = JSON.parse(readFileSync(new URL("../data/catalog-costs.json", import.meta.url)));
const pricing = JSON.parse(readFileSync(new URL("../src/config/pricing.json", import.meta.url)));

const rules = await loadRules(process.env.DATABASE_URL || process.env.POSTGRES_URL);

const out = {
  brands: src.brands,
  products: src.products.map(({ costNgn, ...p }) => ({ ...p, price: priceFor({ ...p, costNgn }, pricing, rules).price })),
};
const json = JSON.stringify(out, null, 1) + "\n";
const path = new URL("../src/data/products.json", import.meta.url);
let prev = "";
try { prev = readFileSync(path, "utf8"); } catch {}
if (prev !== json) writeFileSync(path, json);
console.log(`[catalog] ${out.products.length} products priced`);
