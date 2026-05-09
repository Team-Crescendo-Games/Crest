import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_ROUTES = ["/sign-in", "/sign-up", "/set-password"];
const PUBLIC_PREFIXES = ["/invite/", "/api/auth/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (req.auth && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Exclude Next.js internals and public static assets (logo images used on auth pages)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-dark.png|logo-light.png).*)"],
};
