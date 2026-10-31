import { Response, Router } from 'express'
import { z } from 'zod'
import { db, withTransaction } from './db'

export const router = Router()

const durations = { focus: 25, short_break: 5, long_break: 15 } as const

const sessionEnd = `started_at + planned_minutes * interval '1 minute'`
const sessionMinutes = `(EXTRACT(EPOCH FROM LEAST(COALESCE(ended_at, now()), ${sessionEnd}) - started_at) / 60)::float8`
const sessionDone = `COALESCE(ended_at, now()) >= ${sessionEnd}`

const id = z.coerce.number().int().positive()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
const nature = z.enum(['productive', 'leisure', 'essential'])
const instant = z.string().datetime()

const isDuplicate = (error: unknown) => (error as { code?: string }).code === '23505'
const notFound = (res: Response) => res.status(404).json({ error: 'Not found' })

const typeBody = z.object({ name: z.string().trim().min(1).max(40), color, nature })

router.get('/activity-types', async (_req, res) => {
  const { rows } = await db.query(
    'SELECT id, name, color, nature, archived FROM activity_types WHERE user_id = $1 ORDER BY id',
    [res.locals.userId],
  )
  res.json(rows)
})

router.post('/activity-types', async (req, res) => {
  const body = typeBody.parse(req.body)
  try {
    const { rows } = await db.query(
      `INSERT INTO activity_types (user_id, name, color, nature) VALUES ($1, $2, $3, $4)
       RETURNING id, name, color, nature, archived`,
      [res.locals.userId, body.name, body.color, body.nature],
    )
    res.json(rows[0])
  } catch (error) {
    if (!isDuplicate(error)) throw error
    res.status(409).json({ error: 'You already have an activity with this name' })
  }
})

router.patch('/activity-types/:id', async (req, res) => {
  const body = typeBody.parse(req.body)
  try {
    const { rows } = await db.query(
      `UPDATE activity_types SET name = $1, color = $2, nature = $3
       WHERE id = $4 AND user_id = $5 AND NOT archived RETURNING id, name, color, nature, archived`,
      [body.name, body.color, body.nature, id.parse(req.params.id), res.locals.userId],
    )
    if (!rows[0]) return notFound(res)
    res.json(rows[0])
  } catch (error) {
    if (!isDuplicate(error)) throw error
    res.status(409).json({ error: 'You already have an activity with this name' })
  }
})

router.delete('/activity-types/:id', async (req, res) => {
  await db.query('UPDATE activity_types SET archived = true WHERE id = $1 AND user_id = $2', [
    id.parse(req.params.id),
    res.locals.userId,
  ])
  res.json({})
})

const routineBody = z.object({ name: z.string().trim().min(1).max(60), color })

router.get('/categories', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT c.id, c.name, c.color, COUNT(t.id)::int AS count
     FROM categories c LEFT JOIN template_activities t ON t.category_id = c.id
     WHERE c.user_id = $1 GROUP BY c.id ORDER BY c.id`,
    [res.locals.userId],
  )
  res.json(rows)
})

router.post('/categories', async (req, res) => {
  const body = routineBody.parse(req.body)
  const { rows } = await db.query(
    'INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color, 0 AS count',
    [res.locals.userId, body.name, body.color],
  )
  res.json(rows[0])
})

router.patch('/categories/:id', async (req, res) => {
  const body = routineBody.parse(req.body)
  const { rowCount } = await db.query('UPDATE categories SET name = $1, color = $2 WHERE id = $3 AND user_id = $4', [
    body.name,
    body.color,
    id.parse(req.params.id),
    res.locals.userId,
  ])
  if (!rowCount) return notFound(res)
  res.json({})
})

router.delete('/categories/:id', async (req, res) => {
  await db.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id.parse(req.params.id), res.locals.userId])
  res.json({})
})

const templateBody = z
  .object({ title: z.string().trim().min(1).max(100), typeId: z.number().int().positive(), start: clock, end: clock })
  .refine((value) => value.start !== value.end, { message: 'Start and end must differ' })

router.get('/categories/:id/activities', async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.id, t.title, t.type_id AS "typeId",
            to_char(t.start_time, 'HH24:MI') AS start, to_char(t.end_time, 'HH24:MI') AS "end"
     FROM template_activities t JOIN categories c ON c.id = t.category_id
     WHERE c.id = $1 AND c.user_id = $2 ORDER BY t.start_time, t.id`,
    [id.parse(req.params.id), res.locals.userId],
  )
  res.json(rows)
})

