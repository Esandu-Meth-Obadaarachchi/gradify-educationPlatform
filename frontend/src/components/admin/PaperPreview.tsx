import type { CoverPageData, PaperQuestion } from '../../types'

interface PaperPreviewProps {
  title: string
  subjectName?: string | null
  durationMinutes: number
  totalMarks: number
  cover?: CoverPageData | null
  questions: PaperQuestion[]
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
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
    <div className="rounded-lg bg-white text-slate-900 shadow-inner">
      <div className="mx-auto max-w-[640px] p-8">
        {cover?.institution && (
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
            {cover.institution}
          </div>
        )}
        <h2 className="mb-6 text-center text-2xl font-bold">{title || 'Untitled paper'}</h2>

        <div className="mx-auto mb-6 max-w-sm text-sm">
          <Row label="Subject" value={subjectName || '—'} />
          <Row label="Duration" value={`${durationMinutes} minutes`} />
          <Row label="Total marks" value={String(totalMarks)} />
          {cover?.exam_date && <Row label="Date" value={cover.exam_date} />}
        </div>

        <div className="mx-auto mb-6 max-w-sm space-y-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">Candidate name</div>
            <div className="mt-4 border-b border-slate-400" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Index / ID number</div>
            <div className="mt-4 border-b border-slate-400" />
          </div>
        </div>

        {cover?.instructions && (
          <div className="mb-6 rounded-md border border-slate-200 p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Instructions
            </div>
            <p className="whitespace-pre-line text-slate-700">{cover.instructions}</p>
          </div>
        )}

        <hr className="my-6 border-slate-200" />

        {questions.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No questions added yet.</p>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id}>
                <div className="mb-2 flex items-baseline justify-between border-b border-slate-200 pb-1">
                  <span className="font-semibold">Question {q.question_number}</span>
                  <span className="text-sm text-slate-500">
                    [{q.marks} marks
                    {q.part_marks?.length
                      ? ` — ${q.part_marks.map((p) => `(${p.label}) ${p.marks}`).join(', ')}`
                      : ''}
                    ]
                  </span>
                </div>
                {q.image_url ? (
                  <img
                    src={q.image_url}
                    alt={`Question ${q.question_number}`}
                    className="w-full"
                  />
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
