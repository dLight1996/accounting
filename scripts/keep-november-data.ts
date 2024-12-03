import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function keepNovemberData() {
  try {
    console.log('Keeping only November data (10/26 - 11/25)...');

    // 获取11月的日期范围（11月指的是10/26-11/25）
    const startDate = dayjs('2023-10-26').startOf('day').toDate();
    const endDate = dayjs('2023-11-25').endOf('day').toDate();

    // 删除不在11月范围内的盘点记录
    const deletedChecks = await prisma.inventoryCheck.deleteMany({
      where: {
        NOT: {
          date: {
            gte: startDate,
            lte: endDate,
          }
        }
      }
    });

    console.log(`Deleted ${deletedChecks.count} inventory check records from other months`);
    console.log('Successfully kept only November data!');

  } catch (error) {
    console.error('Error while processing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

keepNovemberData()
