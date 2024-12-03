import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // 创建管理员用户
    const hashedPassword = await hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: {
        email: 'admin@example.com',
      },
      update: {},
      create: {
        name: '管理员',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    });

    // 创建一些示例产品
    const products = [
      {
        name: '大米',
        unit: 'kg',
        unitPrice: 5.5,
        quantity: 100,
        price: 550,
        importDate: new Date(),
      },
      {
        name: '面粉',
        unit: 'kg',
        unitPrice: 4.8,
        quantity: 80,
        price: 384,
        importDate: new Date(),
      },
      {
        name: '食用油',
        unit: 'L',
        unitPrice: 12.5,
        quantity: 50,
        price: 625,
        importDate: new Date(),
      },
    ];

    // 创建产品列表和产品记录
    const createdProducts = [];
    for (const product of products) {
      const productList = await prisma.productList.create({
        data: {
          name: product.name,
          price: product.unitPrice,
          unit: product.unit,
        },
      });

      // 创建产品记录
      const createdProduct = await prisma.product.create({
        data: {
          name: product.name,
          unitPrice: product.unitPrice,
          quantity: product.quantity,
          price: product.price,
          unit: product.unit,
          importDate: product.importDate,
          productListId: productList.id,
        },
      });

      createdProducts.push(createdProduct);
    }

    // 创建上月库存盘点记录
    const lastMonth = dayjs().subtract(1, 'month');
    for (const product of createdProducts) {
      await prisma.inventoryCheck.create({
        data: {
          productId: product.id,
          date: lastMonth.toDate(),
          type: 'purchase',
          quantity: product.quantity,
          amount: product.price,
        },
      });
    }

    // 创建本月采购和消耗记录
    const currentMonth = dayjs();
    for (const product of createdProducts) {
      // 本月采购
      await prisma.inventoryCheck.create({
        data: {
          productId: product.id,
          date: currentMonth.toDate(),
          type: 'purchase',
          quantity: Math.floor(product.quantity * 0.5),
          amount: product.price * 0.5,
        },
      });

      // 本月消耗
      await prisma.inventoryCheck.create({
        data: {
          productId: product.id,
          date: currentMonth.toDate(),
          type: 'consume',
          quantity: Math.floor(product.quantity * 0.3),
          amount: product.price * 0.3,
        },
      });
    }

    console.log('Seed data created successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
