import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // 删除相关的所有记录
    await prisma.$transaction([
      // 删除库存盘点记录
      prisma.inventoryCheck.deleteMany({
        where: {
          productId: Number(id)
        }
      }),
      // 删除库存变动记录
      prisma.stockLog.deleteMany({
        where: {
          productId: Number(id)
        }
      }),
      // 删除交易记录
      prisma.transaction.deleteMany({
        where: {
          productId: Number(id)
        }
      }),
      // 删除库存记录
      prisma.inventory.deleteMany({
        where: {
          productId: Number(id)
        }
      }),
      // 删除产品记录
      prisma.product.delete({
        where: {
          id: Number(id)
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory' },
      { status: 500 }
    );
  }
}
