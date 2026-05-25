import { seedReferenceTables, prisma } from './reference.seed.js'

seedReferenceTables()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
