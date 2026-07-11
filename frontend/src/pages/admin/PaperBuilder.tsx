import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { papersApi, questionsApi, subjectsApi, topicsApi } from '../../services/api'
import { DIFFICULTIES, type Difficulty, type PaperQuestion, type PaperStatus } from '../../types'
import { getErrorMessage } from '../../lib/errors'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import PaperPreview from '../../components/admin/PaperPreview'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-indigo-500'
const labelClass = 'mb-1 block text-sm text-slate-400'
const filterClass =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500'

export default function PaperBuilder() {
  const { id } = useParams()
  if (!id) return <CreatePaper />
  return <EditPaper paperId={Number(id)} />
}

// --- Create ---

function CreatePaper() {
  const navigate = useNavigate()
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [duration, setDuration] = useState(60)
  const [totalMarks, setTotalMarks] = useState(100)
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      papersApi.create({
        title: title.trim(),
        subject_id: Number(subjectId),
        duration_minutes: duration,
        total_marks: totalMarks,
      }),
    onSuccess: (p) => navigate(`/papers/${p.id}`),
    onError: (e) => setError(getErrorMessage(e)),
  })

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/papers" className="text-sm text-slate-400 transition hover:text-slate-200">
        ← Papers
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-white">New paper</h1>
      {!subjects?.length ? (
        <p className="text-slate-400">Create a subject first, then build a paper.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim() && subjectId) create.mutate()
          }}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div>
            <label className={labelClass}>Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Algebra Mock Paper 1"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            >
              <option value="" disabled>
                Select a subject
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Total marks</label>
              <input
                type="number"
                min={0}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/papers')}
              className="rounded-lg bg-slate-700 px-4 py-2 text-slate-200 transition hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || !title.trim() || !subjectId}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {create.isPending ? 'Creating…' : 'Create paper'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// --- Edit / build ---

