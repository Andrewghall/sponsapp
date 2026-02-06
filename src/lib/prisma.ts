/**
 * Prisma client singleton.
 *
 * In development Next.js hot-reloads modules frequently, which would create a
 * new PrismaClient on every reload and exhaust the database connection pool.
 * Storing the client on `globalThis` ensures a single instance survives reloads.
 *
 * In production, the client eagerly connects on startup and retries once after
 * 5 seconds if the initial connection fails.
 */

import { PrismaClient } from '@prisma/client'

/** Attach a singleton reference on globalThis so hot-reload doesn't leak clients. */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Eagerly connect in production with a single retry on failure.
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

// In development, cache the client on globalThis to survive hot-reloads.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
