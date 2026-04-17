"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type Variant = "table" | "button";

export function InvoicePdfLink({
  orderId,
  accessToken,
  className,
  variant = "table",
  children = "PDF",
}: {
  orderId: string;
  accessToken?: string;
  className?: string;
  variant?: Variant;
  children?: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function download(e: React.MouseEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const requestUrl = accessToken
        ? `/api/orders/${orderId}/invoice?token=${encodeURIComponent(accessToken)}`
        : `/api/orders/${orderId}/invoice`;
      const res = await fetch(requestUrl, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const ct = res.headers.get("Content-Type") ?? "";
      if (!res.ok) {
        if (ct.includes("application/json")) {
          const body = (await res.json()) as { error?: string };
          console.error("[invoice]", body.error ?? res.status);
        } else {
          console.error("[invoice]", res.status, res.statusText);
        }
        setState("error");
        return;
      }
      if (!ct.includes("application/pdf")) {
        console.error("[invoice] unexpected content type", ct);
        setState("error");
        return;
      }
      const blob = await res.blob();
      const filename =
        parseFilename(res.headers.get("Content-Disposition")) ?? `invoice-${orderId.slice(0, 8)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (err) {
      console.error("[invoice]", err);
      setState("error");
    }
  }

  const base =
    variant === "button"
      ? "btn-ink shrink-0 text-sm disabled:opacity-60"
      : "inline-flex h-9 items-center justify-center rounded-[12px] px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60";

  return (
    <button
      type="button"
      className={className ?? base}
      onClick={download}
      disabled={state === "loading"}
    >
      {state === "loading" ? "Preparing…" : state === "error" ? "Retry PDF" : children}
    </button>
  );
}

function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(disposition);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}
