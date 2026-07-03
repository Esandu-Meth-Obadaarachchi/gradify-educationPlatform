import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { questionsApi, subjectsApi, topicsApi, type QuestionFilters } from '../../services/api'
import { DIFFICULTIES, type Difficulty } from '../../types'
import { getErrorMessage } from '../../lib/errors'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import FileUploader from '../../components/shared/FileUploader'
import QuestionCard from '../../components/admin/QuestionCard'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-indigo-500'
const filterClass =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500'

export default function Questions() {
  const qc = useQueryClient()
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })
  const { data: allTopics } = useQuery({ queryKey: ['topics', 'all'], queryFn: () => topicsApi.list() })

  // --- Filters ---
  const [fSubject, setFSubject] = useState<number | ''>('')
  const [fTopic, setFTopic] = useState<number | ''>('')
  const [fDifficulty, setFDifficulty] = useState<Difficulty | ''>('')

  const filters: QuestionFilters = {
    subject_id: fSubject || undefined,
    topic_id: fTopic || undefined,
    difficulty: fDifficulty || undefined,
  }
  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', filters],
    queryFn: () => questionsApi.list(filters),
  })

  const topicsForSubject = useMemo(
    () => allTopics?.filter((t) => !fSubject || t.subject_id === fSubject) ?? [],
    [allTopics, fSubject],
  )
  const topicById = useMemo(
    () => new Map((allTopics ?? []).map((t) => [t.id, t])),
    [allTopics],
  )

  // --- Upload modal ---
  const [open, setOpen] = useState(false)
  const [uTopic, setUTopic] = useState<number | ''>('')
  const [uDifficulty, setUDifficulty] = useState<Difficulty>('medium')
  const [uMarks, setUMarks] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function resetUpload() {
    setUTopic('')
    setUDifficulty('medium')
    setUMarks('')
    setFile(null)
    setError(null)
  }

  const uploadMutation = useMutation({
    mutationFn: () => questionsApi.create(file as File, Number(uTopic), uDifficulty, uMarks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      setOpen(false)
      resetUpload()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => questionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (file && uTopic) uploadMutation.mutate()
  }

  const noTopics = !allTopics?.length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Question Bank</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/questions/capture"
            className={`rounded-lg bg-slate-700 px-4 py-2 font-medium text-white transition hover:bg-slate-600 ${
              noTopics ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            Capture from PDF
          </Link>
          <button
            onClick={() => {
              resetUpload()
              setOpen(true)
            }}
            disabled={noTopics}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            + Upload question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={fSubject}
          onChange={(e) => {
            setFSubject(e.target.value ? Number(e.target.value) : '')
            setFTopic('')
          }}
          className={filterClass}
        >
          <option value="">All subjects</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={fTopic}
          onChange={(e) => setFTopic(e.target.value ? Number(e.target.value) : '')}
          className={filterClass}
        >
          <option value="">All topics</option>
          {topicsForSubject.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={fDifficulty}
          onChange={(e) => setFDifficulty((e.target.value as Difficulty) || '')}
          className={filterClass}
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </select>
      </div>

      {noTopics ? (
        <p className="text-slate-400">Create a subject and topic first, then upload questions.</p>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : !questions?.length ? (
        <p className="text-slate-400">No questions match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              topic={topicById.get(q.topic_id)}
              onDelete={(id) => {
                if (window.confirm('Delete this question?')) deleteMutation.mutate(id)
              }}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      <Modal open={open} title="Upload question" onClose={() => setOpen(false)}>
        <form onSubmit={handleUpload} className="space-y-4">
          <FileUploader onFileSelected={setFile} disabled={uploadMutation.isPending} />
          <div>
            <label className="mb-1 block text-sm text-slate-400">Topic</label>
            <select
              value={uTopic}
              onChange={(e) => setUTopic(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            >
              <option value="" disabled>
                Select a topic
              </option>
              {allTopics?.map((t) => (
                <option key={t.id} value={t.id}>
                  {subjects?.find((s) => s.id === t.subject_id)?.name} — {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Difficulty</label>
            <select
              value={uDifficulty}
              onChange={(e) => setUDifficulty(e.target.value as Difficulty)}
              className={inputClass}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d} className="capitalize">
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Original marks</label>
            <input
              value={uMarks}
              onChange={(e) => setUMarks(e.target.value)}
              placeholder="e.g. 3,1,2 for parts a,b,c — or 5 for a single mark"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter the paper's marks. Commas make sub-parts (3,1,2 → a=3 b=1 c=2). Leave blank if unknown.
            </p>
          </div>
          {error && (
            <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-slate-200 transition hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending || !file || !uTopic}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
