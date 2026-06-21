import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import TradeLog from './pages/TradeLog.jsx'
import Import from './pages/Import.jsx'
import Settings from './pages/Settings.jsx'

function AuthedApp() {
  return (
    <SettingsProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<TradeLog />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </SettingsProvider>
  )
}

function Gate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return session ? <AuthedApp /> : <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
        <Toaster theme="dark" position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  )
}
