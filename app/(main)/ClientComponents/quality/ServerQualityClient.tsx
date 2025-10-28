"use client"

import { useTranslations } from "next-intl"
import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import { GroupingSelector } from "@/app/(main)/ClientComponents/quality/GroupingSelector"
import { MonitorSelector } from "@/app/(main)/ClientComponents/quality/MonitorSelector"
import { QualityMetrics } from "@/app/(main)/ClientComponents/quality/QualityMetrics"
import { ServerQualityTable } from "@/app/(main)/ClientComponents/quality/ServerQualityTable"
import { useServerData } from "@/app/context/server-data-context"
import { Loader } from "@/components/loading/Loader"
import { Card, CardContent } from "@/components/ui/card"
import type { NezhaAPIMonitor } from "@/lib/drivers/types"
import { getClientPollingInterval } from "@/lib/polling"
import { getCountryCodeForMap, nezhaFetcher } from "@/lib/utils"

type GroupingMode = "tag" | "country" | "none"

interface ServerQualityData {
  serverId: number
  serverName: string
  tag: string
  country: string
  online: boolean
  avgDelay: number | null
  maxDelay: number | null
  minDelay: number | null
  packetLoss: number | null
  monitorCount: number
  uptime: number
  cpu: number
  mem: number
  disk: number
}

interface MonitorInfo {
  monitorId: number
  monitorName: string
  serverCount: number
}

export function ServerQualityClient() {
  const t = useTranslations("ServerQualityClient")
  const { data: serverData, error: serverError } = useServerData()
  const [grouping, setGrouping] = useState<GroupingMode>("none")
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null)

  // Get all online servers
  const onlineServers = useMemo(() => {
    if (!serverData?.result) return []
    return serverData.result.filter((server) => server.online_status)
  }, [serverData])

  // Fetch monitor data for all servers
  const serverIds = onlineServers.map((s) => s.id).join(",")
  const refreshInterval = getClientPollingInterval(30000)
  const { data: monitorDataMap, error: monitorError } = useSWR<
    Record<number, NezhaAPIMonitor[]>
  >(
    serverIds ? `/api/quality-data?server_ids=${serverIds}` : null,
    async (url: string) => {
      const params = new URLSearchParams(url.split("?")[1])
      const ids = params.get("server_ids")?.split(",").map(Number) || []
      const results: Record<number, NezhaAPIMonitor[]> = {}

      await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await nezhaFetcher(`/api/monitor?server_id=${id}`)
            results[id] = data
          } catch {
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

  // Calculate quality metrics for each server (filtered by selected monitor)
  const serverQualityData = useMemo<ServerQualityData[]>(() => {
    if (!serverData?.result || !monitorDataMap) return []

    return onlineServers.map((server) => {
      const monitorData = monitorDataMap[server.id] || []
      const tag = server.tag || "default"
      const countryCode = getCountryCodeForMap(server.host?.CountryCode || "") || "unknown"

      // Filter by selected monitor if one is selected
      const filteredMonitorData = selectedMonitor
        ? monitorData.filter((m) => m.monitor_name === selectedMonitor)
        : monitorData

      // Calculate metrics from monitor data
      let avgDelay: number | null = null
      let maxDelay: number | null = null
      let minDelay: number | null = null
      let packetLoss: number | null = null
      let monitorCount = filteredMonitorData.length

      if (filteredMonitorData.length > 0) {
        const allDelays: number[] = []
        const allPacketLoss: number[] = []

        for (const monitor of filteredMonitorData) {
          allDelays.push(...monitor.avg_delay)
          if (monitor.packet_loss) {
            allPacketLoss.push(...monitor.packet_loss)
          }
        }

        if (allDelays.length > 0) {
          avgDelay = allDelays.reduce((a, b) => a + b, 0) / allDelays.length
          maxDelay = Math.max(...allDelays)
          minDelay = Math.min(...allDelays)
        }

        if (allPacketLoss.length > 0) {
          packetLoss = allPacketLoss.reduce((a, b) => a + b, 0) / allPacketLoss.length
        }
      }

      return {
        serverId: server.id,
        serverName: server.name,
        tag,
        country: countryCode,
        online: server.online_status,
        avgDelay,
        maxDelay,
        minDelay,
        packetLoss,
        monitorCount,
        uptime: server.status.Uptime,
        cpu: server.status.CPU,
        mem: (server.status.MemUsed / server.host.MemTotal) * 100,
        disk: (server.status.DiskUsed / server.host.DiskTotal) * 100,
      }
    })
  }, [serverData, monitorDataMap, onlineServers, selectedMonitor])

  // Group data by selected grouping mode
  const groupedData = useMemo(() => {
    if (grouping === "none") {
      return { all: serverQualityData }
    }

    const groups: Record<string, ServerQualityData[]> = {}
    for (const data of serverQualityData) {
      const key = grouping === "tag" ? data.tag : data.country
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(data)
    }

    return groups
  }, [serverQualityData, grouping])

  // Get available groups
  const availableGroups = useMemo(() => {
    return Object.keys(groupedData).sort()
  }, [groupedData])

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    const filteredData =
      selectedGroup && grouping !== "none"
        ? groupedData[selectedGroup] || []
        : serverQualityData

    const totalServers = filteredData.length
    const onlineServers = filteredData.filter((s) => s.online).length
    const avgDelays = filteredData.filter((s) => s.avgDelay !== null).map((s) => s.avgDelay!)
    const packetLosses = filteredData.filter((s) => s.packetLoss !== null).map((s) => s.packetLoss!)

    return {
      totalServers,
      onlineServers,
      avgDelay: avgDelays.length > 0 ? avgDelays.reduce((a, b) => a + b, 0) / avgDelays.length : 0,
      avgPacketLoss:
        packetLosses.length > 0 ? packetLosses.reduce((a, b) => a + b, 0) / packetLosses.length : 0,
      onlineRate: totalServers > 0 ? (onlineServers / totalServers) * 100 : 0,
    }
  }, [serverQualityData, selectedGroup, grouping, groupedData])

  const handleGroupingChange = useCallback((newGrouping: GroupingMode) => {
    setGrouping(newGrouping)
    setSelectedGroup(null)
  }, [])

  if (serverError || monitorError) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            <p className="font-medium text-sm opacity-40">
              {serverError?.message || monitorError?.message}
            </p>
            <p className="font-medium text-sm opacity-40">{t("error_loading_data")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!serverData || !monitorDataMap) {
    return (
      <Card>
        <CardContent className="flex h-[400px] flex-col items-center justify-center p-8">
          <Loader visible />
          <p className="ml-2 mt-4 font-medium text-xs opacity-40">{t("loading")}</p>
        </CardContent>
      </Card>
    )
  }

  if (onlineServers.length === 0) {
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

  const displayData =
    selectedGroup && grouping !== "none" ? groupedData[selectedGroup] || [] : serverQualityData

  return (
    <div className="space-y-6">
      {/* Monitor Selector */}
      <MonitorSelector
        availableMonitors={availableMonitors}
        selectedMonitor={selectedMonitor}
        onSelectMonitor={setSelectedMonitor}
      />

      {/* Grouping Selector */}
      <GroupingSelector
        grouping={grouping}
        onGroupingChange={handleGroupingChange}
        availableGroups={availableGroups}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
      />

      {/* Overall Metrics */}
      <QualityMetrics metrics={overallMetrics} selectedMonitor={selectedMonitor} />

      {/* Server Quality Table */}
      <ServerQualityTable data={displayData} grouping={grouping} selectedMonitor={selectedMonitor} />
    </div>
  )
}