router.post('/categories/:id/activities', async (req, res) => {
  const body = templateBody.parse(req.body)
  const { rows } = await db.query(
    `INSERT INTO template_activities (category_id, title, type_id, start_time, end_time)
     SELECT c.id, $3::text, ty.id, $4::time, $5::time
     FROM categories c, activity_types ty
     WHERE c.id = $1 AND c.user_id = $2 AND ty.id = $6 AND ty.user_id = $2 AND NOT ty.archived
     RETURNING id`,
    [id.parse(req.params.id), res.locals.userId, body.title, body.start, body.end, body.typeId],
  )
  if (!rows[0]) return notFound(res)
  res.json({})
})

router.patch('/template-activities/:id', async (req, res) => {
  const body = templateBody.parse(req.body)
  const { rowCount } = await db.query(
    `UPDATE template_activities t SET title = $1, type_id = $2, start_time = $3, end_time = $4
     FROM categories c
     WHERE t.id = $5 AND c.id = t.category_id AND c.user_id = $6
       AND EXISTS (SELECT 1 FROM activity_types ty WHERE ty.id = $2 AND ty.user_id = $6)`,
    [body.title, body.typeId, body.start, body.end, id.parse(req.params.id), res.locals.userId],
  )
  if (!rowCount) return notFound(res)
  res.json({})
})

router.delete('/template-activities/:id', async (req, res) => {
  await db.query(
    `DELETE FROM template_activities t USING categories c
     WHERE t.id = $1 AND c.id = t.category_id AND c.user_id = $2`,
    [id.parse(req.params.id), res.locals.userId],
  )
  res.json({})
})

router.get('/schedule', async (req, res) => {
  const date = day.parse(req.query.day)
  const { rows } = await db.query(
    `SELECT id, title, status, type_id AS "typeId",
            to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end"
     FROM daily_activities WHERE user_id = $1 AND day = $2 ORDER BY start_time, id`,
    [res.locals.userId, date],
  )
  res.json(rows)
})

router.post('/schedule/generate', async (req, res) => {
  const body = z.object({ day, categoryId: z.number().int() }).parse(req.body)
  const { rowCount } = await db.query(
    `WITH cleared AS (
       DELETE FROM daily_activities
       WHERE user_id = $1 AND day = $2 AND status = 'planned'
         AND EXISTS (
           SELECT 1 FROM template_activities t JOIN categories c ON c.id = t.category_id
           WHERE c.id = $3 AND c.user_id = $1
         )
     )
     INSERT INTO daily_activities (user_id, day, title, type_id, start_time, end_time)
     SELECT $1::int, $2::date, t.title, t.type_id, t.start_time, t.end_time
     FROM template_activities t JOIN categories c ON c.id = t.category_id
     WHERE c.id = $3 AND c.user_id = $1`,
    [res.locals.userId, body.day, body.categoryId],
  )
  res.json({ added: rowCount ?? 0 })
})

router.patch('/schedule/:id', async (req, res) => {
  const body = z.object({ status: z.enum(['planned', 'done', 'skipped']) }).parse(req.body)
  await db.query('UPDATE daily_activities SET status = $1 WHERE id = $2 AND user_id = $3', [
    body.status,
    id.parse(req.params.id),
    res.locals.userId,
  ])
  res.json({})
})

router.delete('/schedule/:id', async (req, res) => {
  await db.query('DELETE FROM daily_activities WHERE id = $1 AND user_id = $2', [
    id.parse(req.params.id),
    res.locals.userId,
  ])
  res.json({})
})

router.get('/calendar', async (req, res) => {
  const { month } = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query)
  const { rows } = await db.query(
    `SELECT day::text AS day, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'done')::int AS done
     FROM daily_activities WHERE user_id = $1 AND to_char(day, 'YYYY-MM') = $2 GROUP BY day`,
    [res.locals.userId, month],
  )
  res.json(rows)
})

const sessionColumns = `id, kind, type_id AS "typeId", label, started_at AS "startedAt", planned_minutes AS "plannedMinutes"`

router.get('/pomodoro/active', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT ${sessionColumns} FROM pomodoro_sessions WHERE user_id = $1 AND ended_at IS NULL LIMIT 1`,
    [res.locals.userId],
  )
  res.json(rows[0] ?? null)
})

router.get('/pomodoro/cycle', async (req, res) => {
  const { from } = z.object({ from: instant }).parse(req.query)
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS completed
     FROM pomodoro_sessions
     WHERE user_id = $1 AND kind = 'focus' AND ${sessionDone}
       AND started_at >= GREATEST($2::timestamptz,
         COALESCE((SELECT MAX(started_at) FROM pomodoro_sessions WHERE user_id = $1 AND kind = 'long_break'), '-infinity'::timestamptz))`,
    [res.locals.userId, from],
  )
  res.json(rows[0])
})

