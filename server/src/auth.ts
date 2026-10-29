import { NextFunction, Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from './db'
import { defaultTypes } from './defaults'

const secret = process.env.JWT_SECRET ?? ''

const credentials = z.object({
  email: z.string().email().max(200).toLowerCase(),
  password: z.string().min(8).max(100),
})

function startSession(res: Response, userId: number) {
  const token = jwt.sign({ userId }, secret, { expiresIn: '7d' })
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = jwt.verify(req.cookies.token, secret) as { userId: number }
    res.locals.userId = userId
    next()
  } catch {
    res.status(401).json({ error: 'Not authenticated' })
  }
}

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { email, password } = credentials.parse(req.body)
  const hash = await bcrypt.hash(password, 12)
  const { rows } = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id, email',
    [email, hash],
  )

  if (!rows[0]) {
    res.status(409).json({ error: 'This email is already registered' })
    return
  }

  for (const type of defaultTypes) {
    await db.query('INSERT INTO activity_types (user_id, name, color, nature) VALUES ($1, $2, $3, $4)', [
      rows[0].id,
      type.name,
      type.color,
      type.nature,
    ])
  }
  startSession(res, rows[0].id)
  res.json(rows[0])
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = credentials.parse(req.body)
  const { rows } = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email])
  const user = rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  startSession(res, user.id)
  res.json({ id: user.id, email: user.email })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({})
})

authRouter.get('/me', requireAuth, async (_req, res) => {
  const { rows } = await db.query('SELECT id, email FROM users WHERE id = $1', [res.locals.userId])
  res.json(rows[0])
})
