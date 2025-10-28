"use client"

import { useTranslations } from "next-intl"
import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import { NetworkChart } from "@/app/(main)/ClientComponents/detail/NetworkChart"
import { useServerData } from "@/app/context/server-data-context"
import { Loader } from "@/components/loading/Loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { NezhaAPIMonitor } from "@/lib/drivers/types"
import { getClientPollingInterval } from "@/lib/polling"
import { cn, getCountryCodeForMap, nezhaFetcher } from "@/lib/utils"

interface ResultItem {
  created_at: number
  [key: string]: number
}

interface MonitorInfo {
  monitorId: number
  monitorName: string
  serverCount: number
}

type GroupingMode = "tag" | "country" | "none"

export function AggregatedNetworkCharts() {
  const t = useTranslations("AggregatedNetworkCharts")
  const { data: serverData } = useServerData()
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null)
  const [grouping, setGrouping] = useState<GroupingMode>("none")
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // Get all servers (including offline ones) with stable sorting
  const allServers = useMemo(() => {
    if (!serverData?.result) return []
    return serverData.result.sort((a, b) => {
      // Sort by display_index (descending), then by id (ascending) for stable ordering
      const displayIndexDiff = (b.display_index || 0) - (a.display_index || 0)
      return displayIndexDiff !== 0 ? displayIndexDiff : a.id - b.id
    })
  }, [serverData])

  // Fetch monitor data for all servers (including offline)
  const serverIds = allServers.map((s) => s.id).join(",")
  const refreshInterval = getClientPollingInterval(15000)
  const { data: monitorDataMap, isLoading: isLoadingMonitors } = useSWR<
    Record<number, NezhaAPIMonitor[]>
  >(
    serverIds ? `monitor-data-${serverIds}` : null,
    async () => {
      const ids = allServers.map((s) => s.id)
      const results: Record<number, NezhaAPIMonitor[]> = {}

      await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await nezhaFetcher(`/api/monitor?server_id=${id}`)
            results[id] = Array.isArray(data) ? data : []
          } catch (error) {
            console.error(`Failed to fetch monitor data for server ${id}:`, error)
            results[id] = []
          }
        }),
      )

      return results
    },
    { refreshInterval },
  )

  // Extract all available monitors
  const availableMonitors = useMemo<MonitorInfo[]>(() => {
    if (!monitorDataMap) return []

    const monitorsMap = new Map<string, MonitorInfo>()

    for (const [serverId, monitors] of Object.entries(monitorDataMap)) {
      for (const monitor of monitors) {
        const key = monitor.monitor_name
        if (!monitorsMap.has(key)) {
          monitorsMap.set(key, {
            monitorId: monitor.monitor_id,
            monitorName: monitor.monitor_name,
            serverCount: 0,
          })
        }
        const info = monitorsMap.get(key)!
        info.serverCount++
      }
    }

    return Array.from(monitorsMap.values()).sort((a, b) =>
      a.monitorName.localeCompare(b.monitorName),
    )
  }, [monitorDataMap])

  // Filter servers by selected monitor
  const serversWithMonitor = useMemo(() => {
    if (!selectedMonitor || !monitorDataMap) return allServers

    return allServers.filter((server) => {
      const monitors = monitorDataMap[server.id] || []
      return monitors.some((m) => m.monitor_name === selectedMonitor)
    })
  }, [selectedMonitor, monitorDataMap, allServers])

  // Group servers by tag or country
  const groupedServers = useMemo(() => {
    const servers = serversWithMonitor

    if (grouping === "none") {
      return { all: servers }
    }

    const groups: Record<string, typeof servers> = {}
    for (const server of servers) {
      const key =
        grouping === "tag"
          ? server.tag || "default"
          : getCountryCodeForMap(server.host?.CountryCode || "") || "unknown"

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(server)
    }

    return groups
  }, [serversWithMonitor, grouping])

  // Get available groups
  const availableGroups = useMemo(() => {
    return Object.keys(groupedServers).sort()
  }, [groupedServers])

  const handleGroupingChange = useCallback((newGrouping: GroupingMode) => {
    setGrouping(newGrouping)
    setSelectedGroup(null)
  }, [])

  if (!serverData?.result) {
    return (
      <Card>
        <CardContent className="flex h-[400px] flex-col items-center justify-center p-8">
          <Loader visible />
          <p className="ml-2 mt-4 font-medium text-xs opacity-40">{t("loading")}</p>
        </CardContent>
      </Card>
    )
  }

  if (allServers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            <p className="font-medium text-sm opacity-40">{t("no_online_servers")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine which servers to display
  const displayServers =
    selectedGroup && grouping !== "none" ? groupedServers[selectedGroup] || [] : serversWithMonitor

  return (
    <div className="space-y-6">
      {/* Monitor Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("monitor_selection")}</CardTitle>
          <CardDescription>{t("monitor_selection_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMonitors ? (
            <div className="flex items-center justify-center p-4">
              <Loader visible />
              <p className="ml-2 text-muted-foreground text-xs">{t("loading")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedMonitor === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonitor(null)}
                className="h-9 text-xs"
              >
                {t("all_monitors")}
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                  {allServers.length}
                </span>
              </Button>
                {availableMonitors.map((monitor) => (
                  <Button
                    key={monitor.monitorName}
                    variant={selectedMonitor === monitor.monitorName ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMonitor(monitor.monitorName)}
                    className="h-9 text-xs"
                  >
                    {monitor.monitorName}
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                      {monitor.serverCount}
                    </span>
                  </Button>
                ))}
              </div>
              {availableMonitors.length === 0 && !isLoadingMonitors && (
                <p className="text-muted-foreground text-xs">{t("no_monitoring_data")}</p>
              )}
              {selectedMonitor && (
                <p className="text-muted-foreground text-xs">
                  {t("showing_monitor")}: <span className="font-medium">{selectedMonitor}</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouping Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("grouping_options")}</CardTitle>
              <CardDescription>{t("grouping_description")}</CardDescription>
            </div>
            <div className="flex rounded-full bg-muted p-1">
              <Button
                variant={grouping === "none" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleGroupingChange("none")}
                className={cn("h-8 rounded-full px-3 text-xs", grouping === "none" && "shadow-sm")}
              >
                {t("no_grouping")}
              </Button>
              <Button
                variant={grouping === "tag" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleGroupingChange("tag")}
                className={cn("h-8 rounded-full px-3 text-xs", grouping === "tag" && "shadow-sm")}
              >
                {t("group_by_tag")}
              </Button>
              <Button
                variant={grouping === "country" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleGroupingChange("country")}
                className={cn("h-8 rounded-full px-3 text-xs", grouping === "country" && "shadow-sm")}
              >
                {t("group_by_country")}
              </Button>
            </div>
          </div>
        </CardHeader>

        {grouping !== "none" && availableGroups.length > 0 && (
        <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedGroup === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGroup(null)}
                  className="h-8 text-xs"
                >
                  {t("all_groups")}
                </Button>
                {availableGroups.map((group) => (
                  <Button
                    key={group}
                    variant={selectedGroup === group ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedGroup(group)}
                    className="h-8 text-xs"
                  >
                    {group === "default" ? t("default_tag") : group}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Aggregated Network Chart */}
      {isLoadingMonitors ? (
        <Card>
          <CardContent className="flex h-[400px] flex-col items-center justify-center p-8">
            <Loader visible />
            <p className="ml-2 mt-4 font-medium text-xs opacity-40">{t("loading")}</p>
          </CardContent>
        </Card>
      ) : displayServers.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center">
              <p className="font-medium text-sm opacity-40">{t("no_servers_to_display")}</p>
            </div>
        </CardContent>
      </Card>
      ) : (
        <AggregatedChart
          servers={displayServers}
          selectedMonitor={selectedMonitor}
          monitorDataMap={monitorDataMap}
        />
      )}
    </div>
  )
}

