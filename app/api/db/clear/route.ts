import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 使用事务清空所有相关表
    await prisma.$transaction(async (tx) => {
      // 1. 清空库存记录
      await tx.inventory.deleteMany();

      // 2. 清空库存盘点记录
      await tx.inventoryCheck.deleteMany();

      // 3. 清空出入库日志
      await tx.stockLog.deleteMany();

      // 4. 清空交易记录
      await tx.transaction.deleteMany();

      // 5. 清空产品记录
      await tx.Product.deleteMany();

      // 6. 清空产品列表
      await tx.ProductList.deleteMany();
    });

    return new NextResponse(JSON.stringify({ message: '数据库清空成功' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error clearing database:', error);
    return new NextResponse(JSON.stringify({ message: error.message || '清空数据库失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
}
