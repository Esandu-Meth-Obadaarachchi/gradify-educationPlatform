import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subjectsApi, topicsApi } from '../../services/api'
import { getErrorMessage } from '../../lib/errors'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import type { Topic } from '../../types'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-indigo-500'

export default function Topics() {
  const qc = useQueryClient()
  const [filterSubject, setFilterSubject] = useState<number | ''>('')

  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })
  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics', filterSubject || 'all'],
    queryFn: () => topicsApi.list(filterSubject || undefined),
  })

  const subjectName = (id: number) => subjects?.find((s) => s.id === id)?.name ?? '—'

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Topic | null>(null)
  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setName('')
    setSubjectId(filterSubject || subjects?.[0]?.id || '')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(topic: Topic) {
    setEditing(topic)
    setName(topic.name)
    setSubjectId(topic.subject_id)
    setError(null)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const sid = Number(subjectId)
      return editing
        ? topicsApi.update(editing.id, { name: name.trim(), subject_id: sid })
        : topicsApi.create(name.trim(), sid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] })
      setModalOpen(false)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim() && subjectId) saveMutation.mutate()
  }

  const noSubjects = !subjects?.length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Topics</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value ? Number(e.target.value) : '')}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="">All subjects</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={openCreate}
            disabled={noSubjects}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            + New topic
          </button>
        </div>
      </div>

      {noSubjects ? (
        <p className="text-slate-400">Create a subject first, then add topics to it.</p>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : !topics?.length ? (
        <p className="text-slate-400">No topics found for this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {topics.map((t) => (
                <tr key={t.id} className="bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-slate-100">{t.name}</td>
                  <td className="px-4 py-3 text-slate-400">{subjectName(t.subject_id)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(t)}
                      className="mr-4 text-indigo-400 transition hover:text-indigo-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${t.name}"? This also removes its questions.`)) {
                          deleteMutation.mutate(t.id)
                        }
                      }}
                      className="text-rose-400 transition hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit topic' : 'New topic'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            >
              <option value="" disabled>
                Select a subject
              </option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Topic name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Algebra"
              className={inputClass}
            />
          </div>
          {error && (
            <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-slate-200 transition hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || !name.trim() || !subjectId}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
