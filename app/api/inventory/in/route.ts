import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dayjs from 'dayjs';
import { getMonthRange, DateRange } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return new NextResponse(JSON.stringify({ message: '缺少日期参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dateRange: DateRange = { start, end };

    // 使用时区处理
    const startDate = dayjs(start).tz('Asia/Shanghai').startOf('day').toDate();
    const endDate = dayjs(end).tz('Asia/Shanghai').endOf('day').toDate();

    console.log('=== API: /api/inventory/in ===');
    console.log('Query conditions:', {
      ...dateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateLocal: dayjs(startDate).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
      endDateLocal: dayjs(endDate).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
    });

    // 获取指定日期范围内的所有产品记录
    const products = await prisma.Product.findMany({
      where: {
        importDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        productList: true,
      },
      orderBy: {
        importDate: 'desc',
      },
    });

    console.log('Filtered products count:', products.length);
    if (products.length > 0) {
      console.log('Sample filtered products:', products.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        importDate: p.importDate.toISOString(),
        importDateLocal: dayjs(p.importDate).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
      })));
    }
    console.log('=== End API ===');

    if (!products || products.length === 0) {
      console.log('No products found for date range:', { startDate, endDate });
      return new NextResponse(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 按日期分组产品
    const groupedProducts = products.reduce((acc: Record<string, any>, product) => {
      const dateKey = dayjs(product.importDate).tz('Asia/Shanghai').format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          id: dateKey,
          date: dateKey,
          products: [],
        };
      }
      acc[dateKey].products.push({
        id: product.id.toString(),
        name: product.name,
        unitPrice: product.unitPrice,
        quantity: product.quantity,
        price: product.price,
        unit: product.unit,
        kgRatio: product.kgRatio || 1,
        productList: product.productList,
      });
      return acc;
    }, {});

    // 转换为数组并按日期排序
    const records = Object.values(groupedProducts).sort((a: any, b: any) => 
      dayjs(b.date).tz('Asia/Shanghai').valueOf() - dayjs(a.date).tz('Asia/Shanghai').valueOf()
    );

    return new NextResponse(JSON.stringify(records), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in GET /api/inventory/in:', error);
    return new NextResponse(JSON.stringify({ message: error.message || '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, unit, importDate, items } = await request.json();
    
    if (!name || !unit || !importDate || !items) {
      return new NextResponse(JSON.stringify({ message: '缺少必填参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建产品记录
      const product = await tx.Product.create({
        data: {
          name,
          unit,
          importDate: new Date(importDate),
          productList: {
            create: items,
          },
        },
        include: {
          productList: true,
        },
      });

      console.log('Created product:', {
        id: product.id,
        name: product.name,
        importDate: product.importDate,
        items: product.productList,
      });

      // 创建入库盘点记录
      const totalAmount = product.productList.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );
      const totalQuantity = product.productList.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      console.log('Creating inventory check:', {
        productId: product.id,
        date: product.importDate,
        quantity: totalQuantity,
        amount: totalAmount,
      });

      const check = await tx.inventoryCheck.create({
        data: {
          productId: product.id,
          date: new Date(product.importDate),
          quantity: totalQuantity,
          amount: totalAmount,
          type: 'IN',
        },
      });

      console.log('Created inventory check:', check);

      return { product, check };
    });

    return new NextResponse(JSON.stringify({
      message: '入库成功',
      ...result,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in POST /api/inventory/in:', error);
    return new NextResponse(JSON.stringify({ message: error.message || '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = await request.json();
    
    if (!id) {
      return new NextResponse(JSON.stringify({ message: '缺少产品ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const productId = parseInt(id);

    // 使用事务删除产品及其所有关联记录
    await prisma.$transaction(async (tx) => {
      // 1. 删除库存记录
      await tx.inventory.deleteMany({
        where: { productId },
      });

      // 2. 删除库存盘点记录
      await tx.inventoryCheck.deleteMany({
        where: { productId },
      });

      // 3. 删除出入库日志
      await tx.stockLog.deleteMany({
        where: { productId },
      });

      // 4. 删除交易记录
      await tx.transaction.deleteMany({
        where: { productId },
      });

      // 5. 最后删除产品记录
      await tx.Product.delete({
        where: { id: productId },
      });
    });

    return new NextResponse(JSON.stringify({ message: '删除成功' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/inventory/in:', error);
    return new NextResponse(JSON.stringify({ message: error.message || '删除失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
}
