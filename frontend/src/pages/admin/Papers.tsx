import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { papersApi } from '../../services/api'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import type { PaperStatus } from '../../types'

const statusStyles: Record<PaperStatus, string> = {
  draft: 'bg-slate-600/40 text-slate-300',
  published: 'bg-emerald-500/15 text-emerald-300',
}

export default function Papers() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: papers, isLoading } = useQuery({ queryKey: ['papers'], queryFn: papersApi.list })

  const del = useMutation({
    mutationFn: (id: number) => papersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['papers'] }),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Papers</h1>
        <button
          onClick={() => navigate('/papers/new')}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          + New paper
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !papers?.length ? (
        <p className="text-slate-400">No papers yet. Create your first one.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Marks</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {papers.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer bg-slate-900/40 transition hover:bg-slate-800/40"
                  onClick={() => navigate(`/papers/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-100">{p.title}</td>
                  <td className="px-4 py-3 text-slate-400">{p.subject_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{p.question_count}</td>
                  <td className="px-4 py-3 text-slate-400">{p.total_marks}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(`/papers/${p.id}`)}
                      className="mr-4 text-indigo-400 transition hover:text-indigo-300"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${p.title}"?`)) del.mutate(p.id)
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
    </div>
  )
}
