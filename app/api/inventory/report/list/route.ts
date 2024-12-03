import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getMonthRange } from '@/lib/date-utils';
import dayjs from 'dayjs';

// 添加缓存
const CACHE_TTL = 60 * 1000; // 1分钟缓存
const PAGE_SIZE = 50; // 每页数据量
let cachedData: { 
  data: any[]; 
  totals: any; 
  timestamp: number;
  total: number;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { startDate, endDate, current = 1, pageSize = PAGE_SIZE } = await request.json();
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    // 检查缓存是否有效
    if (
      cachedData &&
      Date.now() - cachedData.timestamp < CACHE_TTL &&
      cachedData.data.length > 0
    ) {
      const startIndex = (current - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = cachedData.data.slice(startIndex, endIndex);

      const response = NextResponse.json({
        data: pageData,
        totals: cachedData.totals,
        total: cachedData.total,
        current,
        pageSize,
      });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    const { startDate: lastMonthStart, endDate: lastMonthEnd } = getMonthRange(
      start.subtract(1, 'month').toDate()
    );

    // 使用事务确保数据一致性
    const [products, inventoryChecks] = await prisma.$transaction([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          unit: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.inventoryCheck.findMany({
        where: {
          OR: [
            {
              date: {
                gte: start.toDate(),
                lte: end.toDate(),
              },
            },
            {
              date: {
                gte: lastMonthStart,
                lte: lastMonthEnd,
              },
            },
          ],
        },
        select: {
          id: true,
          productId: true,
          date: true,
          quantity: true,
          amount: true,
        },
        orderBy: {
          date: 'asc',
        },
      }),
    ]);

    // 创建产品映射以提高查找效率
    const productMap = new Map(
      products.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          unit: p.unit,
          lastMonthQuantity: 0,
          lastMonthAmount: 0,
          purchaseQuantity: 0,
          purchaseAmount: 0,
          consumeQuantity: 0,
          consumeAmount: 0,
          currentQuantity: 0,
          currentAmount: 0,
        },
      ])
    );

    // 处理库存记录
    let totals = {
      lastMonthAmount: 0,
      purchaseAmount: 0,
      consumeAmount: 0,
      currentAmount: 0,
    };

    // 使用 Map 优化日期比较
    const lastMonthStartTime = lastMonthStart.getTime();
    const lastMonthEndTime = lastMonthEnd.getTime();

    // 分别处理上月和本月数据
    for (const check of inventoryChecks) {
      const item = productMap.get(check.productId);
      if (!item) continue;

      const checkDate = new Date(check.date).getTime();
      if (checkDate >= lastMonthStartTime && checkDate <= lastMonthEndTime) {
        item.lastMonthQuantity = check.quantity;
        item.lastMonthAmount = check.amount;
        item.currentQuantity = check.quantity;
        item.currentAmount = check.amount;
        totals.lastMonthAmount += check.amount;
        totals.currentAmount += check.amount;
      } else {
        const diff = check.quantity - item.currentQuantity;
        if (diff > 0) {
          item.purchaseQuantity += diff;
          item.purchaseAmount += check.amount - item.currentAmount;
          totals.purchaseAmount += check.amount - item.currentAmount;
        } else {
          item.consumeQuantity += -diff;
          item.consumeAmount += item.currentAmount - check.amount;
          totals.consumeAmount += item.currentAmount - check.amount;
        }
        item.currentQuantity = check.quantity;
        item.currentAmount = check.amount;
        totals.currentAmount = check.amount;
      }
    }

    const allData = Array.from(productMap.values());
    const startIndex = (current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = allData.slice(startIndex, endIndex);

    // 更新缓存
    cachedData = {
      data: allData,
      totals,
      timestamp: Date.now(),
      total: allData.length,
    };

    // 设置响应头
    const response = NextResponse.json({
      data: pageData,
      totals,
      total: allData.length,
      current,
      pageSize,
    });
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Cache', 'MISS');

    return response;
  } catch (error) {
    console.error('Error in inventory report:', error);
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
      { status: 500 }
    );
  }
}
