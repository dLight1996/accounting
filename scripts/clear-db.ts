import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearDatabase() {
  try {
    // Delete records in reverse order of dependencies
    console.log('Clearing database...')
    
    // Clear InventoryCheck records
    await prisma.inventoryCheck.deleteMany()
    console.log('Cleared InventoryCheck records')
    
    // Clear StockLog records
    await prisma.stockLog.deleteMany()
    console.log('Cleared StockLog records')
    
    // Clear Transaction records
    await prisma.transaction.deleteMany()
    console.log('Cleared Transaction records')
    
    // Clear LoginLog records
    await prisma.loginLog.deleteMany()
    console.log('Cleared LoginLog records')
    
    // Clear Inventory records
    await prisma.inventory.deleteMany()
    console.log('Cleared Inventory records')
    
    // Clear Product records
    await prisma.product.deleteMany()
    console.log('Cleared Product records')
    
    // Clear ProductList records
    await prisma.productList.deleteMany()
    console.log('Cleared ProductList records')
    
    // Clear Session records
    await prisma.session.deleteMany()
    console.log('Cleared Session records')
    
    // Clear Account records
    await prisma.account.deleteMany()
    console.log('Cleared Account records')
    
    // Clear User records
    await prisma.user.deleteMany()
    console.log('Cleared User records')

    console.log('Database cleared successfully!')
  } catch (error) {
    console.error('Error clearing database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
