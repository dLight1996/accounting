'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Spin } from 'antd';

export default function AuthWrapper({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session && requireAuth && pathname !== '/login') {
      router.push('/login');
    }

    if (session && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [session, status, requireAuth, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" tip="加载中...">
          <div className="p-8" />
        </Spin>
      </div>
    );
  }

  if (!session && requireAuth && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
