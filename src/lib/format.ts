const ngn = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const naira = (n: number) => ngn.format(n).replace("NGN", "₦").replace(/\s/g, "");

export const NG_PHONE = /^(?:\+?234|0)[789][01]\d{8}$/;
export const normalizePhone = (s: string) => s.replace(/[\s()-]/g, "");
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
