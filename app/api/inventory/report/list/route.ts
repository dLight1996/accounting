import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import dayjs from 'dayjs';

// 添加缓存
const CACHE_TTL = 60 * 1000; // 1分钟缓存
const PAGE_SIZE = 50; // 每页数据量
let cachedData: { 
  data: any[]; 
  totals: any; 
  timestamp: number;
  total: number;
  month: string;
} | null = null;

function getMonthRange(date: Date) {
  const start = dayjs(date).startOf('month').toDate();
  const end = dayjs(date).endOf('month').toDate();
  const lastMonthStart = dayjs(date).subtract(1, 'month').startOf('month').toDate();
  const lastMonthEnd = dayjs(date).subtract(1, 'month').endOf('month').toDate();
  return { startDate: start, endDate: end, lastMonthStart, lastMonthEnd };
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { startDate, endDate, current = 1, pageSize = PAGE_SIZE } = await request.json();
    const start = dayjs(startDate).toDate();
    const end = dayjs(endDate).toDate();
    const currentMonth = dayjs(end).format('YYYY-MM');  // 使用结束日期来确定月份

    // 获取月份范围
    const { startDate: rangeStart, endDate: rangeEnd, lastMonthStart, lastMonthEnd } = getMonthRange(end);

    console.log('=== API: /api/inventory/report/list ===');
    console.log('Date ranges:', {
      currentMonth,
      current: {
        start: dayjs(start).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(end).format('YYYY-MM-DD HH:mm:ss'),
      },
      lastMonth: {
        start: dayjs(lastMonthStart).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(lastMonthEnd).format('YYYY-MM-DD HH:mm:ss'),
      }
    });

    // 检查缓存是否有效，且是否是同一个月的数据
    if (
      cachedData &&
      Date.now() - cachedData.timestamp < CACHE_TTL &&
      cachedData.data.length > 0 &&
      cachedData.month === currentMonth
    ) {
      const startIndex = (current - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = cachedData.data.slice(startIndex, endIndex);

      console.log('Using cached data');
      const response = NextResponse.json({
        data: pageData,
        totals: cachedData.totals,
        total: cachedData.total,
        current,
        pageSize,
      });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    // 先获取所有产品
    const allProducts = await prisma.Product.findMany({
      select: {
        id: true,
        name: true,
        importDate: true,
        unit: true,
        price: true,
      },
    });

    console.log('All products:', allProducts.map(p => ({
      id: p.id,
      name: p.name,
      importDate: dayjs(p.importDate).format('YYYY-MM-DD'),
    })));

    // 先获取当月有记录的产品ID
    const currentMonthChecks = await prisma.inventoryCheck.findMany({
      where: {
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log('=== Inventory Check Report ===');
    console.log('Date ranges:', {
      currentMonth: dayjs(rangeStart).format('YYYY-MM'),
      current: { 
        start: dayjs(rangeStart).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(rangeEnd).format('YYYY-MM-DD HH:mm:ss'),
      },
      lastMonth: { 
        start: dayjs(lastMonthStart).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(lastMonthEnd).format('YYYY-MM-DD HH:mm:ss'),
      },
    });

    console.log('Current month checks:', currentMonthChecks.map(r => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      date: dayjs(r.date).format('YYYY-MM-DD HH:mm:ss'),
      type: r.type,
      quantity: r.quantity,
      amount: r.amount,
    })));

    // 获取上月有记录的产品ID
    const lastMonthChecks = await prisma.inventoryCheck.findMany({
      where: {
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log('Last month checks:', lastMonthChecks.map(r => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      date: dayjs(r.date).format('YYYY-MM-DD HH:mm:ss'),
      type: r.type,
      quantity: r.quantity,
      amount: r.amount,
    })));

    // 构建产品映射
    const productMap: Record<number, typeof allProducts[0]> = {};
    for (const product of allProducts) {
      productMap[product.id] = product;
    }

    // 构建当月盘点数据
    const currentMonthData: Record<number, any> = {};
    for (const check of currentMonthChecks) {
      const product = productMap[check.productId];
      if (!product) continue;

      if (!currentMonthData[check.productId]) {
        currentMonthData[check.productId] = {
          productId: check.productId,
          productName: product.name,
          unit: product.unit || '',
          price: product.price,
          quantity: 0,
          amount: 0,
          lastMonthQuantity: 0,
          lastMonthAmount: 0,
        };
      }

      currentMonthData[check.productId].quantity += check.quantity;
      currentMonthData[check.productId].amount += check.amount;
    }

    // 添加上月盘点数据
    for (const check of lastMonthChecks) {
      const product = productMap[check.productId];
      if (!product) continue;

      if (!currentMonthData[check.productId]) {
        currentMonthData[check.productId] = {
          productId: check.productId,
          productName: product.name,
          unit: product.unit || '',
          price: product.price,
          quantity: 0,
          amount: 0,
          lastMonthQuantity: 0,
          lastMonthAmount: 0,
        };
      }

      currentMonthData[check.productId].lastMonthQuantity += check.quantity;
      currentMonthData[check.productId].lastMonthAmount += check.amount;
    }

    // 转换为数组
    const data = Object.values(currentMonthData);

    console.log('Response data:', data);
    console.log('=== Report Complete ===');

    // 更新缓存
    cachedData = {
      data,
      totals: {
        lastMonthAmount: data.reduce((acc, item) => acc + item.lastMonthAmount, 0),
        purchaseAmount: data.reduce((acc, item) => acc + item.amount - item.lastMonthAmount, 0),
        consumeAmount: data.reduce((acc, item) => acc + item.lastMonthAmount - item.amount, 0),
        currentAmount: data.reduce((acc, item) => acc + item.amount, 0),
      },
      timestamp: Date.now(),
      total: data.length,
      month: currentMonth,
    };

    // 设置响应头
    const response = NextResponse.json({
      data: data.slice((current - 1) * pageSize, current * pageSize),
      totals: cachedData.totals,
      total: data.length,
      current,
      pageSize,
    });
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Cache', 'MISS');

    return response;
  } catch (error) {
    console.error('Error in inventory report:', error);
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthStr = searchParams.get('month');

    if (!monthStr) {
      return NextResponse.json({
        error: '缺少月份参数',
      }, { status: 400 });
    }

    console.log('=== Inventory Check Report ===');
    console.log('Query month:', monthStr);

    // 获取月份范围
    const monthDate = dayjs(monthStr).toDate();
    const { startDate, endDate, lastMonthStart, lastMonthEnd } = getMonthRange(monthDate);

    console.log('Date ranges:', {
      currentMonth: dayjs(monthDate).format('YYYY-MM'),
      current: { 
        start: dayjs(startDate).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(endDate).format('YYYY-MM-DD HH:mm:ss'),
      },
      lastMonth: { 
        start: dayjs(lastMonthStart).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(lastMonthEnd).format('YYYY-MM-DD HH:mm:ss'),
      },
    });

    // 获取当月有记录的产品ID
    const currentMonthChecks = await prisma.inventoryCheck.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log('Current month checks:', currentMonthChecks.map(r => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      date: dayjs(r.date).format('YYYY-MM-DD HH:mm:ss'),
      type: r.type,
      quantity: r.quantity,
      amount: r.amount,
    })));

    // 获取上月有记录的产品ID
    const lastMonthChecks = await prisma.inventoryCheck.findMany({
      where: {
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log('Last month checks:', lastMonthChecks.map(r => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      date: dayjs(r.date).format('YYYY-MM-DD HH:mm:ss'),
      type: r.type,
      quantity: r.quantity,
      amount: r.amount,
    })));

    // 获取所有产品
    const allProducts = await prisma.Product.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        price: true,
      },
    });

    // 构建产品映射
    const productMap: Record<number, typeof allProducts[0]> = {};
    for (const product of allProducts) {
      productMap[product.id] = product;
    }

    // 构建当月盘点数据
    const currentMonthData: Record<number, any> = {};
    for (const check of currentMonthChecks) {
      const product = productMap[check.productId];
      if (!product) continue;

      if (!currentMonthData[check.productId]) {
        currentMonthData[check.productId] = {
          productId: check.productId,
          productName: product.name,
          unit: product.unit || '',
          price: product.price,
          quantity: 0,
          amount: 0,
          lastMonthQuantity: 0,
          lastMonthAmount: 0,
        };
      }

      currentMonthData[check.productId].quantity += check.quantity;
      currentMonthData[check.productId].amount += check.amount;
    }

    // 添加上月盘点数据
    for (const check of lastMonthChecks) {
      const product = productMap[check.productId];
      if (!product) continue;

      if (!currentMonthData[check.productId]) {
        currentMonthData[check.productId] = {
          productId: check.productId,
          productName: product.name,
          unit: product.unit || '',
          price: product.price,
          quantity: 0,
          amount: 0,
          lastMonthQuantity: 0,
          lastMonthAmount: 0,
        };
      }

      currentMonthData[check.productId].lastMonthQuantity += check.quantity;
      currentMonthData[check.productId].lastMonthAmount += check.amount;
    }

    // 转换为数组
    const data = Object.values(currentMonthData);

    console.log('Response data:', data);
    console.log('=== Report Complete ===');

    return NextResponse.json({
      data,
      total: data.length,
      success: true,
    });
  } catch (error: any) {
    console.error('Error in inventory check report:', error);
    return NextResponse.json({
      error: error.message || '获取盘点记录失败',
    }, { status: 500 });
  }
}
