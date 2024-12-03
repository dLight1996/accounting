'use client';

import { useEffect, useState } from 'react';
import { Card, Table, message, Typography, Empty, DatePicker, Space, Button, Modal } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import AuthWrapper from '@/components/auth-wrapper';
import { getMonthRange, type MonthRange } from '@/lib/date-utils';
import { DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Product {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  price: number;
  unit: string;
}

interface InventoryRecord {
  id: string;
  date: string;
  products: Product[];
}

export default function InventoryInPage() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs('2024-11-01'));
  const [dateRange, setDateRange] = useState<MonthRange>(getMonthRange());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchRecords = async (month: Dayjs) => {
    try {
      setLoading(true);
      const range = getMonthRange(month.toDate());
      setDateRange(range);
      
      console.log('Fetching records for month:', {
        month: month.format('YYYY-MM'),
        range: {
          start: dayjs(range.startDate).format('YYYY-MM-DD'),
          end: dayjs(range.endDate).format('YYYY-MM-DD'),
        }
      });

      const response = await fetch(`/api/inventory/in?start=${dayjs(range.startDate).format('YYYY-MM-DD')}&end=${dayjs(range.endDate).format('YYYY-MM-DD')}`);
      if (!response.ok) {
        throw new Error('获取数据失败');
      }
      
      const data = await response.json();
      console.log('Received records:', data);
      setRecords(data);
    } catch (error: any) {
      console.error('Error fetching records:', error);
      message.error(error.message || '获取数据失败');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(selectedMonth);
  }, [selectedMonth]);

  const handleMonthChange = (month: Dayjs | null) => {
    if (month) {
      setSelectedMonth(month);
    }
  };

  const handleDelete = async (product: Product) => {
    setProductToDelete(product);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setLoading(true);
      const response = await fetch('/api/inventory/in', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: productToDelete.id }),
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      message.success('删除成功');
      fetchRecords(selectedMonth);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      message.error(error.message || '删除失败');
    } finally {
      setLoading(false);
      setDeleteModalVisible(false);
      setProductToDelete(null);
    }
  };

  const expandedRowRender = (record: InventoryRecord) => {
    const columns = [
      { 
        title: '商品名称', 
        dataIndex: 'name', 
        key: 'name',
        width: '25%',
        ellipsis: true,
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
        align: 'center',
      },
      { 
        title: '单价', 
        dataIndex: 'unitPrice', 
        key: 'unitPrice',
        width: 120,
        align: 'right',
        render: (price: number) => `¥${price.toFixed(2)}`
      },
      { 
        title: '数量', 
        dataIndex: 'quantity', 
        key: 'quantity',
        width: 120,
        align: 'right',
        render: (quantity: number, product: Product) => `${quantity} ${product.unit}`
      },
      { 
        title: '金额', 
        dataIndex: 'price', 
        key: 'price',
        width: 120,
        align: 'right',
        render: (price: number) => `¥${price.toFixed(2)}`
      },
      {
        title: '操作',
        key: 'action',
        width: 80,
        align: 'center',
        render: (_: any, product: Product) => (
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(product)}
          >
            删除
          </Button>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={record.products}
        pagination={false}
        rowKey="id"
        size="middle"
        style={{ marginBottom: 16 }}
      />
    );
  };

  const columns = [
    {
      title: '入库日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      align: 'center',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '商品名称',
      key: 'products',
      render: (_: any, record: InventoryRecord) => (
        <div style={{ maxWidth: 400 }}>
          {record.products.map((product, index) => (
            <Text key={product.id} ellipsis style={{ display: 'inline-block', marginRight: 12 }}>
              {product.name} {product.quantity}{product.unit}
              {index < record.products.length - 1 ? '，' : ''}
            </Text>
          ))}
        </div>
      ),
    },
    {
      title: '单价',
      key: 'unitPrices',
      width: 200,
      align: 'right',
      render: (_: any, record: InventoryRecord) => (
        <div>
          {record.products.map((product, index) => (
            <span key={product.id} style={{ marginRight: 12 }}>
              ¥{product.unitPrice.toFixed(2)}/{product.unit}
              {index < record.products.length - 1 ? '，' : ''}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: '商品数量',
      key: 'productCount',
      width: 100,
      align: 'center',
      render: (_, record: InventoryRecord) => record.products.length,
    },
    {
      title: '总金额',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (_, record: InventoryRecord) => 
        `¥${record.products.reduce((sum, product) => sum + product.price, 0).toFixed(2)}`,
    },
  ];

  return (
    <AuthWrapper>
      <Card 
        title="入库记录" 
        extra={
          <Space direction="vertical" size="small" style={{ textAlign: 'right' }}>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              allowClear={false}
              format="YYYY年MM月"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(dateRange.startDate).format('YYYY-MM-DD')} 至 {dayjs(dateRange.endDate).format('YYYY-MM-DD')}
            </Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          expandable={{
            expandedRowRender,
          }}
          loading={loading}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: <Empty description="暂无入库记录" />
          }}
          size="middle"
        />
      </Card>

      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setProductToDelete(null);
        }}
        okText="确认"
        cancelText="取消"
        confirmLoading={loading}
      >
        <p>确定要删除以下商品记录吗？</p>
        {productToDelete && (
          <div>
            <p>商品名称：{productToDelete.name}</p>
            <p>单价：¥{productToDelete.unitPrice.toFixed(2)}</p>
            <p>数量：{productToDelete.quantity} {productToDelete.unit}</p>
            <p>金额：¥{productToDelete.price.toFixed(2)}</p>
          </div>
        )}
      </Modal>
    </AuthWrapper>
  );
}
