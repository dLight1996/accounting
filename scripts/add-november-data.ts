import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addNovemberData() {
  try {
    console.log('Adding November inventory check data...')

    // 1. 创建产品列表
    const productLists = await Promise.all([
      prisma.productList.create({
        data: {
          name: '生菜',
          price: 8.0,
          unit: 'kg'
        }
      }),
      prisma.productList.create({
        data: {
          name: '土豆',
          price: 5.0,
          unit: 'kg'
        }
      }),
      prisma.productList.create({
        data: {
          name: '白菜',
          price: 4.0,
          unit: 'kg'
        }
      }),
      prisma.productList.create({
        data: {
          name: '胡萝卜',
          price: 6.0,
          unit: 'kg'
        }
      })
    ])

    console.log('Created product lists')

    // 2. 为每个产品创建产品记录
    const products = await Promise.all(productLists.map(pl => 
      prisma.product.create({
        data: {
          name: pl.name,
          unitPrice: pl.price,
          quantity: 0,
          price: pl.price,
          unit: pl.unit,
          kgRatio: 1,
          importDate: new Date(),
          productListId: pl.id
        }
      })
    ))

    console.log('Created products')

    // 3. 创建11月的盘点记录（从10月26日到11月25日）
    const novemberDates = [
      new Date('2023-10-26'),
      new Date('2023-10-30'),
      new Date('2023-11-05'),
      new Date('2023-11-10'),
      new Date('2023-11-15'),
      new Date('2023-11-20'),
      new Date('2023-11-25')
    ]

    // 为每个产品创建采购和消耗记录
    for (const product of products) {
      for (const date of novemberDates) {
        // 采购记录
        const purchaseQuantity = Math.floor(Math.random() * 20) + 10 // 10-30之间的随机数
        await prisma.inventoryCheck.create({
          data: {
            productId: product.id,
            date: date,
            type: 'purchase',
            quantity: purchaseQuantity,
            amount: purchaseQuantity * product.unitPrice,
            note: `${date.getMonth() + 1}月${date.getDate()}日采购`
          }
        })

        // 消耗记录
        const consumeQuantity = Math.floor(Math.random() * 15) + 5 // 5-20之间的随机数
        await prisma.inventoryCheck.create({
          data: {
            productId: product.id,
            date: date,
            type: 'consume',
            quantity: consumeQuantity,
            amount: consumeQuantity * product.unitPrice,
            note: `${date.getMonth() + 1}月${date.getDate()}日消耗`
          }
        })
      }
    }

    console.log('Created inventory check records')
    console.log('All November data has been added successfully!')

  } catch (error) {
    console.error('Error adding November data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addNovemberData()
