export type Rules = { default?: number; floor?: number; brand: Record<string, number>; category: Record<string, number>; productMarkup: Record<string, number>; productFixed: Record<string, number> };
export function priceFor(p: { id: string; brand: string; category: string; costNgn: number }, base: { markup: number; roundTo: number; floor?: number; brandMarkup?: Record<string, number> }, rules?: Partial<Rules>): { price: number; markup: number; floored: boolean; fixed: boolean };
export function loadRules(url?: string): Promise<Partial<Rules>>;
