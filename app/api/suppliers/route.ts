import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, '供应商名称不能为空'),
  code: z.string().min(1, '供应商编码不能为空'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  address: z.string().optional(),
});

// 获取供应商列表
export async function GET(req: Request) {
  try {
    await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const where = {
      OR: search ? [
        { name: { contains: search } },
        { code: { contains: search } },
        { contact: { contains: search } },
      ] : undefined,
    };

    const [total, items] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: {
          products: {
            include: {
              category: true,
              inventory: true,
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
      { error: error.message || '获取供应商列表失败' },
      { status: 500 }
    );
  }
}

// 创建供应商
export async function POST(req: Request) {
  try {
    await requireAuth();

    const body = await req.json();
    const data = supplierSchema.parse(body);

    // 检查供应商编码是否已存在
    const existing = await prisma.supplier.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: '供应商编码已存在' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data,
      include: {
        products: true,
      },
    });

    return NextResponse.json(supplier);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || '创建供应商失败' },
      { status: 500 }
    );
  }
}

// 更新供应商
export async function PUT(req: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '供应商ID不能为空' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = supplierSchema.parse(body);

    // 检查供应商编码是否已被其他供应商使用
    const existing = await prisma.supplier.findFirst({
      where: {
        code: data.code,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: '供应商编码已被使用' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
      include: {
        products: true,
      },
    });

    return NextResponse.json(supplier);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || '更新供应商失败' },
      { status: 500 }
    );
  }
}

// 删除供应商
export async function DELETE(req: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '供应商ID不能为空' },
        { status: 400 }
      );
    }

    // 检查供应商是否有关联的产品
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (supplier?.products.length) {
      return NextResponse.json(
        { error: '该供应商还有关联的产品，无法删除' },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '删除供应商失败' },
      { status: 500 }
    );
  }
}