router.post('/pomodoro', async (req, res) => {
  const body = z
    .object({
      kind: z.enum(['focus', 'short_break', 'long_break']),
      typeId: z.number().int().positive(),
      label: z.string().trim().max(200).default(''),
    })
    .parse(req.body)

  try {
    const session = await withTransaction(async (client) => {
      const type = await client.query('SELECT 1 FROM activity_types WHERE id = $1 AND user_id = $2 AND NOT archived', [
        body.typeId,
        res.locals.userId,
      ])
      if (!type.rowCount) return null

      await client.query(
        `UPDATE pomodoro_sessions SET ended_at = LEAST(now(), ${sessionEnd}) WHERE user_id = $1 AND ended_at IS NULL`,
        [res.locals.userId],
      )
      const { rows } = await client.query(
        `INSERT INTO pomodoro_sessions (user_id, kind, type_id, label, planned_minutes) VALUES ($1, $2, $3, $4, $5)
         RETURNING ${sessionColumns}`,
        [res.locals.userId, body.kind, body.typeId, body.label, durations[body.kind]],
      )
      return rows[0]
    })

    if (!session) {
      res.status(400).json({ error: 'Unknown activity' })
      return
    }
    res.json(session)
  } catch (error) {
    if (!isDuplicate(error)) throw error
    res.status(409).json({ error: 'A session is already running' })
  }
})

router.post('/pomodoro/:id/stop', async (req, res) => {
  const { rows } = await db.query(
    `UPDATE pomodoro_sessions SET ended_at = LEAST(now(), ${sessionEnd})
     WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
     RETURNING kind, ended_at >= ${sessionEnd} AS completed`,
    [id.parse(req.params.id), res.locals.userId],
  )
  res.json(rows[0] ?? null)
})

router.get('/stats', async (req, res) => {
  const range = z.object({ from: instant, to: instant, day }).parse(req.query)

  const sessions = await db.query(
    `SELECT type_id AS "typeId", kind, ${sessionDone} AS done, ${sessionMinutes} AS minutes
     FROM pomodoro_sessions WHERE user_id = $1 AND started_at >= $2 AND started_at < $3`,
    [res.locals.userId, range.from, range.to],
  )

  const byType = new Map<number, number>()
  let focus = 0
  let pomodoros = 0
  for (const session of sessions.rows) {
    byType.set(session.typeId, (byType.get(session.typeId) ?? 0) + session.minutes)
    if (session.kind === 'focus') {
      focus += session.minutes
      if (session.done) pomodoros += 1
    }
  }

  const tasks = await db.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'done')::int AS done, COUNT(*)::int AS total
     FROM daily_activities WHERE user_id = $1 AND day = $2`,
    [res.locals.userId, range.day],
  )

  res.json({
    focus: Math.round(focus),
    pomodoros,
    byType: [...byType]
      .map(([typeId, minutes]) => ({ typeId, minutes: Math.round(minutes) }))
      .filter((item) => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes),
    ...tasks.rows[0],
  })
})

const timezone = z
  .string()
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value })
      return true
    } catch {
      return false
    }
  })

router.get('/report', async (req, res) => {
  const range = z.object({ from: day, to: day, tz: timezone }).parse(req.query)
  const params = [res.locals.userId, range.from, range.to]

  const timer = await db.query(
    `SELECT (started_at AT TIME ZONE $4)::date::text AS day, type_id AS "typeId", ROUND(SUM(${sessionMinutes}))::int AS minutes
     FROM pomodoro_sessions
     WHERE user_id = $1
       AND started_at >= $2::date - 1 AND started_at < $3::date + 2
       AND (started_at AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date
     GROUP BY 1, 2 ORDER BY 1`,
    [...params, range.tz],
  )

  const pomodoros = await db.query(
    `SELECT COUNT(*)::int AS count FROM pomodoro_sessions
     WHERE user_id = $1 AND kind = 'focus' AND ${sessionDone}
       AND started_at >= $2::date - 1 AND started_at < $3::date + 2
       AND (started_at AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date`,
    [...params, range.tz],
  )

  const routine = await db.query(
    `SELECT type_id AS "typeId",
            ROUND(SUM(EXTRACT(EPOCH FROM end_time - start_time + CASE WHEN end_time <= start_time THEN interval '24 hours' ELSE interval '0' END)) / 60)::int AS minutes
     FROM daily_activities
     WHERE user_id = $1 AND status = 'done' AND day BETWEEN $2::date AND $3::date
     GROUP BY type_id ORDER BY minutes DESC`,
    params,
  )

  const tasks = await db.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'done')::int AS done,
            COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
            COUNT(*)::int AS total
     FROM daily_activities WHERE user_id = $1 AND day BETWEEN $2::date AND $3::date`,
    params,
  )

  res.json({ timer: timer.rows, routine: routine.rows, pomodoros: pomodoros.rows[0].count, tasks: tasks.rows[0] })
})
