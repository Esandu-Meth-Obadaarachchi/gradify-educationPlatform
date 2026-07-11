import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { questionsApi, subjectsApi, topicsApi } from '../../services/api'
import LoadingSpinner from '../../components/shared/LoadingSpinner'

function StatCard({ label, value, to }: { label: string; value: number | string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-indigo-500/60"
    >
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </Link>
  )
}

export default function Dashboard() {
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })
  const topics = useQuery({ queryKey: ['topics', 'all'], queryFn: () => topicsApi.list() })
  const questions = useQuery({ queryKey: ['questions', {}], queryFn: () => questionsApi.list() })

  const loading = subjects.isLoading || topics.isLoading || questions.isLoading

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Dashboard</h1>
      <p className="mb-6 text-slate-400">London Educational Institute admin overview</p>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Subjects" value={subjects.data?.length ?? 0} to="/subjects" />
          <StatCard label="Topics" value={topics.data?.length ?? 0} to="/topics" />
          <StatCard label="Questions" value={questions.data?.length ?? 0} to="/questions" />
        </div>
      )}
    </div>
  )
}
