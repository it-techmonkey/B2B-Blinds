/** Allow only same-origin relative paths (no open redirects). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return null;
  return t;
}
