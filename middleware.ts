import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PROTECTED = [
  /^\/dashboard(\/|$)/,
  /^\/task(\/|$)/,
  /^\/brand(\/|$)/,
  /^\/upgrade(\/|$)/,
  /^\/coach(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/shipped(\/|$)/,
  /^\/admin(\/|$)/,
];

function isProtected(path: string) {
  return PROTECTED.some((re) => re.test(path));
}

export default auth((req) => {
  const { nextUrl } = req as unknown as { nextUrl: URL };
  const path = nextUrl.pathname;
  const isAuthed = !!(req as unknown as { auth?: unknown }).auth;

  if (isProtected(path) && !isAuthed) {
    const url = new URL("/login", nextUrl.origin);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|map)).*)",
  ],
};
