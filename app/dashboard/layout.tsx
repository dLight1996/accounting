'use client';

import { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Spin } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: 'inventory',
    icon: <ShoppingCartOutlined />,
    label: '库存管理',
    children: [
      {
        key: 'inventory/list',
        label: '库存列表',
      },
      {
        key: 'inventory/in',
        label: '入库管理',
      },
      {
        key: 'inventory/out',
        label: '出库管理',
      },
    ],
  },
  {
    key: 'products',
    icon: <ShopOutlined />,
    label: '商品管理',
    children: [
      {
        key: 'products/list',
        label: '商品列表',
      },
      {
        key: 'products/category',
        label: '分类管理',
      },
    ],
  },
  {
    key: 'statistics',
    icon: <BarChartOutlined />,
    label: '统计分析',
    children: [
      {
        key: 'statistics/sales',
        label: '销售分析',
      },
      {
        key: 'statistics/inventory',
        label: '库存分析',
      },
    ],
  },
  {
    key: 'users',
    icon: <UserOutlined />,
    label: '用户管理',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中...">
          <div className="p-8" />
        </Spin>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(`/dashboard/${key}`);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Layout className="min-h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="shadow-lg"
        width={260}
        collapsedWidth={80}
        style={{
          background: colorBgContainer,
          borderRight: '1px solid rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="p-6 flex items-center justify-center border-b border-gray-100">
          <h1 className={`text-xl font-bold text-blue-600 transition-all duration-300 ${
            collapsed ? 'scale-0 w-0' : 'scale-100 w-auto'
          }`}>
            库存管理系统
          </h1>
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className={`flex items-center space-x-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">{user?.username ? user.username.charAt(0).toUpperCase() : ''}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{user?.username}</div>
                <div className="text-sm text-gray-500 truncate">{user?.role}</div>
              </div>
            )}
          </div>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          style={{ 
            border: 'none',
            padding: '16px 0'
          }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header 
          style={{ 
            padding: 0, 
            background: colorBgContainer,
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          }}
          className="flex justify-between items-center px-4 shadow-sm"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          />
          <div className="flex items-center space-x-4">
            <Button 
              type="text" 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="flex items-center"
            >
              退出登录
            </Button>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
