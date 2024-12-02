import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // 创建默认管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // 创建示例商品分类
    const categories = [
      { name: '电子产品', description: '包括手机、电脑等电子设备' },
      { name: '办公用品', description: '文具、纸张等办公必需品' },
      { name: '生活用品', description: '日常生活所需物品' },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    // 创建示例供应商
    const suppliers = [
      {
        name: '优质电子',
        code: 'SUP001',
        contact: '张三',
        phone: '13800138000',
        email: 'supplier1@example.com',
      },
      {
        name: '办公直供',
        code: 'SUP002',
        contact: '李四',
        phone: '13900139000',
        email: 'supplier2@example.com',
      },
    ];

    for (const supplier of suppliers) {
      await prisma.supplier.upsert({
        where: { code: supplier.code },
        update: {},
        create: supplier,
      });
    }

    console.log('✅ 数据库初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
