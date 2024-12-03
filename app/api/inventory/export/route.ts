import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getMonthRange } from '@/lib/date-utils';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { startDate, endDate } = await request.json();
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const { lastMonthStart, lastMonthEnd } = getMonthRange(start.toDate());

    // 获取所有商品
    const products = await prisma.product.groupBy({
      by: ['name', 'unit'],
      where: {
        OR: [
          // 上月库存：查询上月最后一天的库存
          {
            importDate: {
              lte: lastMonthEnd,
            },
          },
          // 本月数据：查询本月的出入库记录
          {
            importDate: {
              gte: start.toDate(),
              lte: end.toDate(),
            },
          },
        ],
      },
      _sum: {
        quantity: true,
        price: true,
      },
    });

    // 获取每个商品的最新单价
    const latestPrices = await Promise.all(
      products.map(async (product) => {
        const latest = await prisma.product.findFirst({
          where: {
            name: product.name,
            importDate: {
              lte: end.toDate(),
            },
          },
          orderBy: {
            importDate: 'desc',
          },
          select: {
            price: true,
          },
        });
        return {
          name: product.name,
          price: latest?.price || 0,
        };
      })
    );

    // 处理数据
    const inventoryData = await Promise.all(
      products.map(async (product) => {
        // 获取上月库存
        const lastMonth = await prisma.transaction.aggregate({
          where: {
            product: {
              name: product.name,
            },
            createdAt: {
              lte: lastMonthEnd,
            },
          },
          _sum: {
            quantity: true,
          },
        });

        // 获取本月购进
        const purchase = await prisma.transaction.aggregate({
          where: {
            product: {
              name: product.name,
            },
            type: 'IN',
            createdAt: {
              gte: start.toDate(),
              lte: end.toDate(),
            },
          },
          _sum: {
            quantity: true,
            totalAmount: true,
          },
        });

        // 获取本月消耗
        const consume = await prisma.transaction.aggregate({
          where: {
            product: {
              name: product.name,
            },
            type: 'OUT',
            createdAt: {
              gte: start.toDate(),
              lte: end.toDate(),
            },
          },
          _sum: {
            quantity: true,
            totalAmount: true,
          },
        });

        const price = latestPrices.find((p) => p.name === product.name)?.price || 0;
        const lastMonthQuantity = lastMonth._sum.quantity || 0;
        const lastMonthAmount = lastMonthQuantity * price;
        const purchaseQuantity = purchase._sum.quantity || 0;
        const purchaseAmount = purchase._sum.totalAmount || 0;
        const consumeQuantity = consume._sum.quantity || 0;
        const consumeAmount = consume._sum.totalAmount || 0;
        const currentQuantity = lastMonthQuantity + purchaseQuantity - consumeQuantity;
        const currentAmount = currentQuantity * price;

        return {
          '商品名称': product.name,
          '单位': product.unit,
          '单价': price.toFixed(2),
          '上月库存数量': lastMonthQuantity.toFixed(2),
          '上月库存金额': lastMonthAmount.toFixed(2),
          '本月购进数量': purchaseQuantity.toFixed(2),
          '本月购进金额': purchaseAmount.toFixed(2),
          '本月消耗数量': consumeQuantity.toFixed(2),
          '本月消耗金额': consumeAmount.toFixed(2),
          '本月库存数量': currentQuantity.toFixed(2),
          '本月库存金额': currentAmount.toFixed(2),
        };
      })
    );

    // 按商品名称排序
    inventoryData.sort((a, b) => a['商品名称'].localeCompare(b['商品名称']));

    // 计算合计
    const sums = inventoryData.reduce(
      (acc, item) => ({
        '上月库存数量': (
          parseFloat(acc['上月库存数量']) + parseFloat(item['上月库存数量'])
        ).toFixed(2),
        '上月库存金额': (
          parseFloat(acc['上月库存金额']) + parseFloat(item['上月库存金额'])
        ).toFixed(2),
        '本月购进数量': (
          parseFloat(acc['本月购进数量']) + parseFloat(item['本月购进数量'])
        ).toFixed(2),
        '本月购进金额': (
          parseFloat(acc['本月购进金额']) + parseFloat(item['本月购进金额'])
        ).toFixed(2),
        '本月消耗数量': (
          parseFloat(acc['本月消耗数量']) + parseFloat(item['本月消耗数量'])
        ).toFixed(2),
        '本月消耗金额': (
          parseFloat(acc['本月消耗金额']) + parseFloat(item['本月消耗金额'])
        ).toFixed(2),
        '本月库存数量': (
          parseFloat(acc['本月库存数量']) + parseFloat(item['本月库存数量'])
        ).toFixed(2),
        '本月库存金额': (
          parseFloat(acc['本月库存金额']) + parseFloat(item['本月库存金额'])
        ).toFixed(2),
      }),
      {
        '上月库存数量': '0.00',
        '上月库存金额': '0.00',
        '本月购进数量': '0.00',
        '本月购进金额': '0.00',
        '本月消耗数量': '0.00',
        '本月消耗金额': '0.00',
        '本月库存数量': '0.00',
        '本月库存金额': '0.00',
      }
    );

    // 添加合计行
    inventoryData.push({
      '商品名称': '合计',
      '单位': '-',
      '单价': '-',
      ...sums,
    });

    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(inventoryData);

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 商品名称
      { wch: 8 },  // 单位
      { wch: 10 }, // 单价
      { wch: 12 }, // 上月库存数量
      { wch: 12 }, // 上月库存金额
      { wch: 12 }, // 本月购进数量
      { wch: 12 }, // 本月购进金额
      { wch: 12 }, // 本月消耗数量
      { wch: 12 }, // 本月消耗金额
      { wch: 12 }, // 本月库存数量
      { wch: 12 }, // 本月库存金额
    ];
    ws['!cols'] = colWidths;

    // 添加标题
    XLSX.utils.book_append_sheet(wb, ws, '盘点表');

    // 生成 Excel 文件的二进制数据
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 返回文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="盘点表_${start.format('YYYYMM')}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export inventory error:', error);
    return NextResponse.json(
      { error: error.message || '导出失败' },
      { status: 500 }
    );
  }
}
