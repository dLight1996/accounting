import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, products } = await request.json();

    if (!date || !products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    // 开始事务处理
    const result = await prisma.$transaction(async (prisma) => {
      const createdProducts = [];

      for (const product of products) {
        // 验证必要字段
        if (!product.name) {
          throw new Error('商品名称为必填项');
        }

        // 查找现有商品列表项
        let productList = await prisma.productList.findFirst({
          where: {
            AND: [
              { name: product.name },
              { price: product.unitPrice }
            ]
          }
        });

        // 如果不存在，则创建新的商品列表项
        if (!productList) {
          productList = await prisma.productList.create({
            data: {
              name: product.name,
              price: product.unitPrice,
              unit: product.unit
            }
          });
        }

        // 创建商品记录
        const createdProduct = await prisma.product.create({
          data: {
            name: product.name,
            unitPrice: product.unitPrice,
            quantity: product.quantity,
            price: product.price,
            unit: product.unit,
            kgRatio: product.kgRatio || 1,
            importDate: new Date(date),
            productListId: productList.id
          },
        });

        createdProducts.push(createdProduct);
      }

      return createdProducts;
    });

    return NextResponse.json({
      success: true,
      message: `成功添加 ${result.length} 条商品数据`,
      data: result,
    });
  } catch (error: any) {
    console.error('Batch add error:', error);
    return NextResponse.json(
      { error: error.message || '保存失败' },
      { status: 500 }
    );
  }
}
