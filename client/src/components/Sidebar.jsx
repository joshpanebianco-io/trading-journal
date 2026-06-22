import { NavLink } from 'react-router-dom'
import { BarChart2, List, Upload, Activity, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const links = [
  { to: '/', icon: BarChart2, label: 'Dashboard' },
  { to: '/trades', icon: List, label: 'Trade Log' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-primary">
          <Activity className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Tradelytics.io</span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-l-2',
                isActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="p-3 border-t border-border">
          <p className="px-3 pb-1 text-[11px] text-muted-foreground/70 truncate" title={user.email}>
            {user.email}
          </p>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  )
}
