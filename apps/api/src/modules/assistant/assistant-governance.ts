export const ASSISTANT_HOURLY_LIMIT = 12
export const ASSISTANT_WINDOW_MS = 60 * 60 * 1000

export function assistantQuota(recentRequests: number, now = new Date()) {
  const used = Math.max(0, recentRequests)
  return {
    limit: ASSISTANT_HOURLY_LIMIT,
    used,
    remaining: Math.max(0, ASSISTANT_HOURLY_LIMIT - used),
    allowed: used < ASSISTANT_HOURLY_LIMIT,
    windowMinutes: 60,
    windowStartedAt: new Date(now.getTime() - ASSISTANT_WINDOW_MS),
  }
}
