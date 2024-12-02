'use client';

import { useState } from 'react';
import { Card, Button, Form, DatePicker, Table, Input, InputNumber, message, Popconfirm, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AuthWrapper from '@/components/auth-wrapper';

interface ProductEntry {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  price: number;
  unit: string;
  kgRatio: number; // 换算成kg的数量
}

export default function BatchAddPage() {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState<ProductEntry[]>([]);
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [loading, setLoading] = useState(false);

  // 计算当前周期的开始和结束日期
  const getCurrentCycleDates = () => {
    const today = dayjs();
    const currentDay = today.date();
    let cycleStart, cycleEnd;

    if (currentDay <= 25) {
      cycleStart = today.subtract(1, 'month').date(26);
      cycleEnd = today.date(25);
    } else {
      cycleStart = today.date(26);
      cycleEnd = today.add(1, 'month').date(25);
    }

    return { cycleStart, cycleEnd };
  };

  const { cycleStart, cycleEnd } = getCurrentCycleDates();

  const unitOptions = [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: '件', label: '件' },
    { value: '个', label: '个' },
    { value: '包', label: '包' },
    { value: '箱', label: '箱' },
    { value: '桶', label: '桶' },
    { value: '瓶', label: '瓶' },
    { value: '袋', label: '袋' },
    { value: '盒', label: '盒' },
    { value: '罐', label: '罐' },
    { value: '米', label: '米' },
    { value: '卷', label: '卷' },
    { value: '套', label: '套' }
  ];

  const handleAdd = () => {
    const newKey = Date.now().toString();
    setDataSource([...dataSource, {
      key: newKey,
      name: '',
      unitPrice: 0,
      quantity: 0,
      price: 0,
      unit: 'kg',
      kgRatio: 1
    }]);
  };

  const calculateTotalPrice = (unitPrice: number, quantity: number) => {
    return Number((unitPrice * quantity).toFixed(2));
  };

  const handleDelete = (key: string) => {
    setDataSource(dataSource.filter(item => item.key !== key));
  };

  const handleSave = async () => {
    if (!date) {
      message.error('请选择入库日期');
      return;
    }

    if (dataSource.length === 0) {
      message.error('请添加商品');
      return;
    }

    // 验证必填字段
    const invalidRow = dataSource.findIndex(item => !item.name);
    if (invalidRow !== -1) {
      message.error(`第 ${invalidRow + 1} 行商品名称为必填项`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/products/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date.toISOString(),
          products: dataSource.map(item => ({
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            kgRatio: item.kgRatio
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      const result = await response.json();
      message.success(result.message || '保存成功');
      
      // 清空表格数据
      setDataSource([]);
      // 重置日期为当前周期
      const { startDate, endDate } = getCurrentCycleDates();
      setDate(endDate);
      
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算总价
  const calculateGrandTotal = () => {
    return dataSource.reduce((sum, item) => sum + item.price, 0).toFixed(2);
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: ProductEntry) => (
        <Input
          value={text}
          onChange={e => {
            const newData = [...dataSource];
            const index = newData.findIndex(item => record.key === item.key);
            newData[index].name = e.target.value;
            setDataSource(newData);
          }}
          placeholder="请输入商品名称"
        />
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 120,
      render: (text: number, record: ProductEntry) => (
        <InputNumber
          value={text}
          onChange={value => {
            const newData = [...dataSource];
            const index = newData.findIndex(item => record.key === item.key);
            const newValue = value || 0;
            newData[index].unitPrice = newValue;
            newData[index].price = calculateTotalPrice(newValue, newData[index].quantity);
            setDataSource(newData);
          }}
          placeholder="请输入单价"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          addonAfter={`元/${record.unit}`}
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 120,
      render: (text: number, record: ProductEntry) => (
        <InputNumber
          value={text}
          onChange={value => {
            const newData = [...dataSource];
            const index = newData.findIndex(item => record.key === item.key);
            const newValue = value || 0;
            newData[index].quantity = newValue;
            newData[index].price = calculateTotalPrice(newData[index].unitPrice, newValue);
            setDataSource(newData);
          }}
          placeholder="请输入数量"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          addonAfter={record.unit}
        />
      ),
    },
    {
      title: '总价',
      dataIndex: 'price',
      width: 120,
      render: (text: number, record: ProductEntry) => (
        <InputNumber
          value={text}
          onChange={value => {
            const newData = [...dataSource];
            const index = newData.findIndex(item => record.key === item.key);
            newData[index].price = value || 0;
            setDataSource(newData);
          }}
          style={{ width: '100%' }}
          precision={2}
          addonAfter="元"
        />
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 100,
      render: (text: string, record: ProductEntry) => (
        <Select
          value={text}
          onChange={(value) => {
            const newData = [...dataSource];
            const index = newData.findIndex(item => record.key === item.key);
            newData[index].unit = value;
            // 如果切换到kg，设置换算比例为1
            if (value === 'kg') {
              newData[index].kgRatio = 1;
            }
            setDataSource(newData);
          }}
          options={unitOptions}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '换算(kg)',
      dataIndex: 'kgRatio',
      width: 120,
      render: (text: number, record: ProductEntry) => (
        record.unit !== 'kg' ? (
          <InputNumber
            value={text}
            onChange={value => {
              const newData = [...dataSource];
              const index = newData.findIndex(item => record.key === item.key);
              newData[index].kgRatio = value || 0;
              setDataSource(newData);
            }}
            placeholder="请输入换算成kg的数量"
            min={0}
            precision={3}
            style={{ width: '100%' }}
            addonAfter="kg"
          />
        ) : (
          <InputNumber
            value={record.quantity}
            disabled
            style={{ width: '100%' }}
            precision={3}
            addonAfter="kg"
          />
        )
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, record: ProductEntry) => (
        <Popconfirm
          title="确定删除此条记录吗？"
          onConfirm={() => handleDelete(record.key)}
        >
          <Button 
            type="text"
            danger
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <AuthWrapper>
      <Card
        title="商品批量录入"
        className="shadow-sm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加一行
          </Button>
        }
      >
        <div className="mb-6 max-w-xs">
          <Form.Item
            label="选择录入日期"
            required
            tooltip="选择商品录入的日期，必须在当前周期内"
          >
            <DatePicker
              value={date}
              onChange={setDate}
              disabledDate={(current) => {
                return current && (
                  current < cycleStart.startOf('day') ||
                  current > cycleEnd.endOf('day')
                );
              }}
              style={{ width: '100%' }}
              placeholder={`${cycleStart.format('YYYY-MM-DD')} 至 ${cycleEnd.format('YYYY-MM-DD')}`}
            />
          </Form.Item>
        </div>

        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          scroll={{ x: 'max-content' }}
          bordered
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3}>
                  <InputNumber
                    value={calculateGrandTotal()}
                    onChange={value => {
                      if (dataSource.length > 0) {
                        // 如果手动修改合计，按比例调整每行的总价
                        const currentTotal = calculateGrandTotal();
                        const ratio = (value || 0) / parseFloat(currentTotal);
                        const newData = dataSource.map(item => ({
                          ...item,
                          price: Number((item.price * ratio).toFixed(2))
                        }));
                        setDataSource(newData);
                      }
                    }}
                    style={{ width: '100%' }}
                    precision={2}
                    addonAfter="元"
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
                <Table.Summary.Cell index={5} />
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        <div className="mt-6 flex justify-end">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            disabled={dataSource.length === 0 || !date}
          >
            保存
          </Button>
        </div>
      </Card>
    </AuthWrapper>
  );
}
