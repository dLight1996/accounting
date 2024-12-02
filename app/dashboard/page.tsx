'use client';

import { Card, Row, Col, Statistic } from 'antd';
import {
  ShoppingCartOutlined,
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">仪表盘概览</h1>
        <p className="text-gray-500">欢迎回来，这里是今日数据概览</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div variants={itemVariants}>
            <Card 
              className="hover:shadow-lg transition-shadow duration-300"
              bordered={false}
            >
              <Statistic
                title="总库存量"
                value={11280}
                prefix={<ShoppingCartOutlined />}
                suffix="件"
              />
              <div className="mt-2">
                <span className="text-green-500 text-sm">
                  <ArrowUpOutlined /> 16.8%
                </span>
                <span className="text-gray-400 text-sm ml-2">较上周</span>
              </div>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div variants={itemVariants}>
            <Card 
              className="hover:shadow-lg transition-shadow duration-300"
              bordered={false}
            >
              <Statistic
                title="商品种类"
                value={428}
                prefix={<ShopOutlined />}
                suffix="种"
              />
              <div className="mt-2">
                <span className="text-green-500 text-sm">
                  <ArrowUpOutlined /> 8.2%
                </span>
                <span className="text-gray-400 text-sm ml-2">较上月</span>
              </div>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div variants={itemVariants}>
            <Card 
              className="hover:shadow-lg transition-shadow duration-300"
              bordered={false}
            >
              <Statistic
                title="待入库"
                value={35}
                suffix="批"
              />
              <div className="mt-2">
                <span className="text-red-500 text-sm">
                  <ArrowDownOutlined /> 12.5%
                </span>
                <span className="text-gray-400 text-sm ml-2">较昨日</span>
              </div>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div variants={itemVariants}>
            <Card 
              className="hover:shadow-lg transition-shadow duration-300"
              bordered={false}
            >
              <Statistic
                title="待出库"
                value={42}
                suffix="批"
              />
              <div className="mt-2">
                <span className="text-green-500 text-sm">
                  <ArrowUpOutlined /> 22.4%
                </span>
                <span className="text-gray-400 text-sm ml-2">较昨日</span>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 后续可以添加图表等其他内容 */}
    </motion.div>
  );
}
