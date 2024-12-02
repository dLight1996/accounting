import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const stockUpdateSchema = z.object({
  productId: z.string().min(1, '产品ID不能为空'),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive('数量必须为正数'),
  reason: z.string().optional(),
  note: z.string().optional(),
});

// 获取库存列表
export async function GET(req: Request) {
  try {
    await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const lowStock = searchParams.get('lowStock') === 'true';

    const where = {
      AND: [
        search ? {
          product: {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ],
          },
        } : {},
        lowStock ? {
          quantity: {
            lte: { minStock: true }
          }
        } : {},
      ],
    };

    const [total, items] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取库存列表失败' },
      { status: 500 }
    );
  }
}

// 更新库存
export async function POST(req: Request) {
  try {
    await requireAuth();

    const body = await req.json();
    const data = stockUpdateSchema.parse(body);

    // 开启事务以确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 获取当前库存
      const inventory = await tx.inventory.findUnique({
        where: { productId: data.productId },
      });

      if (!inventory) {
        throw new Error('未找到产品库存信息');
      }

      const beforeStock = inventory.quantity;
      let afterStock = beforeStock;

      // 计算新库存
      if (data.type === 'IN') {
        afterStock += data.quantity;
      } else {
        if (beforeStock < data.quantity) {
          throw new Error('库存不足');
        }
        afterStock -= data.quantity;
      }

      // 更新库存
      const updatedInventory = await tx.inventory.update({
        where: { productId: data.productId },
        data: { quantity: afterStock },
      });

      // 记录库存变动
      const stockLog = await tx.stockLog.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          beforeStock,
          afterStock,
          reason: data.reason,
          note: data.note,
        },
      });

      return { inventory: updatedInventory, stockLog };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || '更新库存失败' },
      { status: 500 }
    );
  }
}
