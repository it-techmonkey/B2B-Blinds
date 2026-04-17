function formatValidationDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const fe = (details as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors;
  if (!fe) return "";
  const parts: string[] = [];
  for (const [key, msgs] of Object.entries(fe)) {
    if (!msgs?.length) continue;
    for (const m of msgs) parts.push(`${key}: ${m}`);
  }
  return parts.length ? ` — ${parts.join("; ")}` : "";
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : res.statusText;
    const suffix = formatValidationDetails(data?.details);
    throw new Error((msg || "Request failed") + suffix);
  }
  return data as T;
}
