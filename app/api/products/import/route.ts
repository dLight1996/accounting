import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证用户是否登录
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const date = formData.get('date') as string;

    if (!file || !date) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileContent = await file.text();
    
    // 解析 CSV 内容
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // 开始事务处理
    const result = await prisma.$transaction(async (tx) => {
      const createdProducts = [];

      for (const record of records) {
        // 查找或创建分类
        const category = await tx.category.upsert({
          where: { name: record.分类 },
          update: {},
          create: { name: record.分类 },
        });

        // 创建商品
        const product = await tx.product.create({
          data: {
            code: record.商品编码,
            name: record.商品名称,
            price: parseFloat(record.价格),
            unit: record.单位,
            description: record.描述,
            categoryId: category.id,
            importDate: new Date(date),
          },
        });

        createdProducts.push(product);
      }

      return createdProducts;
    });

    return NextResponse.json({
      success: true,
      message: `成功导入 ${result.length} 条商品数据`,
      data: result,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: '导入失败，请检查文件格式是否正确' },
      { status: 500 }
    );
  }
}
