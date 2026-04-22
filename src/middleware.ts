import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "auth_token";

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  let role: string | null = null;
  const secretKey = getSecret();
  if (token && secretKey) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      role = null;
    }
  }
  const isAuthenticated = Boolean(token && role);

  // Keep auth pages public so users can sign in.
  if (isAuthPage) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/orders", request.url));
    }
    if (role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Everything except login/register is private.
  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const nextPath = `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("next", nextPath);
    return NextResponse.redirect(url);
  }

  const isAdminPath = pathname.startsWith("/admin");

  if (role === "ADMIN" && !isAdminPath) {
    return NextResponse.redirect(new URL("/admin/orders", request.url));
  }

  if (role === "CUSTOMER" && isAdminPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
