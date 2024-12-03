'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Card, message, Table, Typography, Popconfirm, DatePicker, Space } from 'antd';
import { getInventoryDateRange, formatDateRange } from '@/lib/date-utils';
import dayjs from 'dayjs';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Text } = Typography;
const { MonthPicker } = DatePicker;

// 单位换算为公斤的函数
const convertToKg = (quantity: number, unit: string, kgRatio: number = 1) => {
  const conversionRates: { [key: string]: number } = {
    'kg': 1,
    'g': 0.001,
    't': 1000,
    'lb': 0.4536,
    'oz': 0.0283495,
  };
  
  const rate = conversionRates[unit.toLowerCase()] || 1;
  return quantity * rate * kgRatio;
};

// 计算每公斤单价
const calculatePricePerKg = (price: number, unit: string, kgRatio: number = 1) => {
  const conversionRates: { [key: string]: number } = {
    'kg': 1,
    'g': 0.001,
    't': 1000,
    'lb': 0.4536,
    'oz': 0.0283495,
  };
  
  const rate = conversionRates[unit.toLowerCase()] || 1;
  return Number((price / (rate * kgRatio)).toFixed(2));
};

// 计算金额
const calculateAmount = (quantity: number, pricePerKg: number) => {
  return Number((quantity * pricePerKg).toFixed(2));
};

// 格式化数量显示（两位小数）
const formatQuantity = (quantity: number) => {
  return Number(quantity || 0).toFixed(2);
};

// 格式化金额显示（两位小数）
const formatAmount = (amount: number) => {
  return `¥${Number(amount || 0).toFixed(2)}`;
};

// 格式化单价显示（两位小数）
const formatPrice = (price: number) => {
  return `¥${Number(price || 0).toFixed(2)}/kg`;
};

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  price: number;
  purchaseQuantity: number;
  kgRatio: number;  // 使用 kgRatio 替代 kgConversion
  originalUnit: string;
  originalQuantity: number;
  originalPrice: number;
  lastMonthQuantity: number;
  lastMonthAmount: number;
  consumeQuantity: number;
  consumeAmount: number;
  currentQuantity: number;
  currentAmount: number;
  purchaseAmount: number;
}

interface InventoryTotals {
  lastMonthAmount: number;
  purchaseAmount: number;
  consumeAmount: number;
  currentAmount: number;
}

const PAGE_SIZE = 50;

