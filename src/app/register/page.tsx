import { redirect } from "next/navigation";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await searchParams;
  redirect("/login");
}
