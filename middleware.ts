import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Start with the default response
  const response = NextResponse.next();

  // Check for cart cookie on the incoming request
  const hasCartCookie = request.cookies.get("sessionCartId");

  if (!hasCartCookie) {
    const sessionCartId = crypto.randomUUID();

    // Write the cookie on the response
    response.cookies.set("sessionCartId", sessionCartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // available everywhere
    });
  }

  return response;
}

// Run on all routes except static assets (optional but recommended)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};