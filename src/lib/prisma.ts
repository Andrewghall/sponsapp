import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Add connection retry for production
if (process.env.NODE_ENV === 'production') {
  prisma.$connect()
    .then(() => {
      console.log('✅ Prisma connected successfully')
    })
    .catch((error) => {
      console.error('❌ Prisma connection failed:', error)
      // Retry connection after 5 seconds
      setTimeout(() => {
        prisma.$connect()
          .then(() => console.log('✅ Prisma reconnected successfully'))
          .catch((retryError) => console.error('❌ Prisma reconnection failed:', retryError))
      }, 5000)
    })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
