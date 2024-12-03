'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, DatePicker, Button, message, Popconfirm, Table } from 'antd';
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMonthRange } from '@/lib/date-utils';
import AuthWrapper from '@/components/auth-wrapper';
import { EditableProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  lastMonthQuantity: number;
  lastMonthAmount: number;
  purchaseQuantity: number;
  purchaseAmount: number;
  consumeQuantity: number;
  consumeAmount: number;
  currentQuantity: number;
  currentAmount: number;
}

interface InventoryData {
  data: InventoryItem[];
  totals: {
    lastMonthQuantity: number;
    lastMonthAmount: number;
    purchaseQuantity: number;
    purchaseAmount: number;
    consumeQuantity: number;
    consumeAmount: number;
    currentQuantity: number;
    currentAmount: number;
  };
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(false);
  const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);
  const actionRef = useRef<ActionType>();
  const [month, setMonth] = useState(() => {
    const { startDate } = getMonthRange();
    return dayjs(startDate);
  });
  const [data, setData] = useState<InventoryData>({
    data: [],
    totals: {
      lastMonthQuantity: 0,
      lastMonthAmount: 0,
      purchaseQuantity: 0,
      purchaseAmount: 0,
      consumeQuantity: 0,
      consumeAmount: 0,
      currentQuantity: 0,
      currentAmount: 0,
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getMonthRange(month.toDate());
      const res = await fetch('/api/inventory/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('获取数据失败');
      }

      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Load inventory data error:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const handleSave = async (key: React.Key, row: InventoryItem) => {
    try {
      const { startDate, endDate } = getMonthRange(month.toDate());
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: row.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          data: row,
        }),
      });

      if (!res.ok) {
        throw new Error('更新失败');
      }

      message.success('更新成功');
      loadData();
    } catch (error) {
      console.error('Update inventory data error:', error);
      message.error('更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error('删除失败');
      }

      message.success('删除成功');
      loadData();
    } catch (error) {
      console.error('Delete inventory data error:', error);
      message.error('删除失败');
    }
  };

  const columns: ProColumns<InventoryItem>[] = [
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'left',
      render: (_, record) => [
        <Popconfirm
          key="delete"
          title="确定要删除吗？"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
          />
        </Popconfirm>,
      ],
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 200,
      // readonly: true,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 80,
      readonly: true,
    },
    {
      title: '类别',
      dataIndex: 'category',
      width: 120,
      readonly: true,
    },
    {
      title: '期初',
      children: [
        {
          title: '数量',
          dataIndex: 'lastMonthQuantity',
          width: 100,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
        {
          title: '金额',
          dataIndex: 'lastMonthAmount',
          width: 120,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
      ],
    },
    {
      title: '本期采购',
      children: [
        {
          title: '数量',
          dataIndex: 'purchaseQuantity',
          width: 100,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
        {
          title: '金额',
          dataIndex: 'purchaseAmount',
          width: 120,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
      ],
    },
    {
      title: '本期消耗',
      children: [
        {
          title: '数量',
          dataIndex: 'consumeQuantity',
          width: 100,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
        {
          title: '金额',
          dataIndex: 'consumeAmount',
          width: 120,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
      ],
    },
    {
      title: '期末',
      children: [
        {
          title: '数量',
          dataIndex: 'currentQuantity',
          width: 100,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
        {
          title: '金额',
          dataIndex: 'currentAmount',
          width: 120,
          align: 'right',
          valueType: 'digit',
          fieldProps: {
            precision: 2,
          },
        },
      ],
    },
  ];

  const handleExport = async () => {
    try {
      const { startDate, endDate } = getMonthRange(month.toDate());
      const res = await fetch('/api/inventory/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('导出失败');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `库存盘点表_${month.format('YYYY年MM月')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export inventory data error:', error);
      message.error('导出失败');
    }
  };

  return (
    <AuthWrapper>
      <EditableProTable<InventoryItem>
         columns={columns}
         value={data.data}
        headerTitle={
          <div>
            <div className="text-lg font-medium">库存盘点</div>
            <div className="text-sm text-gray-500 mt-1">
              {(() => {
                const { startDate, endDate } = getMonthRange(month.toDate());
                return `${dayjs(startDate).format('YYYY-MM-DD')} 至 ${dayjs(endDate).format('YYYY-MM-DD')}`;
              })()}
            </div>
          </div>
        }
        actionRef={actionRef}
        loading={loading}
        // columns={columns}
        value={data.data}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        search={false}
        dateFormatter="string"
        options={false}
        recordCreatorProps={false}
        editable={{
          type: 'multiple',
          editableKeys,
          onChange: setEditableKeys,
          onSave: handleSave,
          actionRender: (row, config, defaultDom) => [defaultDom.save, defaultDom.cancel],
        }}
        toolBarRender={() => [
          <DatePicker.MonthPicker
            key="monthPicker"
            value={month}
            onChange={(value) => value && setMonth(value)}
            allowClear={false}
          />,
          <Button
            key="export"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={loading || data.data.length === 0}
          >
            导出Excel
          </Button>,
        ]}
        summary={() => {
          const { totals } = data;
          return (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  合计金额
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  {totals.lastMonthAmount.toFixed(2)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  -
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  {totals.purchaseAmount.toFixed(2)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  -
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8}>
                  {totals.consumeAmount.toFixed(2)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9}>
                  -
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10}>
                  {totals.currentAmount.toFixed(2)}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </AuthWrapper>
  );
}
