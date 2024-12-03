import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dayjs from 'dayjs';

export async function POST(request: NextRequest) {
  try {
    // 暂时跳过认证检查
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return new NextResponse(JSON.stringify({ message: '未登录' }), {
    //     status: 401,
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    // }

    console.log('=== Initializing Inventory Checks ===');

    // 先删除所有现有的盘点记录
    const deleteResult = await prisma.inventoryCheck.deleteMany({
      where: {
        type: 'IN',
      },
    });
    console.log('Deleted existing checks:', deleteResult);

    // 获取所有产品
    const products = await prisma.Product.findMany({
      select: {
        id: true,
        name: true,
        importDate: true,
        quantity: true,
        price: true,
      },
    });

    console.log('Found products:', products.map(p => ({
      id: p.id,
      name: p.name,
      importDate: dayjs(p.importDate).format('YYYY-MM-DD'),
      quantity: p.quantity,
      price: p.price,
    })));

    // 为每个产品创建盘点记录
    const results = await Promise.all(
      products.map(async (product) => {
        const totalAmount = product.price * product.quantity;
        const totalQuantity = product.quantity;

        // 使用 2023 年而不是 2024 年
        const checkDate = dayjs(product.importDate).year(2023).toDate();

        console.log('Creating check for product:', {
          id: product.id,
          name: product.name,
          importDate: dayjs(product.importDate).format('YYYY-MM-DD'),
          checkDate: dayjs(checkDate).format('YYYY-MM-DD'),
          totalQuantity,
          totalAmount,
        });

        const check = await prisma.inventoryCheck.create({
          data: {
            productId: product.id,
            date: checkDate,
            quantity: totalQuantity,
            amount: totalAmount,
            type: 'IN',
          },
        });

        return {
          productId: product.id,
          name: product.name,
          check: {
            id: check.id,
            date: dayjs(check.date).format('YYYY-MM-DD'),
            quantity: check.quantity,
            amount: check.amount,
          },
        };
      })
    );

    console.log('Created inventory checks:', results);
    console.log('=== Initialization Complete ===');

    return NextResponse.json({
      message: '初始化盘点记录成功',
      deleteResult,
      results,
    });
  } catch (error: any) {
    console.error('Error initializing inventory checks:', error);
    return NextResponse.json(
      { message: error.message || '初始化盘点记录失败' },
      { status: 500 }
    );
  }
}
