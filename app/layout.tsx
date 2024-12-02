import type { Metadata } from 'next';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@/contexts/auth-context';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  title: '库存管理系统',
  description: '高效的库存管理解决方案',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <SessionProvider>
            <ConfigProvider locale={zhCN}>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ConfigProvider>
          </SessionProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
