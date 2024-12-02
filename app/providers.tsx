'use client';

import React from 'react';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import zhCN from 'antd/locale/zh_CN';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 8,
            colorBgContainer: '#ffffff',
            fontSize: 14,
            controlHeight: 40,
          },
          components: {
            Button: {
              controlHeight: 44,
              paddingInline: 16,
              fontSize: 14,
            },
            Input: {
              controlHeight: 44,
              paddingInline: 16,
              borderRadius: 8,
            },
            Select: {
              controlHeight: 44,
              borderRadius: 8,
            },
            Form: {
              marginLG: 24,
            }
          }
        }}
      >
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
};

export default Providers;
