"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`btn-ghost h-10 w-full justify-start md:w-full ${className} cursor-pointer`}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        router.push("/login");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
