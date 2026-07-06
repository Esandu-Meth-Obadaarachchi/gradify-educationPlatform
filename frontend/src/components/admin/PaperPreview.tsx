import type { CoverPageData, PaperQuestion } from '../../types'
import GradifyLogo from '../shared/GradifyLogo'

interface PaperPreviewProps {
  title: string
  subjectName?: string | null
  durationMinutes: number
  totalMarks: number
  cover?: CoverPageData | null
  questions: PaperQuestion[]
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function PaperPreview({
  title,
  subjectName,
  durationMinutes,
  totalMarks,
  cover,
  questions,
}: PaperPreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white text-slate-900 shadow-inner">
      {/* Cover — roughly A4 proportion so it reads like the exported front page */}
      <div className="relative flex min-h-[840px] flex-col">
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="mx-auto flex max-w-[640px] flex-1 flex-col justify-center px-8 py-10 text-center">
          <div className="mb-6 flex justify-center">
            <GradifyLogo size={44} />
          </div>

          {cover?.institution && (
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
              {cover.institution}
            </div>
          )}

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {title || 'Untitled paper'}
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />

          <div className="mx-auto mt-7 grid max-w-md grid-cols-3 gap-3">
            <MetaCard label="Subject" value={subjectName || '—'} />
            <MetaCard label="Duration" value={`${durationMinutes} min`} />
            <MetaCard label="Total marks" value={String(totalMarks)} />
          </div>
          {cover?.exam_date && (
            <div className="mt-3 text-sm text-slate-500">
              Date <span className="font-semibold text-slate-700">{cover.exam_date}</span>
            </div>
          )}

          <div className="mx-auto mt-7 grid max-w-md grid-cols-1 gap-5 text-left sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Candidate name</div>
              <div className="mt-5 border-b border-slate-300" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Index / ID number</div>
              <div className="mt-5 border-b border-slate-300" />
            </div>
          </div>

          {cover?.instructions && (
            <div className="mx-auto mt-7 max-w-md rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-left">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Instructions
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {cover.instructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="mx-auto max-w-[640px] px-8 pb-10">
        <hr className="mb-6 border-slate-200" />
        {questions.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No questions added yet.</p>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-3 py-1 text-sm font-semibold text-white">
                    Q{q.question_number}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                    {q.part_marks?.length
                      ? ` · ${q.part_marks.map((p) => `(${p.label}) ${p.marks}`).join('  ')}`
                      : ''}
                  </span>
                </div>
                {q.image_url ? (
                  <img src={q.image_url} alt={`Question ${q.question_number}`} className="w-full" />
                ) : (
                  <div className="text-sm italic text-rose-500">[image unavailable]</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
