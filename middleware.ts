import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('auth-token');
  const isLoginPage = request.nextUrl.pathname === '/login';

  // 如果用户未登录且不在登录页面，重定向到登录页面
  if (!isAuthenticated && !isLoginPage && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 如果用户已登录且在登录页面，重定向到仪表盘
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
