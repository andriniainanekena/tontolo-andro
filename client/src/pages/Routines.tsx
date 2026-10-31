import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus } from 'lucide-react'
import { useActivityTypes } from '../activityTypes'
import { api } from '../api'
import ColorNameForm from '../components/ColorNameForm'
import {
  Button,
  card,
  ConfirmButton,
  cx,
  EmptyState,
  Field,
  IconButton,
  inputClass,
  PageHeader,
  Skeleton,
} from '../components/ui'
import { addMinutes, formatMinutes, toMinutes } from '../dates'
import { useToast } from '../toast'
import { palette } from '../types'
import type { Routine, RoutineActivity } from '../types'

const duration = (item: RoutineActivity) => {
  const span = toMinutes(item.end) - toMinutes(item.start)
  return span > 0 ? span : span + 1440
}

function RoutineEditor({ routine, onChanged }: { routine: Routine; onChanged: () => void }) {
  const { active, byId } = useActivityTypes()
  const { fail } = useToast()
  const [items, setItems] = useState<RoutineActivity[] | null>(null)
  const [editing, setEditing] = useState<RoutineActivity | null>(null)
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState<number | null>(null)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await api<RoutineActivity[]>(`/categories/${routine.id}/activities`))
    } catch (error) {
      fail(error)
    }
  }, [routine.id, fail])

  useEffect(() => {
    load()
  }, [load])

  const selectedType = typeId ?? active[0]?.id ?? null

  const currentType = editing ? byId.get(editing.typeId) : undefined
  const options = currentType && currentType.archived ? [...active, currentType] : active

  function startEdit(item: RoutineActivity) {
    setEditing(item)
    setTitle(item.title)
    setTypeId(item.typeId)
    setStart(item.start)
    setEnd(item.end)
  }

  function stopEdit() {
    setEditing(null)
    setTitle('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (selectedType === null || busy) return
    setBusy(true)
    try {
      const body = { title: title.trim(), typeId: selectedType, start, end }
      if (editing) await api(`/template-activities/${editing.id}`, 'PATCH', body)
      else await api(`/categories/${routine.id}/activities`, 'POST', body)
      if (!editing) {
        setStart(end)
        setEnd(addMinutes(end, 60))
      }
      stopEdit()
      await load()
      onChanged()
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: RoutineActivity) {
    try {
      await api(`/template-activities/${item.id}`, 'DELETE')
      if (editing?.id === item.id) stopEdit()
      await load()
      onChanged()
    } catch (error) {
      fail(error)
    }
  }

  const total = (items ?? []).reduce((sum, item) => sum + duration(item), 0)

  return (
    <div className="border-t border-line p-3 sm:p-4">
      {items === null ? (
        <Skeleton className="h-16" />
      ) : items.length === 0 ? (
        <p className="pb-4 text-sm text-muted">
          No activities yet. Add the blocks of this routine below: study, meals, sleep…
        </p>
      ) : (
        <>
          <ul className="mb-2">
            {items.map((item) => {
              const type = byId.get(item.typeId)
              return (
                <li
                  key={item.id}
                  className={cx('flex items-center gap-3 rounded-xl px-2 py-2', editing?.id === item.id && 'bg-sunken')}
                >
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: type?.color }}
                    aria-hidden="true"
                  />
                  <span className="w-[6.5rem] shrink-0 text-sm text-muted tabular-nums">
                    {item.start}–{item.end}
                    {toMinutes(item.end) <= toMinutes(item.start) && <sup className="ml-0.5">+1</sup>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{type?.name ?? 'Other'}</span>
                  </span>
                  <IconButton icon={Pencil} label={`Edit ${item.title}`} onClick={() => startEdit(item)} />
                  <ConfirmButton label={`Delete ${item.title}`} iconOnly onConfirm={() => remove(item)} />
                </li>
              )
            })}
          </ul>
          <p className="mb-4 px-2 text-sm text-muted">
            {items.length} {items.length === 1 ? 'activity' : 'activities'}, {formatMinutes(total)} planned
          </p>
        </>
      )}

      <form
        onSubmit={submit}
        className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_7rem_7rem_auto]"
      >
        <Field label="Activity" className="col-span-2 sm:col-span-1">
          <select
            value={selectedType ?? ''}
            onChange={(event) => setTypeId(Number(event.target.value))}
            className={inputClass}
          >
            {options.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title" className="col-span-2 sm:col-span-1">
          <input
            required
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Study block"
            className={inputClass}
          />
        </Field>
        <Field label="From">
          <input
            type="time"
            required
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="To">
          <input
            type="time"
            required
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <Button
            type="submit"
            variant="primary"
            icon={editing ? Check : Plus}
            disabled={busy || !title.trim()}
            className="flex-1"
          >
            {editing ? 'Save' : 'Add'}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={stopEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      <p className="mt-2 text-sm text-muted">
        An end time earlier than the start runs past midnight, like sleep from 22:00 to 05:00.
      </p>
    </div>
  )
}

export default function Routines() {
  const { notify, fail } = useToast()
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setRoutines(await api<Routine[]>('/categories'))
    } catch (error) {
      fail(error)
      setRoutines((current) => current ?? [])
    }
  }, [fail])

  useEffect(() => {
    load()
  }, [load])

  async function create({ name, color }: { name: string; color: string }) {
    try {
      const routine = await api<Routine>('/categories', 'POST', { name, color })
      await load()
      setOpenId(routine.id)
      notify(`${name} created. Add its activities below.`)
    } catch (error) {
      fail(error)
      throw error
    }
  }

  async function rename(routine: Routine, { name, color }: { name: string; color: string }) {
    try {
      await api(`/categories/${routine.id}`, 'PATCH', { name, color })
      setRenaming(null)
      await load()
    } catch (error) {
      fail(error)
      throw error
    }
  }

  async function remove(routine: Routine) {
    try {
      await api(`/categories/${routine.id}`, 'DELETE')
      if (openId === routine.id) setOpenId(null)
      await load()
      notify(`${routine.name} deleted`)
    } catch (error) {
      fail(error)
    }
  }

  return (
    <div>
      <PageHeader title="Routines" subtitle="Build your own day templates, then apply one to any day from Today." />

      <section className={`${card} p-4`} aria-labelledby="new-routine">
        <h2 id="new-routine" className="mb-3 font-display text-lg font-semibold">
          New routine
        </h2>
        <ColorNameForm
          initialColor={palette[0]}
          placeholder="Routine name, e.g. Campus day"
          submitLabel="Add"
          resetOnSubmit
          onSubmit={create}
        />
      </section>

      <div className="mt-8">
        {routines === null ? (
          <div className="space-y-2">
            <Skeleton className="h-[4.5rem]" />
            <Skeleton className="h-[4.5rem]" />
          </div>
        ) : routines.length === 0 ? (
          <EmptyState
            title="No routines yet"
            text="Create your first routine above, then add its activities: study blocks, meals, sleep."
          />
        ) : (
          <ul className="space-y-2">
            {routines.map((routine) => {
              const open = openId === routine.id
              return (
                <li key={routine.id} className={`${card} overflow-hidden`}>
                  <div className="flex items-center gap-1 p-2 sm:gap-2 sm:p-3">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : routine.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left hover:bg-sunken"
                    >
                      <span
                        className="h-10 w-10 shrink-0 rounded-xl"
                        style={{ backgroundColor: routine.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{routine.name}</span>
                        <span className="block text-sm text-muted">
                          {routine.count} {routine.count === 1 ? 'activity' : 'activities'}
                        </span>
                      </span>
                      <ChevronDown
                        className={cx('h-5 w-5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
                      />
                    </button>
                    <IconButton
                      icon={Pencil}
                      label={`Rename ${routine.name}`}
                      onClick={() => setRenaming(renaming === routine.id ? null : routine.id)}
                    />
                    <ConfirmButton label={`Delete ${routine.name}`} iconOnly onConfirm={() => remove(routine)} />
                  </div>
                  {renaming === routine.id && (
                    <div className="border-t border-line p-3">
                      <ColorNameForm
                        initialName={routine.name}
                        initialColor={routine.color}
                        placeholder="Routine name"
                        submitLabel="Save"
                        onSubmit={(value) => rename(routine, value)}
                        onCancel={() => setRenaming(null)}
                      />
                    </div>
                  )}
                  {open && <RoutineEditor routine={routine} onChanged={load} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
