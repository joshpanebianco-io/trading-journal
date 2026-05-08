import { createContext, useContext, useState, useEffect } from 'react'
import { getSettings, updateSetting } from '@/lib/api'

const SettingsContext = createContext({ timezone: 'AEST', setTimezone: () => {} })

export function SettingsProvider({ children }) {
  const [timezone, setTimezoneState] = useState('AEST')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSettings()
      .then(s => { if (s.timezone) setTimezoneState(s.timezone) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const setTimezone = async (tz) => {
    setTimezoneState(tz)
    await updateSetting('timezone', tz)
  }

  if (!loaded) return null

  return (
    <SettingsContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
