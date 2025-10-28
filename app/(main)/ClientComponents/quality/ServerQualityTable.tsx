"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import ServerFlag from "@/components/ServerFlag"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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

interface ServerQualityTableProps {
  data: ServerQualityData[]
  grouping: GroupingMode
  selectedMonitor?: string | null
}

type SortField = "name" | "avgDelay" | "packetLoss" | "cpu" | "mem" | "disk" | "uptime"
type SortDirection = "asc" | "desc"

export function ServerQualityTable({ data, grouping, selectedMonitor }: ServerQualityTableProps) {
  const t = useTranslations("ServerQualityTable")
  const [sortField, setSortField] = useState<SortField>("avgDelay")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case "name":
          aValue = a.serverName.toLowerCase()
          bValue = b.serverName.toLowerCase()
          break
        case "avgDelay":
          aValue = a.avgDelay ?? Number.MAX_VALUE
          bValue = b.avgDelay ?? Number.MAX_VALUE
          break
        case "packetLoss":
          aValue = a.packetLoss ?? 0
          bValue = b.packetLoss ?? 0
          break
        case "cpu":
          aValue = a.cpu
          bValue = b.cpu
          break
        case "mem":
          aValue = a.mem
          bValue = b.mem
          break
        case "disk":
          aValue = a.disk
          bValue = b.disk
          break
        case "uptime":
          aValue = a.uptime
          bValue = b.uptime
          break
        default:
          aValue = 0
          bValue = 0
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return sorted
  }, [data, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getQualityBadge = (avgDelay: number | null, packetLoss: number | null) => {
    if (avgDelay === null) {
      return <Badge variant="secondary">{t("no_data")}</Badge>
    }

    const hasPacketLoss = packetLoss !== null && packetLoss > 1

    if (avgDelay < 50 && !hasPacketLoss) {
      return <Badge className="bg-green-500">{t("excellent")}</Badge>
    }
    if (avgDelay < 100 && !hasPacketLoss) {
      return <Badge className="bg-blue-500">{t("good")}</Badge>
    }
    if (avgDelay < 200) {
      return <Badge className="bg-yellow-500">{t("fair")}</Badge>
    }
    return <Badge className="bg-red-500">{t("poor")}</Badge>
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    if (days > 0) {
      return `${days}d ${hours}h`
    }
    return `${hours}h`
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-muted-foreground">↕</span>
    }
    return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
  }

  const saveSession = () => {
    sessionStorage.setItem("fromMainPage", "true")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("server_list")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th
                  className="cursor-pointer pb-3 pl-2 pr-4 text-left font-medium text-sm"
                  onClick={() => handleSort("name")}
                >
                  {t("server_name")}
                  <SortIcon field="name" />
                </th>
                {grouping === "none" && (
                  <>
                    <th className="hidden pb-3 px-4 text-left font-medium text-sm md:table-cell">
                      {t("tag")}
                    </th>
                    <th className="hidden pb-3 px-4 text-left font-medium text-sm md:table-cell">
                      {t("location")}
                    </th>
                  </>
                )}
                <th className="pb-3 px-4 text-left font-medium text-sm">{t("quality")}</th>
                <th
                  className="cursor-pointer pb-3 px-4 text-left font-medium text-sm"
                  onClick={() => handleSort("avgDelay")}
                >
                  {t("avg_delay")}
                  <SortIcon field="avgDelay" />
                </th>
                <th
                  className="hidden cursor-pointer pb-3 px-4 text-left font-medium text-sm sm:table-cell"
                  onClick={() => handleSort("packetLoss")}
                >
                  {t("packet_loss")}
                  <SortIcon field="packetLoss" />
                </th>
                <th
                  className="hidden cursor-pointer pb-3 px-4 text-left font-medium text-sm lg:table-cell"
                  onClick={() => handleSort("cpu")}
                >
                  CPU
                  <SortIcon field="cpu" />
                </th>
                <th
                  className="hidden cursor-pointer pb-3 px-4 text-left font-medium text-sm lg:table-cell"
                  onClick={() => handleSort("mem")}
                >
                  {t("memory")}
                  <SortIcon field="mem" />
                </th>
                <th
                  className="hidden cursor-pointer pb-3 px-4 text-left font-medium text-sm xl:table-cell"
                  onClick={() => handleSort("uptime")}
                >
                  {t("uptime")}
                  <SortIcon field="uptime" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((server) => (
                <tr
                  key={server.serverId}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="py-3 pl-2 pr-4">
                    <Link
                      href={`/server/${server.serverId}`}
                      onClick={saveSession}
                      className="font-medium text-sm hover:underline"
                    >
                      {server.serverName}
                    </Link>
                  </td>
                  {grouping === "none" && (
                    <>
                      <td className="hidden py-3 px-4 text-sm md:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {server.tag === "default" ? t("default_tag") : server.tag}
                        </Badge>
                      </td>
                      <td className="hidden py-3 px-4 text-sm md:table-cell">
                        <div className="flex items-center gap-1">
                          <ServerFlag country_code={server.country} className="text-sm" />
                        </div>
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4">
                    {getQualityBadge(server.avgDelay, server.packetLoss)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {server.avgDelay !== null ? (
                      <span
                        className={cn({
                          "text-green-600 dark:text-green-400": server.avgDelay < 50,
                          "text-blue-600 dark:text-blue-400":
                            server.avgDelay >= 50 && server.avgDelay < 100,
                          "text-yellow-600 dark:text-yellow-400":
                            server.avgDelay >= 100 && server.avgDelay < 200,
                          "text-red-600 dark:text-red-400": server.avgDelay >= 200,
                        })}
                      >
                        {server.avgDelay.toFixed(1)}ms
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="hidden py-3 px-4 text-sm sm:table-cell">
                    {server.packetLoss !== null ? (
                      <span
                        className={cn({
                          "text-green-600 dark:text-green-400": server.packetLoss === 0,
                          "text-blue-600 dark:text-blue-400":
                            server.packetLoss > 0 && server.packetLoss < 1,
                          "text-yellow-600 dark:text-yellow-400":
                            server.packetLoss >= 1 && server.packetLoss < 3,
                          "text-red-600 dark:text-red-400": server.packetLoss >= 3,
                        })}
                      >
                        {server.packetLoss.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="hidden py-3 px-4 text-sm lg:table-cell">
                    <span
                      className={cn({
                        "text-green-600 dark:text-green-400": server.cpu < 50,
                        "text-yellow-600 dark:text-yellow-400": server.cpu >= 50 && server.cpu < 80,
                        "text-red-600 dark:text-red-400": server.cpu >= 80,
                      })}
                    >
                      {server.cpu.toFixed(0)}%
                    </span>
                  </td>
                  <td className="hidden py-3 px-4 text-sm lg:table-cell">
                    <span
                      className={cn({
                        "text-green-600 dark:text-green-400": server.mem < 70,
                        "text-yellow-600 dark:text-yellow-400": server.mem >= 70 && server.mem < 90,
                        "text-red-600 dark:text-red-400": server.mem >= 90,
                      })}
                    >
                      {server.mem.toFixed(0)}%
                    </span>
                  </td>
                  <td className="hidden py-3 px-4 text-sm xl:table-cell">
                    {formatUptime(server.uptime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedData.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">{t("no_servers")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

