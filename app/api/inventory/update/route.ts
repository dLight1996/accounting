import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getMonthRange } from '@/lib/date-utils';
import dayjs from 'dayjs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { id, purchaseQuantity, purchaseAmount, consumeQuantity, consumeAmount } = await request.json();
    const { startDate, endDate } = getMonthRange(new Date());

    // 更新采购记录
    if (purchaseQuantity !== undefined && purchaseAmount !== undefined) {
      await prisma.inventoryCheck.upsert({
        where: {
          productId_date_type: {
            productId: id,
            date: startDate,
            type: 'purchase',
          },
        },
        update: {
          quantity: purchaseQuantity,
          amount: purchaseAmount,
        },
        create: {
          productId: id,
          date: startDate,
          type: 'purchase',
          quantity: purchaseQuantity,
          amount: purchaseAmount,
        },
      });
    }

    // 更新消耗记录
    if (consumeQuantity !== undefined && consumeAmount !== undefined) {
      await prisma.inventoryCheck.upsert({
        where: {
          productId_date_type: {
            productId: id,
            date: startDate,
            type: 'consume',
          },
        },
        update: {
          quantity: consumeQuantity,
          amount: consumeAmount,
        },
        create: {
          productId: id,
          date: startDate,
          type: 'consume',
          quantity: consumeQuantity,
          amount: consumeAmount,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in inventory update:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
