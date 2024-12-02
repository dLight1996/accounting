import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth-options';

export { authOptions };

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('未授权访问');
  }
  
  return session.user;
}

export function unauthorized() {
  return new NextResponse(
    JSON.stringify({ message: '未授权访问' }),
    { status: 401, headers: { 'content-type': 'application/json' } }
  );
}

export function forbidden() {
  return new NextResponse(
    JSON.stringify({ message: '没有权限访问' }),
    { status: 403, headers: { 'content-type': 'application/json' } }
  );
}
