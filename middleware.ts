import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  // No-op, placeholder for potential headers
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
