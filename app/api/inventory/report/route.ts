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
    const { startDate: lastMonthStart, endDate: lastMonthEnd } = getMonthRange(start.subtract(1, 'month').toDate());

    // 获取所有库存记录，使用高效的查询
    const [products, inventoryChecks] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          unit: true,
          category: true,
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
    const productMap = new Map(products.map(p => [p.id, {
      id: p.id,
      name: p.name,
      unit: p.unit,
      category: p.category || '',
      lastMonthQuantity: 0,
      lastMonthAmount: 0,
      purchaseQuantity: 0,
      purchaseAmount: 0,
      consumeQuantity: 0,
      consumeAmount: 0,
      currentQuantity: 0,
      currentAmount: 0,
    }]));

    // 处理库存记录
    let totals = {
      lastMonthAmount: 0,
      purchaseAmount: 0,
      consumeAmount: 0,
      currentAmount: 0,
    };

    // 分别处理上月和本月数据
    inventoryChecks.forEach(check => {
      const item = productMap.get(check.productId);
      if (!item) return;

      if (check.date >= lastMonthStart && check.date <= lastMonthEnd) {
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
    });

    const data = Array.from(productMap.values());

    // 设置缓存控制
    const response = NextResponse.json({ data, totals });
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error in inventory report:', error);
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
      { status: 500 }
    );
  }
}
