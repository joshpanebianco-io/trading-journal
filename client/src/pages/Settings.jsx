import { useSettings } from '@/context/SettingsContext'
import { TIMEZONE_OPTIONS } from '@/lib/timezone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export default function Settings() {
  const { timezone, setTimezone } = useSettings()

  return (
    <div className="p-6 space-y-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Timezone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            All timestamps are stored as UTC. This setting controls how times are displayed in the trade log and how timestamps in imported CSVs are interpreted.
          </p>
          <div className="space-y-1.5">
            <Label>Display timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
