import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// 获取统计数据
export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts,
      lowStockProducts,
      todayTransactions,
      monthlyTransactions,
      supplierCount,
    ] = await Promise.all([
      // 总产品数
      prisma.product.count(),
      
      // 低库存产品数
      prisma.inventory.count({
        where: {
          quantity: {
            lte: { minStock: true }
          }
        }
      }),

      // 今日交易数
      prisma.transaction.count({
        where: {
          createdAt: {
            gte: startOfToday,
          }
        }
      }),

      // 本月交易数
      prisma.transaction.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          }
        }
      }),

      // 供应商数量
      prisma.supplier.count(),
    ]);

    // 获取最近的交易记录
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: true,
        user: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    // 获取库存警告
    const stockWarnings = await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: { minStock: true }
        }
      },
      take: 5,
      include: {
        product: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: {
        quantity: 'asc',
      },
    });

    return NextResponse.json({
      overview: {
        totalProducts,
        lowStockProducts,
        todayTransactions,
        monthlyTransactions,
        supplierCount,
      },
      recentTransactions,
      stockWarnings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取统计数据失败' },
      { status: 500 }
    );
  }
}
