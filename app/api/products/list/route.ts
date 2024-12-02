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

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const current = parseInt(searchParams.get('current') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const name = searchParams.get('name') || undefined;

    // 构建查询条件
    const where = {
      ...(name && {
        name: {
          contains: name,
        },
      }),
    };

    // 获取总数
    const total = await prisma.productList.count({
      where,
    });

    // 获取分页数据
    const items = await prisma.productList.findMany({
      where,
      skip: (current - 1) * pageSize,
      take: pageSize,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      items,
      total,
      success: true,
    });
  } catch (error: any) {
    console.error('Get product list error:', error);
    return NextResponse.json(
      { error: error.message || '获取商品列表失败' },
      { status: 500 }
    );
  }
}
