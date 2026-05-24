import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const publicPaths = new Set(['/', '/search', '/login']);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api') || publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const login = new URL('/login', req.url);
    login.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