export default function InventoryCheckList() {
  const [dataSource, setDataSource] = useState<InventoryItem[]>([]);
  const [totals, setTotals] = useState<InventoryTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(1);
  const [total, setTotal] = useState(0);
  const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);
  // 默认选择当前月份
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(() => {
    const now = dayjs();
    // 如果当前日期大于25号，选择当前月
    // 如果当前日期小于等于25号，选择上个月
    return now.date() > 25 ? now : now.subtract(1, 'month');
  });
  const actionRef = useRef<ActionType>();

  // 使用工具函数计算日期范围
  const dateRange = getInventoryDateRange(selectedMonth);

  console.log('Selected month range:', {
    month: selectedMonth.format('YYYY-MM'),
    ...dateRange,
  });

  // 提取和合并 productList
  const processProductList = (data: any[]) => {
    const productMap = new Map();

    data.forEach(dateItem => {
      dateItem.products.forEach(product => {
        const { productList } = product;
        if (productList) {
          // 将接口返回的数量转换为公斤
          const kgQuantity = Number(convertToKg(
            product.quantity || 0,
            product.unit || 'kg',
            product.kgRatio || 1
          ).toFixed(2));

          // 计算每公斤单价
          const pricePerKg = calculatePricePerKg(
            product.price || 0,
            product.unit || 'kg',
            product.kgRatio || 1
          );

          if (!productMap.has(productList.id)) {
            productMap.set(productList.id, {
              id: productList.id,
              name: productList.name,
              unit: 'kg',
              price: pricePerKg,
              purchaseQuantity: kgQuantity,
              lastMonthQuantity: 0,
              consumeQuantity: 0,
              currentQuantity: kgQuantity,
              // 自动计算金额
              lastMonthAmount: 0, // 初始值为0
              purchaseAmount: calculateAmount(kgQuantity, pricePerKg),
              consumeAmount: 0, // 初始值为0
              currentAmount: calculateAmount(kgQuantity, pricePerKg),
            });
          } else {
            const existingProduct = productMap.get(productList.id);
            
            // 更新采购数量（公斤）
            existingProduct.purchaseQuantity += kgQuantity;
            
            if (product.price) {
              existingProduct.price = pricePerKg;
            }

            // 更新当前数量（公斤）
            existingProduct.currentQuantity += kgQuantity;
            
            // 自动计算所有金额
            existingProduct.lastMonthAmount = calculateAmount(existingProduct.lastMonthQuantity, existingProduct.price);
            existingProduct.purchaseAmount = calculateAmount(existingProduct.purchaseQuantity, existingProduct.price);
            existingProduct.consumeAmount = calculateAmount(existingProduct.consumeQuantity, existingProduct.price);
            existingProduct.currentAmount = calculateAmount(existingProduct.currentQuantity, existingProduct.price);
          }
        }
      });
    });

    return Array.from(productMap.values());
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching inventory check data:', {
        month: selectedMonth.format('YYYY-MM'),
        ...dateRange,
      });

      const response = await fetch(`/api/inventory/in?start=${dateRange.start}&end=${dateRange.end}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取数据失败');
      }

      const data = await response.json();
      console.log('Raw response data:', JSON.stringify(data, null, 2));

      if (!Array.isArray(data)) {
        console.error('Expected array but got:', typeof data);
        setDataSource([]);
        setTotal(0);
        setCurrent(1);
        return;
      }

      // 处理数据
      const records = processProductList(data);
      console.log('Processed records:', records);

      setDataSource(records);
      setTotal(records.length);
      setCurrent(1);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || '获取数据失败');
      setDataSource([]);
      setTotal(0);
      setCurrent(1);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, dateRange]);

  const handleSave = async (key: React.Key, row: InventoryItem) => {
    try {
      const response = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(row),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update data');
      }

      message.success('更新成功');
      loadData();
    } catch (error) {
      console.error('Error updating data:', error);
      message.error(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete data');
      }

      message.success('删除成功');
      loadData();
    } catch (error) {
      console.error('Error deleting data:', error);
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleExport = async () => {
    if (!dataSource || dataSource.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    try {
      setLoading(true);
      
      const month = selectedMonth.format('YYYY年MM月');
      const filename = `${month}库存盘点表.xlsx`;

      const headers = [
        '商品名称', 
        '单价(元/kg)',
        '上月数量(kg)', 
        '上月金额(元)',
        '本月采购数量(kg)', 
        '本月采购金额(元)',
        '本月消耗数量(kg)', 
        '本月消耗金额(元)',
        '本月结存数量(kg)', 
        '本月结存金额(元)'
      ];

      const records = dataSource.map((item: any) => {
        return [
          item.name || '未知产品',
          formatPrice(item.price),
          formatQuantity(item.lastMonthQuantity),
          formatAmount(item.lastMonthAmount),
          formatQuantity(item.purchaseQuantity),
          formatAmount(item.purchaseAmount),
          formatQuantity(item.consumeQuantity),
          formatAmount(item.consumeAmount),
          formatQuantity(item.currentQuantity),
          formatAmount(item.currentAmount)
        ];
      });

      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet([headers, ...records]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, month);

      // 导出文件
      XLSX.writeFile(wb, filename);

      message.success('导出成功');
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalAmount = (data: any[], field: string) => {
    return data.reduce((sum, item) => {
      return sum + item[field];
    }, 0);
  };

  const columns: ProColumns<InventoryItem>[] = [
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 120,
      fixed: 'left',
      editable: false,
    },
    {
      title: '单价(元/kg)',
      dataIndex: 'price',
      width: 120,
      valueType: 'money',
      render: (_, record) => formatPrice(record.price),
    },
    {
      title: '上月结存',
      children: [
        {
          title: '数量(kg)',
          dataIndex: 'lastMonthQuantity',
          width: 100,
          valueType: 'digit',
          render: (value) => formatQuantity(Number(value)),
        },
        {
          title: '金额(元)',
          width: 100,
          dataIndex: 'lastMonthAmount',
          render: (_, record) => formatAmount(record.lastMonthAmount),
        },
      ],
    },
    {
      title: '本月采购',
      children: [
        {
          title: '数量(kg)',
          dataIndex: 'purchaseQuantity',
          width: 120,
          valueType: 'digit',
          render: (value) => formatQuantity(Number(value)),
        },
        {
          title: '金额(元)',
          width: 120,
          dataIndex: 'purchaseAmount',
          render: (_, record) => formatAmount(record.purchaseAmount),
        },
      ],
    },
    {
      title: '本月消耗',
      children: [
        {
          title: '数量(kg)',
          dataIndex: 'consumeQuantity',
          width: 100,
          valueType: 'digit',
          render: (value) => formatQuantity(Number(value)),
        },
        {
          title: '金额(元)',
          width: 100,
          dataIndex: 'consumeAmount',
          render: (_, record) => formatAmount(record.consumeAmount),
        },
      ],
    },
    {
      title: '本月结存',
      children: [
        {
          title: '数量(kg)',
          dataIndex: 'currentQuantity',
          width: 100,
          valueType: 'digit',
          render: (value) => formatQuantity(Number(value)),
        },
        {
          title: '金额(元)',
          width: 100,
          dataIndex: 'currentAmount',
          render: (_, record) => formatAmount(record.currentAmount),
        },
      ],
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (text, record, _, action) => [
        <a
          key="edit"
          onClick={() => {
            action?.startEditable?.(record.id);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={() => handleDelete(record.id)}
        >
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  const handleMonthChange = useCallback((date: dayjs.Dayjs) => {
    console.log('Month changed:', {
      from: selectedMonth.format('YYYY-MM'),
      to: date.format('YYYY-MM'),
      ...getInventoryDateRange(date),
    });
    setSelectedMonth(date);
    setLoading(true);
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedMonth]);

  if (error) {
    return (
      <Card
        title={`${selectedMonth.format('YYYY年MM月')}库存盘点表`}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => loadData()}
            loading={loading}
          >
            重试
          </Button>
        }
      >
        <Text type="danger">{error}</Text>
      </Card>
    );
  }

  return (
    <Card
      title={`库存盘点表 (${formatDateRange(dateRange)})`}
      extra={
        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'right' }}>
          <Space>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              allowClear={false}
              disabledDate={(current) => {
                // 只允许选择当前月份及之前的月份
                return current && current > dayjs().endOf('month');
              }}
            />
            <Button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              icon={<ReloadOutlined />}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={!dataSource || dataSource.length === 0}
              loading={loading}
            >
              导出Excel
            </Button>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            统计区间：{dateRange.start} 至 {dateRange.end}
          </Text>
        </Space>
      }
    >
      <EditableProTable<InventoryItem>
        rowKey="id"
        scroll={{ x: 900 }}
        loading={loading}
        columns={columns}
        value={dataSource}
        onChange={setDataSource}
        actionRef={actionRef}
        editable={{
          type: 'single',
          editableKeys,
          onChange: setEditableKeys,
          onSave: handleSave,
          actionRender: (row, config, defaultDom) => [defaultDom.save, defaultDom.cancel],
        }}
        pagination={{
          current,
          pageSize: PAGE_SIZE,
          total,
          onChange: (page) => loadData(),
        }}
        summary={(pageData) => {
          // 计算各列金额总和
          const lastMonthTotal = calculateTotalAmount(pageData, 'lastMonthAmount');
          const purchaseTotal = calculateTotalAmount(pageData, 'purchaseAmount');
          const consumeTotal = calculateTotalAmount(pageData, 'consumeAmount');
          const currentTotal = calculateTotalAmount(pageData, 'currentAmount');

          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>合计</Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}>{formatAmount(lastMonthTotal)}</Table.Summary.Cell>
              <Table.Summary.Cell index={4}></Table.Summary.Cell>
              <Table.Summary.Cell index={5}>{formatAmount(purchaseTotal)}</Table.Summary.Cell>
              <Table.Summary.Cell index={6}></Table.Summary.Cell>
              <Table.Summary.Cell index={7}>{formatAmount(consumeTotal)}</Table.Summary.Cell>
              <Table.Summary.Cell index={8}></Table.Summary.Cell>
              <Table.Summary.Cell index={9}>{formatAmount(currentTotal)}</Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </Card>
  );
}
