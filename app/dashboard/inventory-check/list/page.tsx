'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Card, message, Table, Typography, Popconfirm, DatePicker, Space } from 'antd';
import { getMonthRange } from '@/lib/date-utils';
import dayjs from 'dayjs';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { exportToExcel } from '@/lib/excel-utils';

const { Text } = Typography;
const { MonthPicker } = DatePicker;

const formatMoney = (value: number) => {
  return `¥ ${value.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 添加单位换算函数
const convertToKg = (quantity: number, unit: string) => {
  const conversionRates: { [key: string]: number } = {
    'kg': 1,
    'g': 0.001,
    '斤': 0.5,
    '两': 0.05,
    'ml': 0.001,  // 假设密度为1
    'L': 1,       // 假设密度为1
  };
  
  const rate = conversionRates[unit] || 1;
  return quantity * rate;
};

// 格式化数量显示
const formatQuantity = (value: number, unit: string) => {
  const kgValue = convertToKg(value, unit);
  return `${kgValue.toFixed(3)}`;
};

// 计算kg单价
const calculatePricePerKg = (amount: number, quantity: number, unit: string) => {
  const kgQuantity = convertToKg(quantity, unit);
  return kgQuantity > 0 ? amount / kgQuantity : 0;
};

// 格式化金额显示
const formatAmount = (amount: number, quantity: number, unit: string) => {
  const pricePerKg = calculatePricePerKg(amount, quantity, unit);
  return formatMoney(pricePerKg);
};

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  lastMonthQuantity: number;
  lastMonthAmount: number;
  purchaseQuantity: number;
  purchaseAmount: number;
  consumeQuantity: number;
  consumeAmount: number;
  currentQuantity: number;
  currentAmount: number;
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
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const actionRef = useRef<ActionType>();

  const loadData = useCallback(async (page = current) => {
    try {
      setLoading(true);
      setError(null);
      
      const { startDate, endDate } = getMonthRange(selectedMonth.toDate());
      const response = await fetch('/api/inventory/report/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString(),
          current: page,
          pageSize: PAGE_SIZE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const { data, totals, total: totalCount, current: currentPage } = await response.json();
      setDataSource(data);
      setTotals(totals);
      setTotal(totalCount);
      setCurrent(currentPage);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [current, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedMonth]);

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
      loadData(current);
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
      loadData(current);
    } catch (error) {
      console.error('Error deleting data:', error);
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleExport = useCallback(async () => {
    if (!dataSource || dataSource.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    try {
      setLoading(true);
      const { startDate } = getMonthRange(selectedMonth.toDate());
      
      const response = await fetch('/api/inventory/report/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          startDate: startDate.toISOString(), 
          endDate: dayjs(startDate).endOf('month').toISOString(),
          current: 1,
          pageSize: total,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data for export');
      }

      const { data: allData } = await response.json();
      const month = dayjs(startDate).format('YYYY年MM月');
      const filename = `${month}库存盘点表.xlsx`;

      const headers = [
        '商品名称',
        '单价(元/kg)',
        '上月数量(kg)',
        '上月金额',
        '本月采购数量(kg)',
        '本月采购金额',
        '本月消耗数量(kg)',
        '本月消耗金额',
        '结存数量(kg)',
        '结存金额',
      ];

      const data = allData.map((item: InventoryItem) => [
        item.name,
        calculatePricePerKg(item.currentAmount, item.currentQuantity, item.unit).toFixed(2),
        formatQuantity(item.lastMonthQuantity, item.unit),
        item.lastMonthAmount.toFixed(2),
        formatQuantity(item.purchaseQuantity, item.unit),
        item.purchaseAmount.toFixed(2),
        formatQuantity(item.consumeQuantity, item.unit),
        item.consumeAmount.toFixed(2),
        formatQuantity(item.currentQuantity, item.unit),
        item.currentAmount.toFixed(2),
      ]);

      if (totals) {
        // 计算平均单价
        const calculateAveragePrice = (amount: number, items: InventoryItem[], quantityField: keyof InventoryItem) => {
          const totalKg = items.reduce((sum, item) => sum + convertToKg(item[quantityField] as number, item.unit), 0);
          return totalKg > 0 ? amount / totalKg : 0;
        };

        const currentAveragePrice = calculateAveragePrice(totals.currentAmount, allData, 'currentQuantity');

        data.push([
          '合计',
          currentAveragePrice.toFixed(2),
          allData.reduce((sum, item) => sum + convertToKg(item.lastMonthQuantity, item.unit), 0).toFixed(3),
          totals.lastMonthAmount.toFixed(2),
          allData.reduce((sum, item) => sum + convertToKg(item.purchaseQuantity, item.unit), 0).toFixed(3),
          totals.purchaseAmount.toFixed(2),
          allData.reduce((sum, item) => sum + convertToKg(item.consumeQuantity, item.unit), 0).toFixed(3),
          totals.consumeAmount.toFixed(2),
          allData.reduce((sum, item) => sum + convertToKg(item.currentQuantity, item.unit), 0).toFixed(3),
          totals.currentAmount.toFixed(2),
        ]);
      }

      exportToExcel(headers, data, filename);
      message.success('导出成功');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  }, [dataSource, totals, total]);

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
      dataIndex: 'currentAmount',
      width: 100,
      render: (_, record) => formatAmount(record.currentAmount, record.currentQuantity, record.unit),
    },
    {
      title: '上月结存',
      children: [
        {
          title: '数量(kg)',
          dataIndex: 'lastMonthQuantity',
          width: 100,
          valueType: 'digit',
          render: (_, record) => formatQuantity(record.lastMonthQuantity, record.unit),
        },
        {
          title: '金额',
          dataIndex: 'lastMonthAmount',
          width: 100,
          valueType: 'money',
        },
      ],
    },
    {
      title: '本月采购',
      children: [
        {
          title: '数量(kg)',
          dataIndex: 'purchaseQuantity',
          width: 100,
          valueType: 'digit',
          render: (_, record) => formatQuantity(record.purchaseQuantity, record.unit),
        },
        {
          title: '金额',
          dataIndex: 'purchaseAmount',
          width: 100,
          valueType: 'money',
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
          render: (_, record) => formatQuantity(record.consumeQuantity, record.unit),
        },
        {
          title: '金额',
          dataIndex: 'consumeAmount',
          width: 100,
          valueType: 'money',
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
          render: (_, record) => formatQuantity(record.currentQuantity, record.unit),
        },
        {
          title: '金额',
          dataIndex: 'currentAmount',
          width: 100,
          valueType: 'money',
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

  const { startDate, endDate } = getMonthRange(selectedMonth.toDate());

  return (
    <Card
      title={`库存盘点表`}
      extra={
        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'right' }}>
          <Space>
            <MonthPicker
              value={selectedMonth}
              onChange={(date) => {
                if (date) {
                  setLoading(true);
                  setSelectedMonth(date);
                  setCurrent(1);
                }
              }}
              format="YYYY年MM月"
              style={{ width: '120px' }}
              placeholder="选择月份"
              allowClear={false}
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
            统计区间：{dayjs(startDate).format('YYYY年MM月DD日')} 至 {dayjs(endDate).format('MM月DD日')}
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
          onChange: (page) => loadData(page),
        }}
        summary={() => {
          if (!totals) return null;
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2}>{formatMoney(totals.lastMonthAmount)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4}>{formatMoney(totals.purchaseAmount)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
                <Table.Summary.Cell index={6}>{formatMoney(totals.consumeAmount)}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} />
                <Table.Summary.Cell index={8}>{formatMoney(totals.currentAmount)}</Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </Card>
  );
}
