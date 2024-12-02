import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, '商品名称不能为空'),
  code: z.string().min(1, '商品编码不能为空'),
  description: z.string().optional(),
  categoryId: z.string().min(1, '商品分类不能为空'),
  unit: z.string().min(1, '计量单位不能为空'),
  price: z.number().min(0, '价格不能为负'),
});

export async function GET(req: Request) {
  try {
    await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');

    const where = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
        } : {},
        category ? { category } : {},
      ],
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: true,
        },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Products GET Error:', error);
    return NextResponse.json(
      { error: '获取商品列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    
    const body = await req.json();
    const data = productSchema.parse(body);

    const existingProduct = await prisma.product.findUnique({
      where: { code: data.code },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: '商品编码已存在' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data,
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.format() },
        { status: 400 }
      );
    }

    console.error('Products POST Error:', error);
    return NextResponse.json(
      { error: '创建商品失败' },
      { status: 500 }
    );
  }
}
