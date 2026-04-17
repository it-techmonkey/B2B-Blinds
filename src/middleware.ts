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

  const isAdminPath = pathname.startsWith("/admin");
  const isShopCatalogPath =
    pathname === "/" || pathname === "/catalog" || pathname.startsWith("/catalog/");
  const isOrdersPath = pathname === "/orders" || pathname.startsWith("/orders/");
  const isGuestCheckoutPath = pathname === "/orders/checkout";

  if (isAdminPath) {
    if (!token || role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isShopCatalogPath) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/products", request.url));
    }
    return NextResponse.next();
  }

  if (isOrdersPath) {
    if (isGuestCheckoutPath) {
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/products", request.url));
      }
      return NextResponse.next();
    }
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/products", request.url));
    }
    if (role !== "CUSTOMER") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/" && token && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/orders", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/catalog", "/catalog/:path*", "/orders", "/orders/:path*"],
};
