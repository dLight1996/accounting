'use client';

import { useState } from 'react';
import { Card, Upload, Button, DatePicker, message, Alert } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import AuthWrapper from '@/components/auth-wrapper';

const { Dragger } = Upload;

export default function ProductImportPage() {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // 计算当前周期的开始和结束日期
  const getCurrentCycleDates = () => {
    const today = dayjs();
    const currentDay = today.date();
    let cycleStart, cycleEnd;

    if (currentDay <= 25) {
      // 如果当前日期小于等于25号，那么周期开始于上个月26号
      cycleStart = today.subtract(1, 'month').date(26);
      cycleEnd = today.date(25);
    } else {
      // 如果当前日期大于25号，那么周期开始于本月26号
      cycleStart = today.date(26);
      cycleEnd = today.add(1, 'month').date(25);
    }

    return { cycleStart, cycleEnd };
  };

  const { cycleStart, cycleEnd } = getCurrentCycleDates();

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    fileList,
    beforeUpload: (file) => {
      if (!selectedDate) {
        message.error('请先选择导入日期');
        return false;
      }

      const isValidFileType = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                            file.type === 'application/vnd.ms-excel' ||
                            file.type === 'text/csv';
      
      if (!isValidFileType) {
        message.error('只支持 Excel 或 CSV 文件');
        return false;
      }

      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('文件大小不能超过 2MB');
        return false;
      }

      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  const handleUpload = async () => {
    if (!selectedDate) {
      message.error('请选择导入日期');
      return;
    }

    if (fileList.length === 0) {
      message.error('请选择要导入的文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('date', selectedDate.format('YYYY-MM-DD'));

    setUploading(true);

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('导入失败');
      }

      const result = await response.json();
      message.success('导入成功');
      setFileList([]);
      setSelectedDate(null);
    } catch (error) {
      message.error('导入失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="商品批量导入" className="shadow-sm">
          <Alert
            message="导入说明"
            description={
              <div className="space-y-2">
                <p>1. 当前周期：{cycleStart.format('YYYY-MM-DD')} 至 {cycleEnd.format('YYYY-MM-DD')}</p>
                <p>2. 请先选择导入日期，再上传文件</p>
                <p>3. 支持的文件格式：Excel (.xlsx, .xls) 或 CSV</p>
                <p>4. 文件大小限制：2MB</p>
                <p>5. 导入文件必须符合模板格式</p>
              </div>
            }
            type="info"
            showIcon
            className="mb-6"
          />

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择导入日期
            </label>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              disabledDate={(current) => {
                // 禁用周期之外的日期
                return current && (
                  current < cycleStart.startOf('day') ||
                  current > cycleEnd.endOf('day')
                );
              }}
              className="w-full"
              placeholder="请选择导入日期"
            />
          </div>

          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个文件上传，请确保文件格式正确
            </p>
          </Dragger>

          <div className="mt-6 flex justify-end">
            <Button
              type="primary"
              onClick={handleUpload}
              disabled={fileList.length === 0 || !selectedDate}
              loading={uploading}
            >
              开始导入
            </Button>
          </div>
        </Card>

        <Card title="导入模板" className="shadow-sm">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium mb-2">模板格式说明：</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm">
                  {`商品编码,商品名称,分类,价格,单位,描述
P001,测试商品1,食品,99.99,个,商品描述1
P002,测试商品2,饮料,199.99,箱,商品描述2`}
                </pre>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-gray-600 text-sm">
                请严格按照模板格式填写数据，确保数据的准确性
              </div>
              <Button type="link">
                下载模板
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AuthWrapper>
  );
}
