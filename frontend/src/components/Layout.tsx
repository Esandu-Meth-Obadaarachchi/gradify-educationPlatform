import { Outlet } from 'react-router-dom'
import Navbar from './shared/Navbar'

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
