'use client';

import { Card, Row, Col, Statistic, Button } from 'antd';
import { useRouter } from 'next/navigation';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export default function InventoryCheckDashboard() {
  const router = useRouter();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">库存盘点</h1>
      
      <Row gutter={16} className="mb-6">
        <Col key="diff" span={6}>
          <Card bordered={false}>
            <Statistic
              title="本月盘点差异"
              value={11.28}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col key="pending" span={6}>
          <Card bordered={false}>
            <Statistic
              title="待处理盘点"
              value={3}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col key="count" span={6}>
          <Card bordered={false}>
            <Statistic
              title="本月盘点次数"
              value={8}
            />
          </Card>
        </Col>
        <Col key="accuracy" span={6}>
          <Card bordered={false}>
            <Statistic
              title="盘点准确率"
              value={93.6}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col key="actions" span={24}>
          <Card 
            title="快速操作" 
            bordered={false}
            className="mb-6"
          >
            <div className="flex gap-4">
              <Button type="primary" onClick={() => router.push('/dashboard/inventory-check/list')}>
                开始新盘点
              </Button>
              <Button onClick={() => router.push('/dashboard/inventory-check/history')}>
                查看历史记录
              </Button>
              <Button onClick={() => router.push('/dashboard/inventory-check/reports')}>
                盘点报表
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