function EditPaper({ paperId }: { paperId: number }) {
  const qc = useQueryClient()
  const { data: paper, isLoading, isError } = useQuery({
    queryKey: ['paper', paperId],
    queryFn: () => papersApi.get(paperId),
  })
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })

  const [form, setForm] = useState({
    title: '',
    subject_id: 0,
    duration_minutes: 60,
    total_marks: 0,
    institution: '',
    exam_date: '',
    instructions: '',
  })
  const [items, setItems] = useState<PaperQuestion[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [exporting, setExporting] = useState(false)
  const initialized = useRef(false)
  const dragId = useRef<number | null>(null)

  // Initialize the details form once; keep the question list synced every refetch.
  useEffect(() => {
    if (paper && !initialized.current) {
      setForm({
        title: paper.title,
        subject_id: paper.subject_id,
        duration_minutes: paper.duration_minutes,
        total_marks: paper.total_marks,
        institution: paper.cover_page_data?.institution ?? '',
        exam_date: paper.cover_page_data?.exam_date ?? '',
        instructions: paper.cover_page_data?.instructions ?? '',
      })
      initialized.current = true
    }
  }, [paper])
  useEffect(() => {
    if (paper) setItems(paper.questions)
  }, [paper])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['paper', paperId] })

  const saveDetails = useMutation({
    mutationFn: () =>
      papersApi.update(paperId, {
        title: form.title.trim(),
        subject_id: form.subject_id,
        duration_minutes: form.duration_minutes,
        total_marks: form.total_marks,
        cover_page_data: {
          institution: form.institution || undefined,
          exam_date: form.exam_date || undefined,
          instructions: form.instructions || undefined,
        },
      }),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['papers'] })
    },
  })
  const statusMut = useMutation({
    mutationFn: (st: PaperStatus) => papersApi.updateStatus(paperId, st),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['papers'] })
    },
  })
  const reorderMut = useMutation({
    mutationFn: (ids: number[]) => papersApi.reorder(paperId, ids),
    onSuccess: invalidate,
  })
  const updateQMut = useMutation({
    mutationFn: ({
      pqId,
      body,
    }: {
      pqId: number
      body: { question_number?: number; marks?: number; part_marks?: PaperQuestion['part_marks'] }
    }) => papersApi.updateQuestion(paperId, pqId, body),
    onSuccess: invalidate,
  })
  const removeQMut = useMutation({
    mutationFn: (pqId: number) => papersApi.removeQuestion(paperId, pqId),
    onSuccess: invalidate,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError || !paper)
    return (
      <div className="text-slate-400">
        Paper not found.{' '}
        <Link to="/papers" className="text-indigo-400">
          Back to papers
        </Link>
      </div>
    )

  const marksSum = items.reduce((sum, q) => sum + q.marks, 0)
  const subjectName = subjects?.find((s) => s.id === form.subject_id)?.name ?? paper.subject_name

  function onDrop(targetId: number) {
    const from = items.findIndex((i) => i.id === dragId.current)
    const to = items.findIndex((i) => i.id === targetId)
    dragId.current = null
    if (from === -1 || to === -1 || from === to) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setItems(next)
    reorderMut.mutate(next.map((i) => i.id))
  }

  async function handleExport() {
    setExporting(true)
    try {
      // Persist the current details first so the PDF matches the live preview
      // (institution, date and instructions live in unsaved form state).
      await saveDetails.mutateAsync()
      const blob = await papersApi.exportPdf(paperId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${form.title || 'paper'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      window.alert(getErrorMessage(e, 'Export failed'))
    } finally {
      setExporting(false)
    }
  }

  const published = paper.status === 'published'

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/papers" className="text-sm text-slate-400 transition hover:text-slate-200">
            ← Papers
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold text-white">
            {form.title || 'Untitled paper'}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-600/40 text-slate-300'
              }`}
            >
              {paper.status}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => statusMut.mutate(published ? 'draft' : 'published')}
            disabled={statusMut.isPending}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-600 disabled:opacity-50"
          >
            {published ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Details + cover */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Paper details</h2>
              <button
                onClick={() => saveDetails.mutate()}
                disabled={saveDetails.isPending}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {saveDetails.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Subject</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: Number(e.target.value) })}
                  className={inputClass}
                >
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Duration (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Total marks</label>
                  <input
                    type="number"
                    min={0}
                    value={form.total_marks}
                    onChange={(e) => setForm({ ...form, total_marks: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cover page
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Institution</label>
                    <input
                      value={form.institution}
                      onChange={(e) => setForm({ ...form, institution: e.target.value })}
                      placeholder="e.g. London Educational Institute"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Exam date</label>
                    <input
                      value={form.exam_date}
                      onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                      placeholder="e.g. 2026-06-15"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Instructions</label>
                    <textarea
                      rows={3}
                      value={form.instructions}
                      onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                      placeholder="Answer ALL questions…"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">
                Questions{' '}
                <span className="text-sm font-normal text-slate-500">
                  ({items.length} · {marksSum} marks)
                </span>
              </h2>
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600"
              >
                + Add questions
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">No questions yet. Click “Add questions”.</p>
            ) : (
              <div className="space-y-2">
                {items.map((pq) => (
                  <QuestionRow
                    key={pq.id}
                    pq={pq}
                    onChange={(body) => updateQMut.mutate({ pqId: pq.id, body })}
                    onRemove={() => removeQMut.mutate(pq.id)}
                    onDragStart={() => {
                      dragId.current = pq.id
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(pq.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-2 text-sm text-slate-400">Live preview</div>
          <PaperPreview
            title={form.title}
            subjectName={subjectName}
            durationMinutes={form.duration_minutes}
            totalMarks={form.total_marks}
            cover={{
              institution: form.institution,
              exam_date: form.exam_date,
              instructions: form.instructions,
            }}
            questions={items}
          />
        </div>
      </div>

      {showAdd && (
        <AddQuestionsModal
          paperId={paperId}
          existingIds={items.map((i) => i.question_id)}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// --- Sub-components ---

function originalSummary(pq: PaperQuestion): string | null {
  if (pq.original_parts?.length) {
    const breakdown = pq.original_parts.map((p) => p.marks).join('·')
    const total = pq.original_parts.reduce((s, p) => s + p.marks, 0)
    return `orig ${total} (${breakdown})`
  }
  if (pq.original_marks != null) return `orig ${pq.original_marks}`
  return null
}

function QuestionRow({
  pq,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  pq: PaperQuestion
  onChange: (body: {
    question_number?: number
    marks?: number
    part_marks?: PaperQuestion['part_marks']
  }) => void
  onRemove: () => void
  onDragStart: () => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: () => void
}) {
  const orig = originalSummary(pq)

  // Edit one sub-part: rebuild the whole part_marks array with that part changed.
  function editPart(index: number, value: number) {
    const parts = pq.part_marks ?? []
    const next = parts.map((p, i) => (i === index ? { ...p, marks: value } : p))
    onChange({ part_marks: next })
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-2"
    >
      <span className="cursor-grab select-none px-1 text-lg text-slate-500" title="Drag to reorder">
        ⠿
      </span>
      <input
        type="number"
        min={1}
        key={`n-${pq.id}-${pq.question_number}`}
        defaultValue={pq.question_number}
        onBlur={(e) => {
          const v = Number(e.target.value)
          if (v && v !== pq.question_number) onChange({ question_number: v })
        }}
        className="w-12 rounded bg-slate-800 px-2 py-1 text-center text-sm text-slate-100"
        title="Question number"
      />
      {pq.image_url ? (
        <img
          src={pq.image_url}
          alt=""
          className="h-12 w-20 rounded border border-slate-700 bg-white object-contain"
        />
      ) : (
        <div className="h-12 w-20 rounded border border-slate-700 bg-slate-800" />
      )}
      <div className="flex-1" />
      {orig && (
        <span className="whitespace-nowrap text-xs text-slate-500" title="Original marks from the source paper">
          {orig}
        </span>
      )}
      {pq.part_marks?.length ? (
        <div className="flex items-center gap-2">
          {pq.part_marks.map((p, i) => (
            <label key={p.label} className="flex items-center gap-1 text-xs text-slate-400">
              {p.label}
              <input
                type="number"
                min={0}
                key={`p-${pq.id}-${p.label}-${p.marks}`}
                defaultValue={p.marks}
                onBlur={(e) => {
                  const v = Number(e.target.value)
                  if (v !== p.marks) editPart(i, v)
                }}
                className="w-12 rounded bg-slate-800 px-2 py-1 text-sm text-slate-100"
              />
            </label>
          ))}
          <span className="whitespace-nowrap text-xs font-medium text-slate-300" title="Question total">
            = {pq.marks}
          </span>
        </div>
      ) : (
        <label className="flex items-center gap-1 text-xs text-slate-400">
          marks
          <input
            type="number"
            min={0}
            key={`m-${pq.id}-${pq.marks}`}
            defaultValue={pq.marks}
            onBlur={(e) => {
              const v = Number(e.target.value)
              if (v !== pq.marks) onChange({ marks: v })
            }}
            className="w-16 rounded bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </label>
      )}
      <button
        onClick={onRemove}
        className="px-2 text-slate-500 transition hover:text-rose-400"
        title="Remove from paper"
      >
        ✕
      </button>
    </div>
  )
}

function AddQuestionsModal({
  paperId,
  existingIds,
  onClose,
}: {
  paperId: number
  existingIds: number[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })
  const { data: allTopics } = useQuery({ queryKey: ['topics', 'all'], queryFn: () => topicsApi.list() })
  const [fSubject, setFSubject] = useState<number | ''>('')
  const [fTopic, setFTopic] = useState<number | ''>('')
  const [fDiff, setFDiff] = useState<Difficulty | ''>('')

  const filters = {
    subject_id: fSubject || undefined,
    topic_id: fTopic || undefined,
    difficulty: fDiff || undefined,
  }
  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', filters],
    queryFn: () => questionsApi.list(filters),
  })
  const addMut = useMutation({
    mutationFn: (qid: number) => papersApi.addQuestion(paperId, { question_id: qid, marks: 0 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paper', paperId] }),
  })

  const topicsForSubject = (allTopics ?? []).filter((t) => !fSubject || t.subject_id === fSubject)
  const available = (questions ?? []).filter((q) => !existingIds.includes(q.id))
  const topicName = (tid: number) => allTopics?.find((t) => t.id === tid)?.name ?? ''

  return (
    <Modal open title="Add questions" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
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
            value={fDiff}
            onChange={(e) => setFDiff((e.target.value as Difficulty) || '')}
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

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <LoadingSpinner />
          ) : available.length === 0 ? (
            <p className="text-sm text-slate-400">
              No more questions match. Upload more in the Questions page.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {available.map((q) => (
                <div
                  key={q.id}
                  className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                >
                  <img src={q.image_url} alt="" className="h-24 w-full bg-white object-contain" />
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-xs text-slate-400">
                      {topicName(q.topic_id)} · {q.difficulty}
                    </span>
                    <button
                      onClick={() => addMut.mutate(q.id)}
                      disabled={addMut.isPending}
                      className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-slate-200 transition hover:bg-slate-600"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
