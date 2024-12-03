'use client';

import { useState } from 'react';
import { Card, Button, Modal, message, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import AuthWrapper from '@/components/auth-wrapper';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const showConfirm = () => {
    Modal.confirm({
      title: '清空数据库',
      icon: <ExclamationCircleOutlined />,
      content: '确定要清空所有数据吗？此操作不可恢复！',
      okText: '确认清空',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: clearDatabase,
    });
  };

  const clearDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('清空数据库失败');
      }

      message.success('数据库已清空');
    } catch (error: any) {
      console.error('Error clearing database:', error);
      message.error(error.message || '清空数据库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <Card title="系统设置">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card type="inner" title="数据管理">
            <Button 
              danger 
              type="primary" 
              onClick={showConfirm}
              loading={loading}
            >
              清空数据库
            </Button>
            <div style={{ marginTop: 8 }}>
              <small style={{ color: '#999' }}>
                此操作将清空所有数据，包括产品、库存、交易记录等。此操作不可恢复！
              </small>
            </div>
          </Card>
        </Space>
      </Card>
    </AuthWrapper>
  );
}
