'use client';

import { useEffect, useState } from 'react';
import { Card, message, Spin, Row, Col, Statistic } from 'antd';
import { Column } from '@ant-design/charts';
import dayjs from 'dayjs';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  AppstoreOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import AuthWrapper from '@/components/auth-wrapper';

interface ChartData {
  name: string;
  quantity: number;
}

interface PriceData {
  name: string;
  totalPrice: number;
}

interface CycleDates {
  startDate: string;
  endDate: string;
}

interface DashboardStats {
  totalQuantity: number;
  totalAmount: number;
  productTypes: number;
  averagePrice: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [quantityData, setQuantityData] = useState<ChartData[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [cycle, setCycle] = useState<CycleDates | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuantity: 0,
    totalAmount: 0,
    productTypes: 0,
    averagePrice: 0,
  });

  const fetchData = async () => {
    try {
      const response = await fetch('/api/dashboard/overview');
      if (!response.ok) {
        throw new Error('获取数据失败');
      }
      const result = await response.json();
      setQuantityData(result.data.quantities);
      setPriceData(result.data.prices);
      setCycle(result.cycle);

      // 计算统计数据
      const totalQuantity = result.data.quantities.reduce(
        (sum: number, item: ChartData) => sum + item.quantity,
        0
      );
      const totalAmount = result.data.prices.reduce(
        (sum: number, item: PriceData) => sum + item.totalPrice,
        0
      );
      
      setStats({
        totalQuantity,
        totalAmount,
        productTypes: result.data.quantities.length,
        averagePrice: totalAmount / totalQuantity,
      });
    } catch (error: any) {
      message.error(error.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const quantityConfig = {
    data: quantityData,
    xField: 'name',
    yField: 'quantity',
    label: {
      position: 'top',
      style: {
        fill: '#000000',
      },
      formatter: (text: string, item: any) => {
        return item.quantity;
      },
    },
    meta: {
      name: {
        alias: '商品名称',
      },
      quantity: {
        alias: '数量',
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    color: '#1890ff',
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000,
      },
    },
  };

  const priceConfig = {
    data: priceData,
    xField: 'name',
    yField: 'totalPrice',
    label: {
      position: 'top',
      style: {
        fill: '#000000',
      },
      formatter: (text: string, item: any) => {
        const price = item?.data?.totalPrice;
        if (typeof price === 'number') {
          return `¥${price.toFixed(2)}`;
        }
        return '';
      },
    },
    meta: {
      name: {
        alias: '商品名称',
      },
      totalPrice: {
        alias: '总价',
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    color: '#52c41a',
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000,
      },
    },
  };

  const cycleTitle = cycle
    ? `(${dayjs(cycle.startDate).format('YYYY-MM-DD')} 至 ${dayjs(
        cycle.endDate
      ).format('YYYY-MM-DD')})`
    : '';

  if (loading) {
    return (
      <AuthWrapper>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Spin size="large" />
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">仪表盘概览</h1>
          <p className="text-gray-500">
            {cycle
              ? `${dayjs(cycle.startDate).format('YYYY年MM月DD日')} 至 ${dayjs(
                  cycle.endDate
                ).format('YYYY年MM月DD日')}`
              : ''}
          </p>
        </div>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="hover:shadow-md transition-shadow">
              <Statistic
                title="总库存量"
                value={stats.totalQuantity}
                prefix={<ShoppingCartOutlined className="text-blue-500" />}
                suffix="件"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="hover:shadow-md transition-shadow">
              <Statistic
                title="总金额"
                value={stats.totalAmount}
                precision={2}
                prefix={<DollarOutlined className="text-green-500" />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="hover:shadow-md transition-shadow">
              <Statistic
                title="商品种类"
                value={stats.productTypes}
                prefix={<AppstoreOutlined className="text-purple-500" />}
                suffix="种"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="hover:shadow-md transition-shadow">
              <Statistic
                title="平均单价"
                value={stats.averagePrice}
                precision={2}
                prefix={<BarChartOutlined className="text-orange-500" />}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card
              title="商品数量统计"
              className="shadow-sm hover:shadow-md transition-shadow"
              extra={cycleTitle}
            >
              {quantityData.length > 0 ? (
                <Column {...quantityConfig} height={400} />
              ) : (
                <div className="flex justify-center items-center h-[400px] text-gray-400">
                  暂无数据
                </div>
              )}
            </Card>
          </Col>
          <Col span={24}>
            <Card
              title="商品总价统计"
              className="shadow-sm hover:shadow-md transition-shadow"
              extra={cycleTitle}
            >
              {priceData.length > 0 ? (
                <Column {...priceConfig} height={400} />
              ) : (
                <div className="flex justify-center items-center h-[400px] text-gray-400">
                  暂无数据
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </AuthWrapper>
  );
}
