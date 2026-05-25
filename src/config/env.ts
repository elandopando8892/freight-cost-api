import { cleanEnv, str, num, makeValidator } from 'envalid'

const nodeEnv = makeValidator((x) => {
  if (!['development', 'production', 'test'].includes(x)) throw new Error('Invalid NODE_ENV')
  return x as 'development' | 'production' | 'test'
})

export const env = cleanEnv(process.env, {
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: '7d' }),
  PORT: num({ default: 3000 }),
  NODE_ENV: nodeEnv({ default: 'development' }),
  // EIA API v2 key for historical diesel (optional; set in Vercel env, never commit)
  EIA_API_KEY: str({ default: '' }),
  // Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`.
  // Empty → cron endpoints fail closed (401). Set in Vercel env, never commit.
  CRON_SECRET: str({ default: '' }),
})
