import { unknownType } from '../activityTypes'
import { toMinutes } from '../dates'
import type { Activity, ActivityType } from '../types'

const hours = [0, 6, 12, 18, 24]

export default function DayRibbon({
  activities,
  byId,
  nowMinutes,
}: {
  activities: Activity[]
  byId: Map<number, ActivityType>
  nowMinutes: number | null
}) {
  const segments = activities.flatMap((activity) => {
    const start = toMinutes(activity.start)
    const end = toMinutes(activity.end)
    const parts =
      end > start
        ? [[start, end]]
        : [
            [start, 1440],
            [0, end],
          ]
    return parts.filter(([from, to]) => to > from).map(([from, to]) => ({ activity, from, to }))
  })

  return (
    <div>
      <div
        role="img"
        aria-label={`Timeline of the day with ${activities.length} planned blocks`}
        className="relative h-12 overflow-hidden rounded-xl bg-sunken"
      >
        {segments.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">Nothing planned</p>
        )}
        {segments.map(({ activity, from, to }, index) => {
          const type = byId.get(activity.typeId) ?? unknownType
          return (
            <div
              key={`${activity.id}-${index}`}
              title={`${activity.start}–${activity.end} ${activity.title} (${type.name})`}
              className="absolute inset-y-1.5 rounded-md"
              style={{
                left: `${(from / 1440) * 100}%`,
                width: `calc(${((to - from) / 1440) * 100}% - 2px)`,
                backgroundColor: type.color,
                opacity: activity.status === 'done' ? 1 : activity.status === 'skipped' ? 0.22 : 0.55,
              }}
            />
          )
        })}
        {nowMinutes !== null && (
          <div
            className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-ink"
            style={{ left: `${(nowMinutes / 1440) * 100}%` }}
          >
            <span className="absolute -top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-ink bg-mark" />
          </div>
        )}
      </div>
      <div className="relative mt-1.5 h-4 text-xs text-muted tabular-nums" aria-hidden="true">
        {hours.map((hour) => (
          <span
            key={hour}
            className="absolute"
            style={{
              left: `${(hour / 24) * 100}%`,
              transform: hour === 0 ? 'none' : hour === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {hour}h
          </span>
        ))}
      </div>
    </div>
  )
}
