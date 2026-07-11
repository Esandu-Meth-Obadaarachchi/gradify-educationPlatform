import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LeiLogo from './LeiLogo'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/subjects', label: 'Subjects', end: false },
  { to: '/topics', label: 'Topics', end: false },
  { to: '/questions', label: 'Questions', end: false },
  { to: '/papers', label: 'Papers', end: false },
]

export default function Navbar() {
  const { username, logout } = useAuth()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="px-5 py-5">
        <LeiLogo size={38} onDark />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4 text-sm">
        <div className="text-slate-500">Signed in as</div>
        <div className="mb-3 truncate font-medium text-slate-200">{username ?? 'admin'}</div>
        <button
          onClick={logout}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-300 transition hover:bg-slate-700"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
