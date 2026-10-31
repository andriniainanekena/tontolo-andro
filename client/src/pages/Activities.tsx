import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useActivityTypes } from '../activityTypes'
import { api } from '../api'
import ColorNameForm from '../components/ColorNameForm'
import { card, ConfirmButton, IconButton, inputClass, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../toast'
import { ActivityType, Nature, natureLabels, natures, palette } from '../types'

function TypeForm({ initial, onDone }: { initial?: ActivityType; onDone?: () => void }) {
  const { refresh } = useActivityTypes()
  const { notify, fail } = useToast()
  const [nature, setNature] = useState<Nature>(initial?.nature ?? 'productive')

  return (
    <ColorNameForm
      initialName={initial?.name}
      initialColor={initial?.color ?? palette[Math.floor(Math.random() * palette.length)]}
      placeholder="New activity, e.g. Guitar"
      submitLabel={initial ? 'Save' : 'Add'}
      resetOnSubmit={!initial}
      maxLength={40}
      onCancel={onDone}
      onSubmit={async ({ name, color }) => {
        try {
          if (initial) await api(`/activity-types/${initial.id}`, 'PATCH', { name, color, nature })
          else await api('/activity-types', 'POST', { name, color, nature })
          await refresh()
          notify(initial ? 'Activity updated' : `${name} added`)
          onDone?.()
        } catch (error) {
          fail(error)
          throw error
        }
      }}
    >
      <select
        aria-label="Group"
        value={nature}
        onChange={(event) => setNature(event.target.value as Nature)}
        className={`${inputClass} w-auto`}
      >
        {natures.map((item) => (
          <option key={item} value={item}>
            {natureLabels[item]}
          </option>
        ))}
      </select>
    </ColorNameForm>
  )
}

export default function Activities() {
  const { ready, active, refresh } = useActivityTypes()
  const { notify, fail } = useToast()
  const [editing, setEditing] = useState<number | null>(null)

  async function remove(type: ActivityType) {
    try {
      await api(`/activity-types/${type.id}`, 'DELETE')
      await refresh()
      notify(`${type.name} deleted`)
    } catch (error) {
      fail(error)
    }
  }

  return (
    <div>
      <PageHeader title="Activities" />

      <section className={`${card} p-4`} aria-labelledby="new-activity">
        <h2 id="new-activity" className="mb-3 font-display text-lg font-semibold">
          New activity
        </h2>
        <TypeForm />
      </section>

      {!ready ? (
        <Skeleton className="mt-8 h-40" />
      ) : (
        <div className="mt-8 space-y-8">
          {natures.map((nature) => {
            const list = active.filter((type) => type.nature === nature)
            if (list.length === 0) return null
            return (
              <section key={nature} aria-labelledby={`group-${nature}`}>
                <h2 id={`group-${nature}`} className="mb-3 font-display text-lg font-semibold">
                  {natureLabels[nature]}{' '}
                  <span className="font-sans text-sm font-normal text-muted">({list.length})</span>
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((type) =>
                    editing === type.id ? (
                      <li key={type.id} className={`${card} p-3 sm:col-span-2 lg:col-span-3`}>
                        <TypeForm initial={type} onDone={() => setEditing(null)} />
                      </li>
                    ) : (
                      <li key={type.id} className={`${card} flex items-center gap-3 p-3`}>
                        <span
                          className="h-10 w-10 shrink-0 rounded-xl"
                          style={{ backgroundColor: type.color }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{type.name}</span>
                        <IconButton icon={Pencil} label={`Edit ${type.name}`} onClick={() => setEditing(type.id)} />
                        <ConfirmButton label={`Delete ${type.name}`} iconOnly onConfirm={() => remove(type)} />
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
