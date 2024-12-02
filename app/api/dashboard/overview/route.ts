import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取当前周期的起止日期
    const today = new Date();
    const currentDay = today.getDate();
    let startDate: Date, endDate: Date;

    if (currentDay <= 25) {
      // 如果当前日期在1-25日之间，周期是上月26日到本月25日
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 26);
      endDate = new Date(today.getFullYear(), today.getMonth(), 25);
    } else {
      // 如果当前日期在26-31日之间，周期是本月26日到下月25日
      startDate = new Date(today.getFullYear(), today.getMonth(), 26);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 25);
    }

    // 查询本周期内每个商品的总数量和总价
    const productStats = await prisma.product.groupBy({
      by: ['name'],
      where: {
        importDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        quantity: true,
        price: true,
      },
    });

    // 格式化数据
    const quantityData = productStats.map(item => ({
      name: item.name,
      quantity: item._sum.quantity || 0,
    }));

    const priceData = productStats.map(item => ({
      name: item.name,
      totalPrice: item._sum.price || 0,
    }));

    // 按数量和总价降序排序
    quantityData.sort((a, b) => b.quantity - a.quantity);
    priceData.sort((a, b) => b.totalPrice - a.totalPrice);

    return NextResponse.json({
      success: true,
      data: {
        quantities: quantityData,
        prices: priceData,
      },
      cycle: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Overview error:', error);
    return NextResponse.json(
      { error: error.message || '获取数据失败' },
      { status: 500 }
    );
  }
}
