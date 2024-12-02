import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // 创建默认管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@example.com',
        name: '系统管理员',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // 创建示例商品分类
    const categories = [
      { name: '电子产品', description: '包括手机、电脑等电子设备' },
      { name: '办公用品', description: '文具、纸张等办公必需品' },
      { name: '生活用品', description: '日常生活所需物品' },
      { name: '食品饮料', description: '各类食品和饮料' },
      { name: '服装服饰', description: '衣服、鞋帽等服装用品' },
    ];

    const createdCategories = await Promise.all(
      categories.map(category =>
        prisma.category.upsert({
          where: { name: category.name },
          update: {},
          create: category,
        })
      )
    );

    // 创建示例供应商
    const suppliers = [
      {
        name: '优质电子',
        code: 'SUP001',
        contact: '张三',
        phone: '13800138000',
        email: 'supplier1@example.com',
        address: '广东省深圳市南山区科技园',
      },
      {
        name: '办公直供',
        code: 'SUP002',
        contact: '李四',
        phone: '13900139000',
        email: 'supplier2@example.com',
        address: '浙江省杭州市滨江区网商路',
      },
      {
        name: '日用百货',
        code: 'SUP003',
        contact: '王五',
        phone: '13700137000',
        email: 'supplier3@example.com',
        address: '江苏省南京市建邺区新城科技园',
      },
    ];

    const createdSuppliers = await Promise.all(
      suppliers.map(supplier =>
        prisma.supplier.upsert({
          where: { code: supplier.code },
          update: {},
          create: supplier,
        })
      )
    );

    // 创建示例产品
    const products = [
      {
        name: '笔记本电脑',
        code: 'P001',
        description: '高性能商务笔记本',
        price: 5999,
        categoryId: createdCategories[0].id,
        supplierId: createdSuppliers[0].id,
      },
      {
        name: 'A4打印纸',
        code: 'P002',
        description: '优质打印复印纸',
        price: 39.9,
        categoryId: createdCategories[1].id,
        supplierId: createdSuppliers[1].id,
      },
      {
        name: '矿泉水',
        code: 'P003',
        description: '天然矿泉水 550ml',
        price: 2,
        categoryId: createdCategories[3].id,
        supplierId: createdSuppliers[2].id,
      },
    ];

    // 创建产品并初始化库存
    for (const product of products) {
      const createdProduct = await prisma.product.upsert({
        where: { code: product.code },
        update: {},
        create: product,
      });

      // 创建初始库存
      await prisma.inventory.upsert({
        where: { productId: createdProduct.id },
        update: {},
        create: {
          productId: createdProduct.id,
          quantity: 100,
          minStock: 10,
          maxStock: 1000,
        },
      });

      // 创建示例库存记录
      await prisma.stockLog.create({
        data: {
          productId: createdProduct.id,
          type: 'IN',
          quantity: 100,
          beforeStock: 0,
          afterStock: 100,
          reason: '初始库存',
        },
      });
    }

    console.log('数据初始化完成');
  } catch (error) {
    console.error('数据初始化失败:', error);
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
