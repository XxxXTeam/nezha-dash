"use client"

import { useTranslations } from "next-intl"
import AnimateCountClient from "@/components/AnimatedCount"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface QualityMetricsProps {
  metrics: {
    totalServers: number
    onlineServers: number
    avgDelay: number
    avgPacketLoss: number
    onlineRate: number
  }
  selectedMonitor?: string | null
}

export function QualityMetrics({ metrics, selectedMonitor }: QualityMetricsProps) {
  const t = useTranslations("QualityMetrics")

  const getDelayQuality = (delay: number) => {
    if (delay === 0) return "unknown"
    if (delay < 50) return "excellent"
    if (delay < 100) return "good"
    if (delay < 200) return "fair"
    return "poor"
  }

  const getPacketLossQuality = (loss: number) => {
    if (loss === 0) return "excellent"
    if (loss < 1) return "good"
    if (loss < 3) return "fair"
    return "poor"
  }

  const delayQuality = getDelayQuality(metrics.avgDelay)
  const packetLossQuality = getPacketLossQuality(metrics.avgPacketLoss)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("total_servers")}</p>
            <div className="flex min-h-[28px] items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              <div className="font-semibold text-lg">
                <AnimateCountClient count={metrics.totalServers} />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("online_servers")}</p>
            <div className="flex min-h-[28px] items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <div className="font-semibold text-lg">
                <AnimateCountClient count={metrics.onlineServers} />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("online_rate")}</p>
            <div className="flex min-h-[28px] items-center gap-2">
              <span
                className={cn("relative flex h-2 w-2", {
                  "text-green-500": metrics.onlineRate >= 95,
                  "text-yellow-500": metrics.onlineRate >= 80 && metrics.onlineRate < 95,
                  "text-red-500": metrics.onlineRate < 80,
                })}
              >
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              <div className="font-semibold text-lg">{metrics.onlineRate.toFixed(1)}%</div>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("avg_delay")}</p>
            <div className="flex min-h-[28px] items-center gap-2">
              <span
                className={cn("relative flex h-2 w-2", {
                  "text-green-500": delayQuality === "excellent",
                  "text-blue-500": delayQuality === "good",
                  "text-yellow-500": delayQuality === "fair",
                  "text-red-500": delayQuality === "poor",
                  "text-gray-500": delayQuality === "unknown",
                })}
              >
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              <div className="font-semibold text-lg">
                {metrics.avgDelay > 0 ? `${metrics.avgDelay.toFixed(1)}ms` : "N/A"}
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("avg_packet_loss")}</p>
            <div className="flex min-h-[28px] items-center gap-2">
              <span
                className={cn("relative flex h-2 w-2", {
                  "text-green-500": packetLossQuality === "excellent",
                  "text-blue-500": packetLossQuality === "good",
                  "text-yellow-500": packetLossQuality === "fair",
                  "text-red-500": packetLossQuality === "poor",
                })}
              >
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              <div className="font-semibold text-lg">{metrics.avgPacketLoss.toFixed(2)}%</div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

