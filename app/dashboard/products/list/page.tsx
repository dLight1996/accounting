'use client';

import { useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import AuthWrapper from '@/components/auth-wrapper';

interface ProductListItem {
  id: number;
  name: string;
  price: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ProductListPage() {
  const columns: ProColumns<ProductListItem>[] = [
    {
      title: '商品名称',
      dataIndex: 'name',
      ellipsis: true,
      width: 200,
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 120,
      render: (text) => `¥${Number(text).toFixed(2)}`,
      sorter: true,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      valueType: 'dateTime',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
    },
  ];

  return (
    <AuthWrapper>
      <ProTable<ProductListItem>
        columns={columns}
        request={async (params) => {
          const response = await fetch('/api/products/list?' + new URLSearchParams({
            current: params.current?.toString() || '1',
            pageSize: params.pageSize?.toString() || '10',
            ...params,
          }));
          
          if (!response.ok) {
            throw new Error('加载失败');
          }

          const data = await response.json();
          return {
            data: data.items,
            success: true,
            total: data.total,
          };
        }}
        rowKey="id"
        pagination={{
          showQuickJumper: true,
          defaultPageSize: 10,
        }}
        search={{
          filterType: 'light',
        }}
        dateFormatter="string"
        headerTitle="商品列表"
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
      />
    </AuthWrapper>
  );
}
