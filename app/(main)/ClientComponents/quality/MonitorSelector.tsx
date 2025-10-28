"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MonitorInfo {
  monitorId: number
  monitorName: string
  serverCount: number
}

interface MonitorSelectorProps {
  availableMonitors: MonitorInfo[]
  selectedMonitor: string | null
  onSelectMonitor: (monitor: string | null) => void
}

export function MonitorSelector({
  availableMonitors,
  selectedMonitor,
  onSelectMonitor,
}: MonitorSelectorProps) {
  const t = useTranslations("MonitorSelector")

  if (availableMonitors.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedMonitor === null ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectMonitor(null)}
              className="h-9 text-xs"
            >
              {t("all_monitors")}
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                {availableMonitors.reduce((sum, m) => sum + m.serverCount, 0)}
              </span>
            </Button>
            {availableMonitors.map((monitor) => (
              <Button
                key={monitor.monitorName}
                variant={selectedMonitor === monitor.monitorName ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectMonitor(monitor.monitorName)}
                className="h-9 text-xs"
              >
                {monitor.monitorName}
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                  {monitor.serverCount}
                </span>
              </Button>
            ))}
          </div>
          {selectedMonitor && (
            <p className="text-muted-foreground text-xs">
              {t("showing_results_for")}: <span className="font-medium">{selectedMonitor}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

