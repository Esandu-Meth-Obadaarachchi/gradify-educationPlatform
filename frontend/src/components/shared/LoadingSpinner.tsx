export default function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
      <span>{label}</span>
    </div>
  )
}
