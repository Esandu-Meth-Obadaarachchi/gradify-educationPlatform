import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subjectsApi } from '../../services/api'
import { getErrorMessage } from '../../lib/errors'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import type { Subject } from '../../types'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-indigo-500'

export default function Subjects() {
  const qc = useQueryClient()
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setName('')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(subject: Subject) {
    setEditing(subject)
    setName(subject.name)
    setError(null)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? subjectsApi.update(editing.id, name.trim()) : subjectsApi.create(name.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] })
      setModalOpen(false)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim()) saveMutation.mutate()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Subjects</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          + New subject
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !subjects?.length ? (
        <p className="text-slate-400">No subjects yet. Create your first one.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {subjects.map((s) => (
                <tr key={s.id} className="bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-slate-100">{s.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(s)}
                      className="mr-4 text-indigo-400 transition hover:text-indigo-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${s.name}"? This also removes its topics and questions.`,
                          )
                        ) {
                          deleteMutation.mutate(s.id)
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
        title={editing ? 'Edit subject' : 'New subject'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mathematics"
            className={inputClass}
          />
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
              disabled={saveMutation.isPending || !name.trim()}
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
