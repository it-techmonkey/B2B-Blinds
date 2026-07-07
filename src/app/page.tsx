import { LandingPage } from "@/components/LandingPage";
import { getSession } from "@/lib/auth/get-session";

export default async function HomePage() {
  // The marketing landing page is always shown at "/", for signed-in and
  // logged-out visitors alike. Signed-in users get a Dashboard link in the header.
  const session = await getSession();
  return <LandingPage role={session?.role ?? null} />;
}