interface AggregatedChartProps {
  servers: any[]
  selectedMonitor: string | null
  monitorDataMap?: Record<number, NezhaAPIMonitor[]>
}

function AggregatedChart({ servers, selectedMonitor, monitorDataMap }: AggregatedChartProps) {
  const t = useTranslations("AggregatedNetworkCharts")

  // Aggregate all monitor data from all servers
  const aggregatedData = useMemo(() => {
    if (!monitorDataMap || servers.length === 0) return null

    const allMonitorData: NezhaAPIMonitor[] = []

    for (const server of servers) {
      const monitors = monitorDataMap[server.id] || []

      const filteredMonitors = selectedMonitor
        ? monitors.filter((m) => m.monitor_name === selectedMonitor)
        : monitors

      // Add server name to each monitor for identification
      for (const monitor of filteredMonitors) {
        allMonitorData.push({
          ...monitor,
          server_name: server.name, // Override with actual server name
          server_id: server.id,
        })
      }
    }

    return allMonitorData
  }, [servers, selectedMonitor, monitorDataMap])

  if (!aggregatedData || aggregatedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedMonitor || t("all_monitors")}
          </CardTitle>
          <CardDescription className="text-xs">
            {selectedMonitor ? t("no_data_for_monitor") : t("no_monitoring_data")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            <p className="font-medium text-sm opacity-40">
              {selectedMonitor
                ? `No data available for monitor: ${selectedMonitor}`
                : "No network monitoring data found"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formattedData = formatAggregatedData(aggregatedData)

  // Build chart data structure: { [serverName]: [{ created_at, avg_delay, packet_loss }] }
  const chartData: Record<string, Array<{ created_at: number; avg_delay: number; packet_loss?: number }>> = {}
  const serversWithData: typeof servers = []
  
  for (const server of servers) {
    const serverData: Array<{ created_at: number; avg_delay: number; packet_loss?: number }> = []
    const monitors = monitorDataMap?.[server.id] || []
    
    // Filter by selected monitor if specified
    const filteredMonitors = selectedMonitor
      ? monitors.filter((m) => m.monitor_name === selectedMonitor)
      : monitors

    // Skip servers without monitor data
    if (filteredMonitors.length === 0) continue

    // Collect all time points and their values
    const timeMap = new Map<number, { delays: number[]; losses: number[] }>()
    
    for (const monitor of filteredMonitors) {
      for (let i = 0; i < monitor.created_at.length; i++) {
        const time = monitor.created_at[i]
        if (!timeMap.has(time)) {
          timeMap.set(time, { delays: [], losses: [] })
        }
        const data = timeMap.get(time)!
        data.delays.push(monitor.avg_delay[i])
        if (monitor.packet_loss && monitor.packet_loss[i] !== undefined) {
          data.losses.push(monitor.packet_loss[i])
        }
      }
    }

    // Convert to array and calculate averages
    for (const [time, data] of timeMap.entries()) {
      const avgDelay = data.delays.reduce((sum, val) => sum + val, 0) / data.delays.length
      const avgLoss = data.losses.length > 0
        ? data.losses.reduce((sum, val) => sum + val, 0) / data.losses.length
        : undefined
      
      serverData.push({
        created_at: time,
        avg_delay: avgDelay,
        packet_loss: avgLoss,
      })
    }

    // Sort by time
    serverData.sort((a, b) => a.created_at - b.created_at)
    chartData[server.name] = serverData
    serversWithData.push(server)
  }

  // Build chart config dynamically based on servers with data
  const chartConfig: Record<string, { label: string; color: string }> = {}
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(220, 70%, 50%)", // Blue
    "hsl(340, 75%, 55%)", // Pink
    "hsl(160, 60%, 45%)", // Green
    "hsl(30, 80%, 55%)", // Orange
    "hsl(280, 65%, 60%)", // Purple
  ]

  serversWithData.forEach((server, index) => {
    chartConfig[server.name] = {
      label: server.name,
      color: colors[index % colors.length],
    }
  })

  if (formattedData.length === 0 || serversWithData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedMonitor || t("all_monitors")}
          </CardTitle>
          <CardDescription className="text-xs">{t("no_monitoring_data")}</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            <p className="font-medium text-sm opacity-40">
              {servers.length > 0
                ? `${servers.length} server(s) found, but no monitoring data available`
                : "No servers to display"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <NetworkChart
      chartDataKey={serversWithData.map((s) => s.name)}
      chartConfig={chartConfig}
      chartData={chartData}
      serverName={selectedMonitor || t("all_monitors")}
      formattedData={formattedData}
    />
  )
}

const formatAggregatedData = (rawData: NezhaAPIMonitor[]) => {
  const result: { [time: number]: ResultItem } = {}

  // Collect all unique timestamps
  const allTimes = new Set<number>()
  for (const item of rawData) {
    if (!item.created_at || !Array.isArray(item.created_at)) continue
    for (const time of item.created_at) {
      allTimes.add(time)
    }
  }

  const allTimeArray = Array.from(allTimes).sort((a, b) => a - b)

  // For each server, aggregate data by timestamp
  for (const item of rawData) {
    const { server_name, created_at, avg_delay } = item

    if (!server_name || !created_at || !avg_delay) continue

    for (const time of allTimeArray) {
      if (!result[time]) {
        result[time] = { created_at: time }
      }

      const timeIndex = created_at.indexOf(time)
      if (timeIndex !== -1) {
        const currentValue = (result[time] as any)[server_name] as number | undefined
        const newValue = avg_delay[timeIndex]

        // If multiple monitors for same server at same time, take average
        if (currentValue !== undefined && currentValue !== null) {
          ;(result[time] as any)[server_name] = (currentValue + newValue) / 2
        } else {
          ;(result[time] as any)[server_name] = newValue
        }
      }
    }
  }

  return Object.values(result).sort((a, b) => a.created_at - b.created_at)
}
