import { PrismaClient } from '@prisma/client'
import { syncParameterCatalog } from './parameter-catalog.seed.js'

const prisma = new PrismaClient()
syncParameterCatalog(prisma)
  .then((result) => console.log(`Catalog synchronized: ${result.definitions} definitions; ${result.paramsLinked} params linked.`))
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
