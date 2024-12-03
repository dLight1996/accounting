import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getMonthRange } from '@/lib/date-utils';
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
          name: product.name,
          unit: product.unit,
          price: price,
          lastMonthQuantity,
          lastMonthAmount,
          purchaseQuantity,
          purchaseAmount,
          consumeQuantity,
          consumeAmount,
          currentQuantity,
          currentAmount,
        };
      })
    );

    // 计算合计
    const totals = inventoryData.reduce(
      (acc, curr) => ({
        lastMonthQuantity: acc.lastMonthQuantity + curr.lastMonthQuantity,
        lastMonthAmount: acc.lastMonthAmount + curr.lastMonthAmount,
        purchaseQuantity: acc.purchaseQuantity + curr.purchaseQuantity,
        purchaseAmount: acc.purchaseAmount + curr.purchaseAmount,
        consumeQuantity: acc.consumeQuantity + curr.consumeQuantity,
        consumeAmount: acc.consumeAmount + curr.consumeAmount,
        currentQuantity: acc.currentQuantity + curr.currentQuantity,
        currentAmount: acc.currentAmount + curr.currentAmount,
      }),
      {
        lastMonthQuantity: 0,
        lastMonthAmount: 0,
        purchaseQuantity: 0,
        purchaseAmount: 0,
        consumeQuantity: 0,
        consumeAmount: 0,
        currentQuantity: 0,
        currentAmount: 0,
      }
    );

    // 按商品名称排序
    inventoryData.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      data: inventoryData,
      totals: totals,
    });
  } catch (error: any) {
    console.error('Get inventory report error:', error);
    return NextResponse.json(
      { error: error.message || '获取库存报表失败' },
      { status: 500 }
    );
  }
}
