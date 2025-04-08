import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Create a new ratelimiter, that allows 20 requests per minute
export const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
})

// Wrapper function to handle rate limiting
export async function rateLimit(userId: string) {
  const { success } = await rateLimiter.limit(userId)
  
  if (!success) {
    return {
      error: new NextResponse("Too Many Requests", { status: 429 })
    }
  }

  return { success: true }
} 