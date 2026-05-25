import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma.js'
import type { RegisterInput, LoginInput } from './auth.schema.js'

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    const err = new Error('Email already registered') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }

  const passwordHash = await bcrypt.hash(input.password, 12)

  const org = await prisma.organization.create({
    data: { name: input.orgName },
  })

  const user = await prisma.user.create({
    data: {
      orgId: org.id,
      email: input.email,
      passwordHash,
      role: 'ADMIN',
    },
    select: { id: true, email: true, role: true, orgId: true },
  })

  return { user, org }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user) {
    const err = new Error('Invalid credentials') as Error & { statusCode: number }
    err.statusCode = 401
    throw err
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) {
    const err = new Error('Invalid credentials') as Error & { statusCode: number }
    err.statusCode = 401
    throw err
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
  }
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, orgId: true, createdAt: true },
  })
}
