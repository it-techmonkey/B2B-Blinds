export const B2B_CART_KEY = "b2b_cart_v1";

export type CartLineMeta = {
  productId: string;
  variantId: string;
  quantity: number;
  productName: string;
  size: string;
  price: string;
};

export type CartPayload = { items: CartLineMeta[] };

export function readCartPayload(): CartPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(B2B_CART_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CartPayload;
    if (!p?.items || !Array.isArray(p.items)) return null;
    return p;
  } catch {
    return null;
  }
}

export function writeCartPayload(payload: CartPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(B2B_CART_KEY, JSON.stringify(payload));
}

export function clearCartPayload() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(B2B_CART_KEY);
}

/** Set when the cart was loaded from a saved order, so checkout can prefill details and clean up after ordering. */
const RESUME_KEY = "b2b_resume_v1";

export type ResumeInfo = {
  savedOrderId: string;
  customer: Record<string, string | undefined>;
  notice?: string;
};

export function readResumeInfo(): ResumeInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumeInfo) : null;
  } catch {
    return null;
  }
}

export function writeResumeInfo(info: ResumeInfo) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESUME_KEY, JSON.stringify(info));
}

export function clearResumeInfo() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RESUME_KEY);
}
