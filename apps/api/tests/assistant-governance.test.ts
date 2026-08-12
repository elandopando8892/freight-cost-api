import { describe, expect, it } from 'vitest'
import { ASSISTANT_HOURLY_LIMIT, assistantQuota } from '../src/modules/assistant/assistant-governance.js'

describe('assistant governance', () => {
  it('allows bounded requests and exposes the remaining quota', () => {
    const quota = assistantQuota(3, new Date('2026-08-11T12:00:00.000Z'))
    expect(quota).toMatchObject({ limit: ASSISTANT_HOURLY_LIMIT, used: 3, remaining: ASSISTANT_HOURLY_LIMIT - 3, allowed: true, windowMinutes: 60 })
  })

  it('blocks a request when the hourly quota is exhausted', () => {
    expect(assistantQuota(ASSISTANT_HOURLY_LIMIT).allowed).toBe(false)
    expect(assistantQuota(ASSISTANT_HOURLY_LIMIT + 1).remaining).toBe(0)
  })
})
