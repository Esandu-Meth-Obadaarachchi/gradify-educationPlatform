import type { Question, Topic } from '../../types'

const difficultyStyles: Record<string, string> = {
  easy: 'bg-emerald-500/15 text-emerald-300',
  medium: 'bg-amber-500/15 text-amber-300',
  hard: 'bg-rose-500/15 text-rose-300',
}

interface QuestionCardProps {
  question: Question
  topic?: Topic
  onDelete: (id: number) => void
  deleting?: boolean
}

export default function QuestionCard({ question, topic, onDelete, deleting }: QuestionCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
      <a href={question.image_url} target="_blank" rel="noreferrer" className="block bg-white">
        <img
          src={question.image_url}
          alt={`Question ${question.id}`}
          className="h-40 w-full object-contain"
        />
      </a>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {topic && (
            <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
              {topic.name}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              difficultyStyles[question.difficulty] ?? 'bg-slate-700 text-slate-300'
            }`}
          >
            {question.difficulty}
          </span>
          {question.original_marks != null && (
            <span
              className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300"
              title="Original marks from the source paper"
            >
              {question.parts?.length
                ? `${question.original_marks} (${question.parts.map((p) => p.marks).join('·')})`
                : `${question.original_marks} marks`}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(question.id)}
          disabled={deleting}
          className="text-xs text-slate-500 transition hover:text-rose-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
